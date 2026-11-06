import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIntField } from "@/lib/parse";
import { kasProdukBaru, kasStokNaik } from "@/lib/services/kas";
import { ok, fail, type ServiceResult, type Actor, WEB_ACTOR } from "@/lib/services/types";

const produkListInclude = {
  supplier: { select: { nama: true } },
} satisfies Prisma.ProdukInclude;

export type ProdukListItem = Prisma.ProdukGetPayload<{ include: typeof produkListInclude }>;

/** Full product list for the mobile API (GET /produk). Staff and owner get
 * the same rows; serializeProduk (lib/api/serialize.ts) is what strips
 * hargaModal for staff. */
export async function listProduk(): Promise<ServiceResult<ProdukListItem[]>> {
  const rows = await prisma.produk.findMany({
    orderBy: { nama: "asc" },
    include: produkListInclude,
  });
  return ok(rows);
}

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

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.produk.create({
      data: { nama, hargaModal, stok, supplierId: supplier },
    });
    await kasProdukBaru(tx, { nama, stok, hargaModal });
    return row;
  });
  return ok({ id: created.id });
}

export type UpdateProdukInput = ProdukFormInput & {
  id: string;
  /** The stok value the edit form was opened with. When given, only the
   * user's change (stok - stokAwal) is applied, so orders placed while the
   * form was open aren't overwritten by its stale number. Absent (older
   * APKs) = the submitted stok is written as-is. */
  stokAwal?: unknown;
};

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

  const stokAwal =
    input.stokAwal === undefined || input.stokAwal === null || input.stokAwal === ""
      ? null
      : parseIntField(input.stokAwal, { min: 0 });

  if (stokAwal === null) {
    await prisma.$transaction(async (tx) => {
      const before = await tx.produk.findUnique({ where: { id }, select: { stok: true } });
      await tx.produk.update({
        where: { id },
        data: { nama, hargaModal, stok, supplierId: supplier },
      });
      if (before) await kasStokNaik(tx, { nama, tambah: stok - before.stok, hargaModal });
    });
    return ok({ id });
  }

  const delta = stok - stokAwal;
  const res = await prisma.$transaction(async (tx) => {
    const r = await tx.produk.updateMany({
      // A negative delta must not drive stok below zero if orders consumed
      // stock since the form was opened.
      where: { id, ...(delta < 0 ? { stok: { gte: -delta } } : {}) },
      data: {
        nama,
        hargaModal,
        supplierId: supplier,
        ...(delta !== 0 ? { stok: { increment: delta } } : {}),
      },
    });
    if (r.count > 0) await kasStokNaik(tx, { nama, tambah: delta, hargaModal });
    return r;
  });
  if (res.count === 0) {
    const exists = await prisma.produk.findUnique({ where: { id }, select: { stok: true } });
    if (!exists) return fail("Produk tidak ditemukan.", 404);
    return fail(
      `Stok sudah berubah sejak form dibuka (sekarang ${exists.stok}). Buka ulang lalu coba lagi.`,
      409
    );
  }
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
