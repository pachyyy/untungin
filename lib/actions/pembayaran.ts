"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { totalPesanan } from "@/lib/calc";
import type { ActionResult } from "@/lib/actions/supplier";

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/**
 * Derives status from payments-so-far and updates it if changed.
 * When `allowDowngrade` is false, an order already at "lunas" (naturally or
 * forced via tandaiLunas) is left alone — an extra payment on a Lunas order
 * is overpayment/extra profit, not a status change. Removing a payment must
 * always be allowed to downgrade, so hapusPembayaran passes true.
 */
async function recomputeStatus(
  tx: Prisma.TransactionClient,
  pesananId: string,
  allowDowngrade: boolean
): Promise<void> {
  const pesanan = await tx.pesanan.findUnique({
    where: { id: pesananId },
    include: {
      items: true,
      pakets: { include: { komponen: true } },
      pembayaran: true,
    },
  });
  if (!pesanan) return;
  if (!allowDowngrade && pesanan.status === "lunas") return;

  const total = totalPesanan(pesanan);
  const dibayar = pesanan.pembayaran.reduce((s, p) => s + p.jumlah, 0);
  const status = dibayar <= 0 ? "belum_bayar" : dibayar >= total ? "lunas" : "nyicil";
  if (status !== pesanan.status) {
    await tx.pesanan.update({ where: { id: pesananId }, data: { status } });
  }
}

function revalidateAll() {
  revalidatePath("/pesanan");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  revalidatePath("/pelanggan");
}

export async function tambahPembayaran(formData: FormData): Promise<ActionResult> {
  const pesananId = String(formData.get("pesananId") ?? "");
  const tanggalStr = String(formData.get("tanggal") ?? "");
  const metode = String(formData.get("metode") ?? "").trim().slice(0, 40) || null;
  const jumlah = parsePositiveInt(formData.get("jumlah"));
  const jenis = String(formData.get("jenis") ?? "cicilan") === "bayar" ? "bayar" : "cicilan";

  if (!pesananId) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (jumlah === null) return { ok: false, error: "Jumlah pembayaran harus lebih dari 0." };

  const tanggal = tanggalStr ? new Date(tanggalStr) : new Date();
  if (Number.isNaN(tanggal.getTime()))
    return { ok: false, error: "Tanggal tidak valid." };

  await prisma.$transaction(async (tx) => {
    await tx.pembayaran.create({
      data: { pesananId, tanggal, metode, jumlah, jenis },
    });
    await recomputeStatus(tx, pesananId, false);
  });

  revalidateAll();
  return { ok: true };
}

export async function hapusPembayaran(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Pembayaran tidak ditemukan." };

  const bayar = await prisma.pembayaran.findUnique({ where: { id } });
  if (!bayar) return { ok: false, error: "Pembayaran tidak ditemukan." };

  await prisma.$transaction(async (tx) => {
    await tx.pembayaran.delete({ where: { id } });
    await recomputeStatus(tx, bayar.pesananId, true);
  });

  revalidateAll();
  return { ok: true };
}

/**
 * Forces an order to Lunas even while underpaid (discount, rounding,
 * write-off). Requires at least one payment; the resulting profit can be
 * negative — the UI is expected to warn before calling this.
 */
export async function tandaiLunas(formData: FormData): Promise<ActionResult> {
  const pesananId = String(formData.get("pesananId") ?? "");
  if (!pesananId) return { ok: false, error: "Pesanan tidak ditemukan." };

  const pesanan = await prisma.pesanan.findUnique({
    where: { id: pesananId },
    include: { pembayaran: true },
  });
  if (!pesanan) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (pesanan.pembayaran.length === 0)
    return { ok: false, error: "Tambahkan minimal satu pembayaran dulu." };

  await prisma.pesanan.update({ where: { id: pesananId }, data: { status: "lunas" } });

  revalidateAll();
  return { ok: true };
}
