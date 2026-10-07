import { prisma } from "@/lib/prisma";
import { formatBulanKey } from "@/lib/format";
import { monthKeyJakarta, monthStartJakarta, parseDateOnlyJakarta } from "@/lib/date";
import { totalDibayar, modalPesanan, totalPesanan } from "@/lib/calc";

export type LaporanData = {
  chartData: { label: string; untung: number; omzet: number }[];
  totOmzet: number;
  totModal: number;
  totUntung: number;
  topProduk: { nama: string; qty: number }[];
};

type PembayaranTanggalLike = { jumlah: number; tanggal: Date; createdAt: Date };

/**
 * The date an order became Lunas, which is the date its profit is reported
 * under (dashboard and laporan) — not the order's createdAt. An order created
 * 30 Sep and paid off 2 Okt counts toward Oktober; installments paid before
 * that don't split the profit across months, the whole order lands in the
 * month it was completed.
 *
 * Derived from the payments themselves rather than stored: it's the
 * `tanggal` (user-entered, may be backdated) of the payment whose running
 * total first reaches the order total. Overpayments after that point don't
 * move it. A forced Lunas (tandaiLunas while underpaid) never reaches the
 * total, so it uses the latest payment. Returns null for non-lunas orders —
 * and for a lunas order with no payments, which no code path produces.
 */
export function tanggalLunas(p: {
  status: string;
  items: { jumlah: number; hargaSaat: number }[];
  pakets: { harga: number }[];
  pembayaran: PembayaranTanggalLike[];
}): Date | null {
  if (p.status !== "lunas" || p.pembayaran.length === 0) return null;
  const sorted = [...p.pembayaran].sort(
    (a, b) =>
      a.tanggal.getTime() - b.tanggal.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );
  const total = totalPesanan(p);
  let running = 0;
  for (const b of sorted) {
    running += b.jumlah;
    if (running >= total) return b.tanggal;
  }
  return sorted[sorted.length - 1].tanggal;
}

/**
 * Lunas orders whose tanggalLunas falls within [from, to] (inclusive), each
 * paired with that date. Shared by the dashboard and laporan so both agree
 * on which month an order's profit belongs to.
 */
export async function findLunasInRange(from: Date, to: Date) {
  const pesanan = await prisma.pesanan.findMany({
    // The completing payment is one of the order's payments, so an order
    // with no payment on/after `from` can't have been completed in range —
    // this prefilter just narrows the fetch, tanggalLunas below decides.
    where: { status: "lunas", pembayaran: { some: { tanggal: { gte: from } } } },
    include: {
      items: { include: { produk: { select: { nama: true } } } },
      pakets: {
        include: {
          komponen: { include: { produk: { select: { nama: true } } } },
        },
      },
      pembayaran: true,
    },
  });

  const rows = [];
  for (const p of pesanan) {
    const lunasAt = tanggalLunas(p);
    if (lunasAt && lunasAt >= from && lunasAt <= to) rows.push({ pesanan: p, lunasAt });
  }
  return rows;
}

type LunasRow = Awaited<ReturnType<typeof findLunasInRange>>[number];

/** Omzet/modal/untung totals plus best sellers for a set of lunas orders.
 * Omzet/modal/untung are order-level (money actually received minus
 * snapshotted cost — see lib/calc's totalDibayar/modalPesanan), since a
 * discount or overpayment can't be decomposed back onto individual line
 * items. Best-seller qty is unaffected by that and comes from the
 * per-item/per-komponen loop. */
function summarize(rows: LunasRow[]) {
  let totOmzet = 0;
  let totModal = 0;
  const bestSeller = new Map<string, { nama: string; qty: number }>();
  const addQty = (nama: string, qty: number) => {
    const bs = bestSeller.get(nama) ?? { nama, qty: 0 };
    bs.qty += qty;
    bestSeller.set(nama, bs);
  };

  for (const { pesanan: p } of rows) {
    totOmzet += totalDibayar(p);
    totModal += modalPesanan(p);
    for (const it of p.items) addQty(it.produk?.nama ?? it.namaManual ?? "", it.jumlah);
    for (const pk of p.pakets)
      for (const k of pk.komponen) addQty(k.produk.nama, k.pcs);
  }

  const topProduk = Array.from(bestSeller.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return { totOmzet, totModal, totUntung: totOmzet - totModal, topProduk };
}

/** Per-month omzet/untung, keyed by the Jakarta month of tanggalLunas. Pass
 * `months` to emit those keys in that order (zero-filled); otherwise only
 * months with data are returned, sorted. */
function monthlyChart(rows: LunasRow[], months?: string[]): LaporanData["chartData"] {
  const monthly = new Map<string, { omzet: number; untung: number }>();
  for (const key of months ?? []) monthly.set(key, { omzet: 0, untung: 0 });
  for (const { pesanan: p, lunasAt } of rows) {
    const key = monthKeyJakarta(lunasAt);
    const bucket = monthly.get(key) ?? { omzet: 0, untung: 0 };
    const omzet = totalDibayar(p);
    bucket.omzet += omzet;
    bucket.untung += omzet - modalPesanan(p);
    monthly.set(key, bucket);
  }
  const keys = months ?? Array.from(monthly.keys()).sort();
  return keys.map((key) => {
    const v = monthly.get(key)!;
    return { label: formatBulanKey(key), untung: v.untung, omzet: v.omzet };
  });
}

/** `from`/`to` are already-resolved instants (Jakarta-day boundaries) — date
 * parsing/defaulting from searchParams stays a caller concern, not business
 * logic. Orders are included by the date they became lunas (tanggalLunas),
 * not createdAt. Used by the mobile API's from/to range view. */
export async function getLaporanData(from: Date, to: Date): Promise<LaporanData> {
  const rows = await findLunasInRange(from, to);
  return { chartData: monthlyChart(rows), ...summarize(rows) };
}

export type LaporanBulanData = LaporanData & {
  /** Label of the selected month as it appears in chartData, for highlighting. */
  activeLabel: string;
};

const CHART_MONTHS = 6;

/**
 * One month's report for the web Laporan page: totals and best sellers are
 * for `bulan` ("YYYY-MM") only; chartData covers the 6 months ending at
 * `bulan` (zero-filled) for context. One query serves both.
 */
export async function getLaporanBulan(bulan: string): Promise<LaporanBulanData> {
  const monthStart = parseDateOnlyJakarta(`${bulan}-01`, "start");
  const windowStart = monthStartJakarta(monthStart, CHART_MONTHS - 1);
  const end = new Date(monthStartJakarta(monthStart, -1).getTime() - 1);

  const rows = await findLunasInRange(windowStart, end);
  const months = Array.from({ length: CHART_MONTHS }, (_, i) =>
    monthKeyJakarta(monthStartJakarta(monthStart, CHART_MONTHS - 1 - i))
  );

  return {
    chartData: monthlyChart(rows, months),
    ...summarize(rows.filter((r) => r.lunasAt >= monthStart)),
    activeLabel: formatBulanKey(bulan),
  };
}
