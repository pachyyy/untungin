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
    select: { stok: true, hargaModal: true },
  });
  if (!produk) return fail("Produk tidak ditemukan.", 404);

  const stokBaru = produk.stok + qty;
  const hargaModalBaru = Math.round(
    (produk.stok * produk.hargaModal + qty * hargaBeli) / stokBaru
  );

  const [, restock] = await prisma.$transaction([
    prisma.produk.update({
      where: { id: produkId },
      data: { stok: stokBaru, hargaModal: hargaModalBaru },
    }),
    prisma.restock.create({
      data: { produkId, qty, hargaBeli, tanggal },
    }),
  ]);

  return ok({ id: restock.id });
}
