import { prisma } from "@/lib/prisma";
import { totalPesanan, totalDibayar, untungRealisasi } from "@/lib/calc";
import { monthRangeJakarta } from "@/lib/date";

const STOK_MENIPIS = 5;

export type DashboardData = {
  /** Realized profit this month (money actually received on lunas orders
   * minus their snapshotted cost) — not the asking-price estimate. */
  untung: number;
  /** Realized revenue this month, same lunas-only/actually-received basis. */
  omzet: number;
  /** Cost value (HPP) of everything currently on the shelf — not month-scoped. */
  nilaiStok: number;
  /** Count of orders still belum_bayar or nyicil. */
  pendingCount: number;
  /** Outstanding balance across those pending orders (unpaid remainder for
   * nyicil, full total for belum_bayar). */
  pendingOmzet: number;
  stokMenipis: { id: string; nama: string; stok: number }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const { start: monthStart, end: monthEnd } = monthRangeJakarta(new Date());

  const [pesananBulanIni, pendingPesanan, stokMenipis, semuaProduk] = await Promise.all([
    prisma.pesanan.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      include: {
        items: true,
        pakets: { include: { komponen: true } },
        pembayaran: true,
      },
    }),
    prisma.pesanan.findMany({
      where: { status: { in: ["belum_bayar", "nyicil"] } },
      include: {
        items: true,
        pakets: { include: { komponen: true } },
        pembayaran: true,
      },
    }),
    prisma.produk.findMany({
      where: { stok: { lt: STOK_MENIPIS } },
      orderBy: { stok: "asc" },
      take: 10,
    }),
    prisma.produk.findMany({ select: { stok: true, hargaModal: true } }),
  ]);

  // Realized omzet/untung = money actually received on orders marked lunas
  // this month, not the asking price — a discounted/forced-lunas order (see
  // tandaiLunas) or an overpaid one reports its real numbers here instead.
  const realized = pesananBulanIni.filter((p) => p.status === "lunas");
  const omzet = realized.reduce((s, p) => s + totalDibayar(p), 0);
  const untung = realized.reduce((s, p) => s + untungRealisasi(p), 0);
  // Cost value of everything currently on the shelf — not month-scoped.
  const nilaiStok = semuaProduk.reduce((s, p) => s + p.stok * p.hargaModal, 0);
  const pendingCount = pendingPesanan.length;
  // Outstanding balance still owed across belum_bayar/nyicil orders — for
  // nyicil, only the unpaid remainder counts, not the whole order value.
  const pendingOmzet = pendingPesanan.reduce((s, p) => {
    const dibayar = p.pembayaran.reduce((s2, b) => s2 + b.jumlah, 0);
    return s + (totalPesanan(p) - dibayar);
  }, 0);

  return {
    untung,
    omzet,
    nilaiStok,
    pendingCount,
    pendingOmzet,
    stokMenipis: stokMenipis.map((p) => ({ id: p.id, nama: p.nama, stok: p.stok })),
  };
}
