import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { modalPesanan, totalPesanan } from "@/lib/calc";
import { ok, fail, type ServiceResult } from "@/lib/services/types";

/**
 * The owner's two money accounts:
 *   - "modal"  — cash available to buy stock. Grows when customers pay (the
 *                cost share of each payment), shrinks on restock / new stock.
 *   - "saldo"  — accumulated keuntungan. Grows with the profit share of each
 *                payment; shrinks on tarik (withdraw).
 *
 * Every movement is a signed KasMutasi row; a balance is the sum per akun.
 * Nothing is written until the owner has entered starting balances (setSaldo
 * creates KasSetting) — older payments/restocks are deliberately not counted.
 * The `kas*` helpers below are the automatic hooks other services call
 * *inside their own transaction*, so a ledger row can never be written for a
 * payment/restock that then rolled back (or vice versa).
 */

type Tx = Prisma.TransactionClient;
type Akun = "modal" | "saldo";

export type KasSaldo = { aktif: boolean; modal: number; saldo: number };

export type KasMutasiItem = {
  id: string;
  akun: string;
  jumlah: number;
  jenis: string;
  catatan: string | null;
  tanggal: Date;
};

const CATATAN_MAX = 100;

type Row = {
  akun: Akun;
  jumlah: number;
  jenis: string;
  catatan?: string | null;
  tanggal?: Date;
  pembayaranId?: string;
};

async function isAktif(db: Tx): Promise<boolean> {
  return (await db.kasSetting.findUnique({ where: { id: "default" } })) !== null;
}

async function tulis(db: Tx, rows: Row[]): Promise<void> {
  const data = rows
    .filter((r) => r.jumlah !== 0)
    .map((r) => ({
      akun: r.akun,
      jumlah: r.jumlah,
      jenis: r.jenis,
      catatan: r.catatan ? r.catatan.slice(0, CATATAN_MAX) : null,
      tanggal: r.tanggal ?? new Date(),
      pembayaranId: r.pembayaranId ?? null,
    }));
  if (data.length > 0) await db.kasMutasi.createMany({ data });
}

async function sumPerAkun(db: Tx | typeof prisma): Promise<{ modal: number; saldo: number }> {
  const grouped = await db.kasMutasi.groupBy({ by: ["akun"], _sum: { jumlah: true } });
  const get = (akun: Akun) => grouped.find((g) => g.akun === akun)?._sum.jumlah ?? 0;
  return { modal: get("modal"), saldo: get("saldo") };
}

export async function getKas(): Promise<KasSaldo> {
  const setting = await prisma.kasSetting.findUnique({ where: { id: "default" } });
  if (!setting) return { aktif: false, modal: 0, saldo: 0 };
  return { aktif: true, ...(await sumPerAkun(prisma)) };
}

// ------------------------------------------------- automatic hooks (in a tx)

/**
 * A customer payment. Split by the order's margin: modal gets
 * jumlah * (cost / total), saldo gets the rest — but modal's share across all
 * of an order's payments is capped at the order's cost, so an overpayment
 * goes entirely to saldo instead of inflating modal past what the goods
 * cost. A below-cost order yields a negative saldo share (the loss); the two
 * shares always add up to exactly `jumlah`.
 */
export async function kasPembayaran(
  tx: Tx,
  p: { pembayaranId: string; pesananId: string; jumlah: number; tanggal: Date }
): Promise<void> {
  if (!(await isAktif(tx))) return;

  const pesanan = await tx.pesanan.findUnique({
    where: { id: p.pesananId },
    include: { items: true, pakets: { include: { komponen: true } } },
  });
  if (!pesanan) return;

  const already = await tx.kasMutasi.aggregate({
    _sum: { jumlah: true },
    where: { akun: "modal", jenis: "bayar", pembayaran: { pesananId: p.pesananId } },
  });
  const cost = modalPesanan(pesanan);
  const total = totalPesanan(pesanan);
  const cap = Math.max(0, cost - (already._sum.jumlah ?? 0));
  const modalShare =
    total > 0 ? Math.max(0, Math.min(Math.round((p.jumlah * cost) / total), cap)) : 0;

  const label = `Pembayaran — ${pesanan.namaCustomer}`;
  await tulis(tx, [
    { akun: "modal", jumlah: modalShare, jenis: "bayar", catatan: label, tanggal: p.tanggal, pembayaranId: p.pembayaranId },
    { akun: "saldo", jumlah: p.jumlah - modalShare, jenis: "bayar", catatan: label, tanggal: p.tanggal, pembayaranId: p.pembayaranId },
  ]);
}

/** Cancelling an order assumes its payments were refunded: each payment's
 * ledger rows get an equal-and-opposite row tied to the same payment (so
 * deleting that payment later cascades away the pair together). */
export async function kasBatal(tx: Tx, pesananId: string, namaCustomer: string): Promise<void> {
  const rows = await tx.kasMutasi.findMany({
    where: { jenis: "bayar", pembayaran: { pesananId } },
  });
  await tulis(
    tx,
    rows.map((r) => ({
      akun: r.akun as Akun,
      jumlah: -r.jumlah,
      jenis: "batal",
      catatan: `Batal — ${namaCustomer}`,
      pembayaranId: r.pembayaranId ?? undefined,
    }))
  );
}

export async function kasRestock(
  tx: Tx,
  r: { nama: string; qty: number; hargaBeli: number; tanggal: Date }
): Promise<void> {
  if (!(await isAktif(tx))) return;
  await tulis(tx, [
    { akun: "modal", jumlah: -r.qty * r.hargaBeli, jenis: "restock", catatan: `Restock ${r.nama} ×${r.qty}`, tanggal: r.tanggal },
  ]);
}

export async function kasProdukBaru(
  tx: Tx,
  r: { nama: string; stok: number; hargaModal: number }
): Promise<void> {
  if (r.stok <= 0 || !(await isAktif(tx))) return;
  await tulis(tx, [
    { akun: "modal", jumlah: -r.stok * r.hargaModal, jenis: "produk_baru", catatan: `Produk baru ${r.nama} ×${r.stok}` },
  ]);
}

/** Only increases count as buying stock; lowering stok by hand is usually a
 * correction, not a refund, so it moves no money. */
export async function kasStokNaik(
  tx: Tx,
  r: { nama: string; tambah: number; hargaModal: number }
): Promise<void> {
  if (r.tambah <= 0 || !(await isAktif(tx))) return;
  await tulis(tx, [
    { akun: "modal", jumlah: -r.tambah * r.hargaModal, jenis: "stok_naik", catatan: `Tambah stok ${r.nama} ×${r.tambah}` },
  ]);
}

// ---------------------------------------------------------- owner actions

function parseInteger(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!/^-?\d+$/.test(s.replace(/[.\s]/g, ""))) return null;
  const n = Number(s.replace(/[.\s]/g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

function parsePositive(v: unknown): number | null {
  const n = parseInteger(v);
  return n !== null && n > 0 ? n : null;
}

export type SetSaldoInput = { modal: unknown; saldo: unknown };

/**
 * First call: creates KasSetting and the two "awal" rows — the moment the
 * ledger starts counting. Every later call means "the real balance is X now":
 * it records the difference as a "penyesuaian" row per account, so history
 * stays intact instead of being rewritten.
 */
export async function setSaldo(input: SetSaldoInput): Promise<ServiceResult<KasSaldo>> {
  const modal = parseInteger(input.modal);
  const saldo = parseInteger(input.saldo);
  if (modal === null) return fail("Modal harus berupa angka.");
  if (saldo === null) return fail("Saldo keuntungan harus berupa angka.");

  await prisma.$transaction(async (tx) => {
    const aktif = await isAktif(tx);
    if (!aktif) {
      await tx.kasSetting.create({ data: { id: "default" } });
      await tulis(tx, [
        { akun: "modal", jumlah: modal, jenis: "awal", catatan: "Saldo awal" },
        { akun: "saldo", jumlah: saldo, jenis: "awal", catatan: "Saldo awal" },
      ]);
      return;
    }
    const now = await sumPerAkun(tx);
    await tulis(tx, [
      { akun: "modal", jumlah: modal - now.modal, jenis: "penyesuaian", catatan: "Atur saldo" },
      { akun: "saldo", jumlah: saldo - now.saldo, jenis: "penyesuaian", catatan: "Atur saldo" },
    ]);
  });

  return ok(await getKas());
}

export type TarikInput = { jumlah: unknown; catatan?: string };

/** Money the owner takes out of the profit account (pribadi, operasional). */
export async function tarikSaldo(input: TarikInput): Promise<ServiceResult<KasSaldo>> {
  const jumlah = parsePositive(input.jumlah);
  if (jumlah === null) return fail("Jumlah harus lebih dari 0.");

  const res = await prisma.$transaction(async (tx) => {
    if (!(await isAktif(tx))) return false;
    await tulis(tx, [
      { akun: "saldo", jumlah: -jumlah, jenis: "tarik", catatan: input.catatan?.trim() || "Tarik saldo" },
    ]);
    return true;
  });
  if (!res) return fail("Isi saldo awal dulu di Pengaturan → Keuangan.");
  return ok(await getKas());
}

export type TransferInput = {
  /** Which way the money moves. */
  arah: "saldo_ke_modal" | "modal_ke_saldo";
  jumlah: unknown;
};

export async function transferKas(input: TransferInput): Promise<ServiceResult<KasSaldo>> {
  const jumlah = parsePositive(input.jumlah);
  if (jumlah === null) return fail("Jumlah harus lebih dari 0.");
  if (input.arah !== "saldo_ke_modal" && input.arah !== "modal_ke_saldo")
    return fail("Arah transfer tidak valid.");

  const dariSaldo = input.arah === "saldo_ke_modal";
  const catatan = dariSaldo ? "Transfer saldo → modal" : "Transfer modal → saldo";
  const res = await prisma.$transaction(async (tx) => {
    if (!(await isAktif(tx))) return false;
    await tulis(tx, [
      { akun: dariSaldo ? "saldo" : "modal", jumlah: -jumlah, jenis: "transfer", catatan },
      { akun: dariSaldo ? "modal" : "saldo", jumlah, jenis: "transfer", catatan },
    ]);
    return true;
  });
  if (!res) return fail("Isi saldo awal dulu di Pengaturan → Keuangan.");
  return ok(await getKas());
}

export type ListMutasiInput = { cursor?: string; limit?: number };

/** Newest first; cursor-paginated by id like the pesanan list. */
export async function listMutasi(
  input: ListMutasiInput
): Promise<ServiceResult<{ items: KasMutasiItem[]; nextCursor: string | null }>> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const rows = await prisma.kasMutasi.findMany({
    orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
    id: r.id,
    akun: r.akun,
    jumlah: r.jumlah,
    jenis: r.jenis,
    catatan: r.catatan,
    tanggal: r.tanggal,
  }));
  return ok({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
}
