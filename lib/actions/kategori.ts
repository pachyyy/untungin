"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/supplier";

function revalidateAll() {
  revalidatePath("/uang");
  revalidatePath("/uang/kategori");
  revalidatePath("/settings");
}

export async function createKategori(formData: FormData): Promise<ActionResult> {
  const nama = String(formData.get("nama") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "") === "keluar" ? "keluar" : "masuk";
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (!nama) return { ok: false, error: "Nama kategori wajib diisi." };

  const count = await prisma.kategori.count({ where: { jenis } });
  await prisma.kategori.create({ data: { nama, jenis, parentId, urutan: count } });
  revalidateAll();
  return { ok: true };
}

export async function updateKategori(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (!id) return { ok: false, error: "Kategori tidak ditemukan." };
  if (!nama) return { ok: false, error: "Nama kategori wajib diisi." };
  if (parentId === id) return { ok: false, error: "Kategori tidak bisa jadi induknya sendiri." };

  await prisma.kategori.update({ where: { id }, data: { nama, parentId } });
  revalidateAll();
  return { ok: true };
}

export async function toggleKategoriAktif(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const aktif = String(formData.get("aktif") ?? "") === "true";
  if (!id) return { ok: false, error: "Kategori tidak ditemukan." };
  await prisma.kategori.update({ where: { id }, data: { aktif } });
  revalidateAll();
  return { ok: true };
}

export async function deleteKategori(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Kategori tidak ditemukan." };

  const [txCount, anakCount] = await Promise.all([
    prisma.transaksi.count({ where: { kategoriId: id } }),
    prisma.kategori.count({ where: { parentId: id } }),
  ]);
  if (txCount > 0)
    return {
      ok: false,
      error: `Tidak bisa dihapus: dipakai di ${txCount} transaksi.`,
    };
  if (anakCount > 0)
    return {
      ok: false,
      error: `Tidak bisa dihapus: masih punya ${anakCount} sub-kategori.`,
    };

  await prisma.kategori.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}
