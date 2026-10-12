import { prisma } from "@/lib/prisma";
import { parseIntField } from "@/lib/parse";
import { parseDateOnlyJakarta } from "@/lib/date";
import { ok, fail, type ServiceResult, type Actor, WEB_ACTOR } from "@/lib/services/types";

export type RestockInput = {
  produkId: string;
  qty: unknown;
  hargaBeli: unknown;
  tanggal: string;
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
    select: { id: true },
  });
  if (!produk) return fail("Produk tidak ditemukan.", 404);

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
    return tx.restock.create({
      data: { produkId, qty, hargaBeli, tanggal },
    });
  });

  return ok({ id: restock.id });
}
