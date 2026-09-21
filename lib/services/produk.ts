import { prisma } from "@/lib/prisma";
import { parseIntField } from "@/lib/parse";
import { ok, fail, type ServiceResult, type Actor, WEB_ACTOR } from "@/lib/services/types";

export type ProdukFormInput = {
  nama: string;
  hargaModal: unknown;
  stok: unknown;
  /** Existing supplier id, or the literal "__new__" sentinel to create one
   * inline (see resolveSupplierId). */
  supplierId: string;
  /** Only read when supplierId === "__new__". */
  supplierNama?: string;
  supplierKontak?: string;
};

async function resolveSupplierId(
  input: Pick<ProdukFormInput, "supplierId" | "supplierNama" | "supplierKontak">
): Promise<string | { error: string }> {
  const supplierId = input.supplierId.trim();
  // Inline "add new supplier" from the product form.
  if (supplierId === "__new__") {
    const nama = (input.supplierNama ?? "").trim();
    const kontak = (input.supplierKontak ?? "").trim();
    if (!nama) return { error: "Nama supplier baru wajib diisi." };
    const created = await prisma.supplier.create({
      data: { nama, kontak: kontak || null },
    });
    return created.id;
  }
  if (!supplierId) return { error: "Supplier wajib dipilih." };
  return supplierId;
}

export async function createProduk(
  input: ProdukFormInput,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const nama = input.nama.trim();
  const hargaModal = parseIntField(input.hargaModal);
  const stok = parseIntField(input.stok, { min: 0 }) ?? 0;

  if (!nama) return fail("Nama produk wajib diisi.");
  if (hargaModal === null) return fail("Harga modal harus angka lebih dari 0.");

  const supplier = await resolveSupplierId(input);
  if (typeof supplier !== "string") return fail(supplier.error);

  const created = await prisma.produk.create({
    data: { nama, hargaModal, stok, supplierId: supplier },
  });
  return ok({ id: created.id });
}

export type UpdateProdukInput = ProdukFormInput & { id: string };

export async function updateProduk(
  input: UpdateProdukInput,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  const id = input.id;
  const nama = input.nama.trim();
  const hargaModal = parseIntField(input.hargaModal);
  const stok = parseIntField(input.stok, { min: 0 }) ?? 0;

  if (!id) return fail("Produk tidak ditemukan.", 404);
  if (!nama) return fail("Nama produk wajib diisi.");
  if (hargaModal === null) return fail("Harga modal harus angka lebih dari 0.");

  const supplier = await resolveSupplierId(input);
  if (typeof supplier !== "string") return fail(supplier.error);

  await prisma.produk.update({
    where: { id },
    data: { nama, hargaModal, stok, supplierId: supplier },
  });
  return ok({ id });
}

export async function deleteProduk(
  id: string,
  _actor: Actor = WEB_ACTOR
): Promise<ServiceResult<{ id: string }>> {
  if (!id) return fail("Produk tidak ditemukan.", 404);

  const [usedItem, usedPaket] = await Promise.all([
    prisma.pesananItem.count({ where: { produkId: id } }),
    prisma.pesananPaketItem.count({ where: { produkId: id } }),
  ]);
  const used = usedItem + usedPaket;
  if (used > 0) {
    return fail(`Tidak bisa dihapus: produk dipakai di ${used} item pesanan.`, 409);
  }
  await prisma.produk.delete({ where: { id } });
  return ok({ id });
}
