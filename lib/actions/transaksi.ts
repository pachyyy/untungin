"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/supplier";

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const JENIS = ["masuk", "keluar", "transfer"] as const;

function revalidateAll() {
  revalidatePath("/uang");
  revalidatePath("/uang/akun");
  revalidatePath("/uang/kategori");
}

export async function createTransaksi(formData: FormData): Promise<ActionResult> {
  const jenis = String(formData.get("jenis") ?? "");
  const tanggalStr = String(formData.get("tanggal") ?? "");
  const jumlah = parsePositiveInt(formData.get("jumlah"));
  const akunId = String(formData.get("akunId") ?? "").trim();
  const akunTujuanId = String(formData.get("akunTujuanId") ?? "").trim();
  const kategoriId = String(formData.get("kategoriId") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!JENIS.includes(jenis as (typeof JENIS)[number]))
    return { ok: false, error: "Jenis transaksi tidak valid." };
  if (jumlah === null) return { ok: false, error: "Jumlah harus lebih dari 0." };
  if (!akunId) return { ok: false, error: "Akun wajib dipilih." };

  const tanggal = tanggalStr ? new Date(tanggalStr) : new Date();
  if (Number.isNaN(tanggal.getTime())) return { ok: false, error: "Tanggal tidak valid." };

  if (jenis === "transfer") {
    if (!akunTujuanId) return { ok: false, error: "Akun tujuan wajib dipilih." };
    if (akunTujuanId === akunId)
      return { ok: false, error: "Akun tujuan tidak boleh sama dengan akun asal." };
  } else if (!kategoriId) {
    return { ok: false, error: "Kategori wajib dipilih." };
  }

  await prisma.transaksi.create({
    data: {
      jenis,
      tanggal,
      jumlah,
      akunId,
      akunTujuanId: jenis === "transfer" ? akunTujuanId : null,
      kategoriId: jenis === "transfer" ? null : kategoriId,
      catatan: catatan || null,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function updateTransaksi(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Transaksi tidak ditemukan." };

  const existing = await prisma.transaksi.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan." };
  if (existing.pembayaranId || existing.pesananKeuntunganId) {
    return {
      ok: false,
      error: "Transaksi ini berasal dari Pesanan — ubah lewat halaman Pesanan.",
    };
  }

  const jenis = String(formData.get("jenis") ?? "");
  const tanggalStr = String(formData.get("tanggal") ?? "");
  const jumlah = parsePositiveInt(formData.get("jumlah"));
  const akunId = String(formData.get("akunId") ?? "").trim();
  const akunTujuanId = String(formData.get("akunTujuanId") ?? "").trim();
  const kategoriId = String(formData.get("kategoriId") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!JENIS.includes(jenis as (typeof JENIS)[number]))
    return { ok: false, error: "Jenis transaksi tidak valid." };
  if (jumlah === null) return { ok: false, error: "Jumlah harus lebih dari 0." };
  if (!akunId) return { ok: false, error: "Akun wajib dipilih." };

  const tanggal = tanggalStr ? new Date(tanggalStr) : new Date();
  if (Number.isNaN(tanggal.getTime())) return { ok: false, error: "Tanggal tidak valid." };

  if (jenis === "transfer") {
    if (!akunTujuanId) return { ok: false, error: "Akun tujuan wajib dipilih." };
    if (akunTujuanId === akunId)
      return { ok: false, error: "Akun tujuan tidak boleh sama dengan akun asal." };
  } else if (!kategoriId) {
    return { ok: false, error: "Kategori wajib dipilih." };
  }

  await prisma.transaksi.update({
    where: { id },
    data: {
      jenis,
      tanggal,
      jumlah,
      akunId,
      akunTujuanId: jenis === "transfer" ? akunTujuanId : null,
      kategoriId: jenis === "transfer" ? null : kategoriId,
      catatan: catatan || null,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteTransaksi(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Transaksi tidak ditemukan." };

  const existing = await prisma.transaksi.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan." };
  if (existing.pembayaranId || existing.pesananKeuntunganId) {
    return {
      ok: false,
      error: "Transaksi ini berasal dari Pesanan — hapus lewat halaman Pesanan.",
    };
  }

  await prisma.transaksi.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}
