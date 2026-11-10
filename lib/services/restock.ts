import { prisma } from "@/lib/prisma";
import { parseIntField } from "@/lib/parse";
import { parseDateOnlyJakarta } from "@/lib/date";
import { kasRestock, pembagianBeli, type SumberDana } from "@/lib/services/kas";
import { ok, fail, type ServiceResult, type Actor, WEB_ACTOR } from "@/lib/services/types";

export type RestockInput = {
  produkId: string;
  qty: unknown;
  hargaBeli: unknown;
  tanggal: string;
  /** How the purchase was paid (Rekening/Tunai split). Optional: clients that
   * predate pockets omit it and the purchase just carries no pocket. */
  sumber?: SumberDana;
};

/**
 * Records a stock-in event and rolls it into Produk.hargaModal as a weighted
 * average: (stokLama * hargaModalLama + qty * hargaBeli) / (stokLama + qty).
 * The Restock row is kept purely as an audit trail — hargaModal is always the
 * derived, current number; nothing re-reads Restock rows to compute it.
 */
export async function restockProduk(
  input: RestockInput,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const produkId = input.produkId;
  const qty = parseIntField(input.qty);
  const hargaBeli = parseIntField(input.hargaBeli);
  const tanggalStr = input.tanggal;

  if (!produkId) return fail("Produk tidak ditemukan.", 404);
  if (qty === null) return fail("Jumlah masuk harus lebih dari 0.");
  if (hargaBeli === null) return fail("Harga beli harus lebih dari 0.");

  const tanggal = tanggalStr ? parseDateOnlyJakarta(tanggalStr, "start") : new Date();
  if (Number.isNaN(tanggal.getTime())) return fail("Tanggal tidak valid.");

  const produk = await prisma.produk.findUnique({
    where: { id: produkId },
    select: { id: true, nama: true },
  });
  if (!produk) return fail("Produk tidak ditemukan.", 404);

  // Validated before the transaction so a bad split changes nothing.
  const pembagian = pembagianBeli(qty * hargaBeli, input.sumber);
  if (!pembagian.ok) return fail(pembagian.error);

  // One atomic UPDATE: Postgres evaluates every SET expression against the
  // row's values *before* this statement, so the weighted average and the
  // increment both see the same, current stok. Reading stok first and
  // writing an absolute value back would drop any order placed in between
  // (its decrement overwritten by the stale stok + qty).
  const restock = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "Produk"
      SET "hargaModal" = ROUND(("stok"::numeric * "hargaModal" + ${qty}::numeric * ${hargaBeli}) / ("stok" + ${qty})),
          "stok" = "stok" + ${qty},
          "updatedAt" = now()
      WHERE "id" = ${produkId}`;
    await kasRestock(tx, {
      nama: produk.nama,
      qty,
      hargaBeli,
      tanggal,
      pembagian: pembagian.data,
    });
    return tx.restock.create({
      data: { produkId, qty, hargaBeli, tanggal },
    });
  });

  return ok({ id: restock.id });
}
