import { Prisma, type Customer } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, type ServiceResult, type Actor, WEB_ACTOR } from "@/lib/services/types";

/** Full customer list for the mobile API (GET /pelanggan). */
export async function listCustomers(): Promise<ServiceResult<Customer[]>> {
  const rows = await prisma.customer.findMany({ orderBy: { nama: "asc" } });
  return ok(rows);
}

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

export type CreateCustomerInput = {
  nama: string;
  noHp: string;
  catatan: string;
};

export async function createCustomer(
  input: CreateCustomerInput,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const nama = input.nama.trim();
  const noHp = input.noHp.trim();
  const catatan = input.catatan.trim();
  if (!nama) return fail("Nama pelanggan wajib diisi.");

  try {
    const created = await prisma.customer.create({
      data: { nama, noHp: noHp || null, catatan: catatan || null },
    });
    return ok({ id: created.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("Pelanggan dengan nama ini sudah ada.", 409);
    }
    throw e;
  }
}

export type UpdateCustomerInput = {
  id: string;
  nama: string;
  noHp: string;
  catatan: string;
};

export async function updateCustomer(
  input: UpdateCustomerInput,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const id = input.id;
  const nama = input.nama.trim();
  const noHp = input.noHp.trim();
  const catatan = input.catatan.trim();
  if (!id) return fail("Pelanggan tidak ditemukan.", 404);
  if (!nama) return fail("Nama pelanggan wajib diisi.");

  try {
    await prisma.customer.update({
      where: { id },
      data: { nama, noHp: noHp || null, catatan: catatan || null },
    });
    return ok({ id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("Pelanggan dengan nama ini sudah ada.", 409);
    }
    throw e;
  }
}

export async function deleteCustomer(
  id: string,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  if (!id) return fail("Pelanggan tidak ditemukan.", 404);

  const count = await prisma.pesanan.count({ where: { customerId: id } });
  if (count > 0) {
    return fail(`Tidak bisa dihapus: pelanggan masih punya ${count} pesanan.`, 409);
  }
  await prisma.customer.delete({ where: { id } });
  return ok({ id });
}
