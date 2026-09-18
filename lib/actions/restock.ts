"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/supplier";
import { parseIntField } from "@/lib/parse";

function revalidateAll() {
  revalidatePath("/produk");
  revalidatePath("/dashboard");
}

/**
 * Records a stock-in event and rolls it into Produk.hargaModal as a weighted
 * average: (stokLama * hargaModalLama + qty * hargaBeli) / (stokLama + qty).
 * The Restock row is kept purely as an audit trail — hargaModal is always the
 * derived, current number; nothing re-reads Restock rows to compute it.
 */
export async function restockProduk(formData: FormData): Promise<ActionResult> {
  const produkId = String(formData.get("produkId") ?? "");
  const qty = parseIntField(formData.get("qty"));
  const hargaBeli = parseIntField(formData.get("hargaBeli"));
  const tanggalStr = String(formData.get("tanggal") ?? "");

  if (!produkId) return { ok: false, error: "Produk tidak ditemukan." };
  if (qty === null) return { ok: false, error: "Jumlah masuk harus lebih dari 0." };
  if (hargaBeli === null) return { ok: false, error: "Harga beli harus lebih dari 0." };

  const tanggal = tanggalStr ? new Date(tanggalStr) : new Date();
  if (Number.isNaN(tanggal.getTime())) return { ok: false, error: "Tanggal tidak valid." };

  const produk = await prisma.produk.findUnique({
    where: { id: produkId },
    select: { stok: true, hargaModal: true },
  });
  if (!produk) return { ok: false, error: "Produk tidak ditemukan." };

  const stokBaru = produk.stok + qty;
  const hargaModalBaru = Math.round(
    (produk.stok * produk.hargaModal + qty * hargaBeli) / stokBaru
  );

  await prisma.$transaction([
    prisma.produk.update({
      where: { id: produkId },
      data: { stok: stokBaru, hargaModal: hargaModalBaru },
    }),
    prisma.restock.create({
      data: { produkId, qty, hargaBeli, tanggal },
    }),
  ]);

  revalidateAll();
  return { ok: true };
}
