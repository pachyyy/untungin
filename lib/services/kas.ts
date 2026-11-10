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
 *
 * On top of that, every row can carry a `kantong` — where the physical money
 * sits ("rekening" or "tunai"). That is a second, independent dimension: the
 * same rupiah is "modal" by purpose and "rekening" by location. A pocket's
 * balance is the sum of every row tagged with it; rows with akun "kantong"
 * (moving cash between pockets, reconciling against reality) touch only the
 * pockets and never the modal/saldo sums.
 */

type Tx = Prisma.TransactionClient;
type Akun = "modal" | "saldo" | "kantong";

export type Kantong = "rekening" | "tunai";

export type KasSaldo = {
  aktif: boolean;
  modal: number;
  saldo: number;
  /** Whether Rekening/Tunai has been set up (setKantong called once). */
  kantongAktif: boolean;
  rekening: number;
  tunai: number;
};

export type KasMutasiItem = {
  id: string;
  akun: string;
  kantong: string | null;
  jumlah: number;
  jenis: string;
  catatan: string | null;
  tanggal: Date;
};

const CATATAN_MAX = 100;

type Row = {
  akun: Akun;
  kantong?: Kantong | null;
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
      kantong: r.kantong ?? null,
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

/** Balance per pocket: every row that carries a kantong, whatever its akun. */
async function sumPerKantong(
  db: Tx | typeof prisma
): Promise<{ rekening: number; tunai: number }> {
  const grouped = await db.kasMutasi.groupBy({
    by: ["kantong"],
    where: { kantong: { not: null } },
    _sum: { jumlah: true },
  });
  const get = (k: Kantong) => grouped.find((g) => g.kantong === k)?._sum.jumlah ?? 0;
  return { rekening: get("rekening"), tunai: get("tunai") };
}

export async function getKas(): Promise<KasSaldo> {
  const setting = await prisma.kasSetting.findUnique({ where: { id: "default" } });
  if (!setting) {
    return { aktif: false, modal: 0, saldo: 0, kantongAktif: false, rekening: 0, tunai: 0 };
  }
  const [akun, kantong] = await Promise.all([sumPerAkun(prisma), sumPerKantong(prisma)]);
  return {
    aktif: true,
    ...akun,
    kantongAktif: setting.kantongAktifSejak !== null,
    ...kantong,
  };
}

// ------------------------------------------------------------ kantong helpers

/** A payment's metode decides its pocket: cash stays in Tunai, transfer and
 * QRIS land in Rekening. Anything else (or none) has no pocket. */
export function kantongDariMetode(metode: string | null | undefined): Kantong | null {
  const m = (metode ?? "").trim().toLowerCase();
  if (m === "cash" || m === "tunai") return "tunai";
  if (m === "transfer" || m === "qris") return "rekening";
  return null;
}

function parseKantong(v: unknown): Kantong | null {
  return v === "rekening" || v === "tunai" ? v : null;
}

function isAbsent(v: unknown): boolean {
  return v === undefined || v === null;
}

/**
 * How a stock purchase was paid. `rekening` + `tunai` must add up to the
 * purchase total; `tanpaKas` means no money moved (stock already owned, or a
 * count correction). All three absent = a client that predates pockets: the
 * purchase still reduces modal, just without a pocket.
 */
export type SumberDana = { rekening?: unknown; tunai?: unknown; tanpaKas?: unknown };
export type Pembagian = { kantong: Kantong | null; jumlah: number }[];

/** Validates and normalises a SumberDana against the purchase total. Call it
 * *before* opening the transaction so a bad split fails without side effects. */
export function pembagianBeli(total: number, sumber?: SumberDana): ServiceResult<Pembagian> {
  if (total <= 0) return ok([]);

  const t = sumber?.tanpaKas;
  if (t === true || t === "1" || t === "true") return ok([]);

  if (!sumber || (isAbsent(sumber.rekening) && isAbsent(sumber.tunai))) {
    return ok([{ kantong: null, jumlah: total }]);
  }

  const rekening = isAbsent(sumber.rekening) ? 0 : parseInteger(sumber.rekening || "0");
  const tunai = isAbsent(sumber.tunai) ? 0 : parseInteger(sumber.tunai || "0");
  if (rekening === null || tunai === null || rekening < 0 || tunai < 0) {
    return fail("Jumlah dari rekening dan tunai harus berupa angka.");
  }
  if (rekening + tunai !== total) {
    return fail("Rincian rekening dan tunai harus sama dengan total belanja.");
  }

  const rows: Pembagian = [];
  if (rekening > 0) rows.push({ kantong: "rekening", jumlah: rekening });
  if (tunai > 0) rows.push({ kantong: "tunai", jumlah: tunai });
  return ok(rows);
}

// ------------------------------------------------- automatic hooks (in a tx)

/**
 * A customer payment. Split by the order's margin: modal gets
 * jumlah * (cost / total), saldo gets the rest — but modal's share across all
 * of an order's payments is capped at the order's cost, so an overpayment
 * goes entirely to saldo instead of inflating modal past what the goods
 * cost. A below-cost order yields a negative saldo share (the loss); the two
 * shares always add up to exactly `jumlah`. Both rows land in the pocket the
 * payment's metode points at (Tunai for cash, Rekening for transfer/QRIS).
 */
export async function kasPembayaran(
  tx: Tx,
  p: {
    pembayaranId: string;
    pesananId: string;
    jumlah: number;
    tanggal: Date;
    metode?: string | null;
  }
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
  const kantong = kantongDariMetode(p.metode);
  await tulis(tx, [
    { akun: "modal", kantong, jumlah: modalShare, jenis: "bayar", catatan: label, tanggal: p.tanggal, pembayaranId: p.pembayaranId },
    { akun: "saldo", kantong, jumlah: p.jumlah - modalShare, jenis: "bayar", catatan: label, tanggal: p.tanggal, pembayaranId: p.pembayaranId },
  ]);
}

/** Cancelling an order assumes its payments were refunded: each payment's
 * ledger rows get an equal-and-opposite row tied to the same payment (so
 * deleting that payment later cascades away the pair together). The refund
 * leaves the same pocket the payment arrived in. */
export async function kasBatal(tx: Tx, pesananId: string, namaCustomer: string): Promise<void> {
  const rows = await tx.kasMutasi.findMany({
    where: { jenis: "bayar", pembayaran: { pesananId } },
  });
  await tulis(
    tx,
    rows.map((r) => ({
      akun: r.akun as Akun,
      kantong: parseKantong(r.kantong),
      jumlah: -r.jumlah,
      jenis: "batal",
      catatan: `Batal — ${namaCustomer}`,
      pembayaranId: r.pembayaranId ?? undefined,
    }))
  );
}

/** Modal-reducing rows for a stock purchase: one per pocket it was paid from.
 * `pembagian` undefined = a legacy caller, one pocket-less row for the total. */
function barisBeli(
  total: number,
  pembagian: Pembagian | undefined,
  jenis: string,
  catatan: string,
  tanggal?: Date
): Row[] {
  const parts = pembagian ?? [{ kantong: null, jumlah: total }];
  return parts.map((b) => ({
    akun: "modal" as const,
    kantong: b.kantong,
    jumlah: -b.jumlah,
    jenis,
    catatan,
    tanggal,
  }));
}

export async function kasRestock(
  tx: Tx,
  r: { nama: string; qty: number; hargaBeli: number; tanggal: Date; pembagian?: Pembagian }
): Promise<void> {
  if (!(await isAktif(tx))) return;
  await tulis(
    tx,
    barisBeli(r.qty * r.hargaBeli, r.pembagian, "restock", `Restock ${r.nama} ×${r.qty}`, r.tanggal)
  );
}

export async function kasProdukBaru(
  tx: Tx,
  r: { nama: string; stok: number; hargaModal: number; pembagian?: Pembagian }
): Promise<void> {
  if (r.stok <= 0 || !(await isAktif(tx))) return;
  await tulis(
    tx,
    barisBeli(r.stok * r.hargaModal, r.pembagian, "produk_baru", `Produk baru ${r.nama} ×${r.stok}`)
  );
}

/** Only increases count as buying stock; lowering stok by hand is usually a
 * correction, not a refund, so it moves no money. A raise can be a correction
 * too — the web form says so with `tanpaKas`, which reaches here as an empty
 * `pembagian` and writes nothing. */
export async function kasStokNaik(
  tx: Tx,
  r: { nama: string; tambah: number; hargaModal: number; pembagian?: Pembagian }
): Promise<void> {
  if (r.tambah <= 0 || !(await isAktif(tx))) return;
  await tulis(
    tx,
    barisBeli(r.tambah * r.hargaModal, r.pembagian, "stok_naik", `Tambah stok ${r.nama} ×${r.tambah}`)
  );
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

export type TarikInput = {
  jumlah: unknown;
  catatan?: string;
  /** Pocket the money leaves from. Absent (older clients) = no pocket. */
  kantong?: unknown;
};

/** Money the owner takes out of the profit account (pribadi, operasional). */
export async function tarikSaldo(input: TarikInput): Promise<ServiceResult<KasSaldo>> {
  const jumlah = parsePositive(input.jumlah);
  if (jumlah === null) return fail("Jumlah harus lebih dari 0.");
  const kantong = isAbsent(input.kantong) ? null : parseKantong(input.kantong);
  if (!isAbsent(input.kantong) && kantong === null) return fail("Kantong tidak valid.");

  const res = await prisma.$transaction(async (tx) => {
    if (!(await isAktif(tx))) return false;
    await tulis(tx, [
      {
        akun: "saldo",
        kantong,
        jumlah: -jumlah,
        jenis: "tarik",
        catatan: input.catatan?.trim() || "Tarik saldo",
      },
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

export type PindahKantongInput = {
  arah: "rekening_ke_tunai" | "tunai_ke_rekening";
  jumlah: unknown;
};

/** Cash moved between the two pockets (ATM withdrawal, depositing cash).
 * Touches only the pockets: modal and saldo stay exactly as they were. */
export async function pindahKantong(input: PindahKantongInput): Promise<ServiceResult<KasSaldo>> {
  const jumlah = parsePositive(input.jumlah);
  if (jumlah === null) return fail("Jumlah harus lebih dari 0.");
  if (input.arah !== "rekening_ke_tunai" && input.arah !== "tunai_ke_rekening")
    return fail("Arah tidak valid.");

  const keTunai = input.arah === "rekening_ke_tunai";
  const dari: Kantong = keTunai ? "rekening" : "tunai";
  const ke: Kantong = keTunai ? "tunai" : "rekening";
  const catatan = keTunai ? "Tarik tunai (Rekening → Tunai)" : "Setor tunai (Tunai → Rekening)";

  const res = await prisma.$transaction(async (tx) => {
    if (!(await isAktif(tx))) return false;
    await tulis(tx, [
      { akun: "kantong", kantong: dari, jumlah: -jumlah, jenis: "pindah_kantong", catatan },
      { akun: "kantong", kantong: ke, jumlah, jenis: "pindah_kantong", catatan },
    ]);
    return true;
  });
  if (!res) return fail("Isi saldo awal dulu di Pengaturan → Keuangan.");
  return ok(await getKas());
}

export type SetKantongInput = { rekening: unknown; tunai: unknown };

/**
 * "The real balance of Rekening / Tunai is X now" — the reconciliation step
 * against the owner's actual bank balance and cash on hand. Like setSaldo it
 * records the difference as an adjustment row (akun "kantong", so modal and
 * saldo are untouched) and marks the pocket view as set up on first use.
 */
export async function setKantong(input: SetKantongInput): Promise<ServiceResult<KasSaldo>> {
  const rekening = parseInteger(input.rekening);
  const tunai = parseInteger(input.tunai);
  if (rekening === null) return fail("Saldo rekening harus berupa angka.");
  if (tunai === null) return fail("Saldo tunai harus berupa angka.");

  const res = await prisma.$transaction(async (tx) => {
    const setting = await tx.kasSetting.findUnique({ where: { id: "default" } });
    if (!setting) return false;
    const first = setting.kantongAktifSejak === null;
    const now = await sumPerKantong(tx);
    const jenis = first ? "kantong_awal" : "kantong_sesuai";
    const catatan = first ? "Saldo awal kantong" : "Cocokkan kantong";
    await tulis(tx, [
      { akun: "kantong", kantong: "rekening", jumlah: rekening - now.rekening, jenis, catatan },
      { akun: "kantong", kantong: "tunai", jumlah: tunai - now.tunai, jenis, catatan },
    ]);
    if (first) {
      await tx.kasSetting.update({
        where: { id: "default" },
        data: { kantongAktifSejak: new Date() },
      });
    }
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
    kantong: r.kantong,
    jumlah: r.jumlah,
    jenis: r.jenis,
    catatan: r.catatan,
    tanggal: r.tanggal,
  }));
  return ok({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
}
