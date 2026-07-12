"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/supplier";

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

async function resolveSupplierId(formData: FormData): Promise<string | { error: string }> {
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  // Inline "add new supplier" from the product form.
  if (supplierId === "__new__") {
    const nama = String(formData.get("supplierNama") ?? "").trim();
    const kontak = String(formData.get("supplierKontak") ?? "").trim();
    if (!nama) return { error: "Nama supplier baru wajib diisi." };
    const created = await prisma.supplier.create({
      data: { nama, kontak: kontak || null },
    });
    return created.id;
  }
  if (!supplierId) return { error: "Supplier wajib dipilih." };
  return supplierId;
}

export async function createProduk(formData: FormData): Promise<ActionResult> {
  const nama = String(formData.get("nama") ?? "").trim();
  const hargaModal = parsePositiveInt(formData.get("hargaModal"));
  const stok = parsePositiveInt(formData.get("stok")) ?? 0;

  if (!nama) return { ok: false, error: "Nama produk wajib diisi." };
  if (hargaModal === null || hargaModal <= 0)
    return { ok: false, error: "Harga modal harus angka lebih dari 0." };

  const supplier = await resolveSupplierId(formData);
  if (typeof supplier !== "string") return { ok: false, error: supplier.error };

  await prisma.produk.create({
    data: { nama, hargaModal, stok, supplierId: supplier },
  });
  revalidatePath("/produk");
  revalidatePath("/dashboard");
  revalidatePath("/supplier");
  return { ok: true };
}

export async function updateProduk(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const hargaModal = parsePositiveInt(formData.get("hargaModal"));
  const stok = parsePositiveInt(formData.get("stok")) ?? 0;

  if (!id) return { ok: false, error: "Produk tidak ditemukan." };
  if (!nama) return { ok: false, error: "Nama produk wajib diisi." };
  if (hargaModal === null || hargaModal <= 0)
    return { ok: false, error: "Harga modal harus angka lebih dari 0." };

  const supplier = await resolveSupplierId(formData);
  if (typeof supplier !== "string") return { ok: false, error: supplier.error };

  await prisma.produk.update({
    where: { id },
    data: { nama, hargaModal, stok, supplierId: supplier },
  });
  revalidatePath("/produk");
  revalidatePath("/dashboard");
  revalidatePath("/supplier");
  return { ok: true };
}

export async function deleteProduk(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Produk tidak ditemukan." };

  const used = await prisma.pesananItem.count({ where: { produkId: id } });
  if (used > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: produk dipakai di ${used} item pesanan.`,
    };
  }
  await prisma.produk.delete({ where: { id } });
  revalidatePath("/produk");
  revalidatePath("/dashboard");
  return { ok: true };
}
