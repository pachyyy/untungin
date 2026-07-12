"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: boolean; error?: string };

export async function createSupplier(formData: FormData): Promise<ActionResult> {
  const nama = String(formData.get("nama") ?? "").trim();
  const kontak = String(formData.get("kontak") ?? "").trim();
  if (!nama) return { ok: false, error: "Nama supplier wajib diisi." };

  await prisma.supplier.create({
    data: { nama, kontak: kontak || null },
  });
  revalidatePath("/supplier");
  revalidatePath("/produk");
  return { ok: true };
}

export async function updateSupplier(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const kontak = String(formData.get("kontak") ?? "").trim();
  if (!id) return { ok: false, error: "Supplier tidak ditemukan." };
  if (!nama) return { ok: false, error: "Nama supplier wajib diisi." };

  await prisma.supplier.update({
    where: { id },
    data: { nama, kontak: kontak || null },
  });
  revalidatePath("/supplier");
  revalidatePath("/produk");
  return { ok: true };
}

export async function deleteSupplier(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Supplier tidak ditemukan." };

  const count = await prisma.produk.count({ where: { supplierId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: masih ada ${count} produk dari supplier ini.`,
    };
  }
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/supplier");
  return { ok: true };
}
