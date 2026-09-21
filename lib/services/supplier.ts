import { prisma } from "@/lib/prisma";
import { ok, fail, type ServiceResult, type Actor, WEB_ACTOR } from "@/lib/services/types";

export type SupplierListItem = { id: string; nama: string; kontak: string | null; jumlahProduk: number };

/** Full supplier list for the mobile API (GET /supplier), each with its
 * produk count — same shape as the web's getSupplierListView. */
export async function listSuppliers(): Promise<ServiceResult<SupplierListItem[]>> {
  const rows = await prisma.supplier.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { produk: true } } },
  });
  return ok(
    rows.map((s) => ({ id: s.id, nama: s.nama, kontak: s.kontak, jumlahProduk: s._count.produk }))
  );
}

export type SupplierFormInput = { nama: string; kontak: string };

export async function createSupplier(
  input: SupplierFormInput,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const nama = input.nama.trim();
  const kontak = input.kontak.trim();
  if (!nama) return fail("Nama supplier wajib diisi.");

  const created = await prisma.supplier.create({
    data: { nama, kontak: kontak || null },
  });
  return ok({ id: created.id });
}

export async function updateSupplier(
  input: SupplierFormInput & { id: string },
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const id = input.id;
  const nama = input.nama.trim();
  const kontak = input.kontak.trim();
  if (!id) return fail("Supplier tidak ditemukan.", 404);
  if (!nama) return fail("Nama supplier wajib diisi.");

  await prisma.supplier.update({
    where: { id },
    data: { nama, kontak: kontak || null },
  });
  return ok({ id });
}

export async function deleteSupplier(
  id: string,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  if (!id) return fail("Supplier tidak ditemukan.", 404);

  const count = await prisma.produk.count({ where: { supplierId: id } });
  if (count > 0) {
    return fail(`Tidak bisa dihapus: masih ada ${count} produk dari supplier ini.`, 409);
  }
  await prisma.supplier.delete({ where: { id } });
  return ok({ id });
}
