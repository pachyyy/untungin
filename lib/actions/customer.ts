"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/supplier";

/**
 * Find a customer by nama (case-insensitive) or create one. Never overwrites
 * an existing customer's noHp — the customer record is the source of truth,
 * the order keeps its own noHp snapshot regardless.
 */
export async function resolveCustomerId(
  tx: Prisma.TransactionClient,
  nama: string,
  noHp: string | null
): Promise<string> {
  const existing = await tx.customer.findFirst({
    where: { nama: { equals: nama, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await tx.customer.create({
    data: { nama, noHp: noHp || null },
    select: { id: true },
  });
  return created.id;
}

export async function createCustomer(formData: FormData): Promise<ActionResult> {
  const nama = String(formData.get("nama") ?? "").trim();
  const noHp = String(formData.get("noHp") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!nama) return { ok: false, error: "Nama pelanggan wajib diisi." };

  try {
    await prisma.customer.create({
      data: { nama, noHp: noHp || null, catatan: catatan || null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Pelanggan dengan nama ini sudah ada." };
    }
    throw e;
  }
  revalidatePath("/pelanggan");
  revalidatePath("/pesanan");
  return { ok: true };
}

export async function updateCustomer(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const noHp = String(formData.get("noHp") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  if (!id) return { ok: false, error: "Pelanggan tidak ditemukan." };
  if (!nama) return { ok: false, error: "Nama pelanggan wajib diisi." };

  try {
    await prisma.customer.update({
      where: { id },
      data: { nama, noHp: noHp || null, catatan: catatan || null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Pelanggan dengan nama ini sudah ada." };
    }
    throw e;
  }
  revalidatePath("/pelanggan");
  revalidatePath("/pesanan");
  return { ok: true };
}

export async function deleteCustomer(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Pelanggan tidak ditemukan." };

  const count = await prisma.pesanan.count({ where: { customerId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: pelanggan masih punya ${count} pesanan.`,
    };
  }
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/pelanggan");
  return { ok: true };
}
