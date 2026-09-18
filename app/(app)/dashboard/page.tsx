import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";
import { totalPesanan, totalDibayar, untungRealisasi } from "@/lib/calc";
import { monthRangeJakarta } from "@/lib/date";

export const dynamic = "force-dynamic";

const STOK_MENIPIS = 5;

export default async function DashboardPage() {
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

  return (
    <div className="space-y-4">
      <div className="glass-hero rounded-[22px] p-5">
        <p className="text-display text-[13px] font-semibold text-glass-ink-dim">Untung bulan ini</p>
        <p className="text-data mt-2 text-[38px] font-extrabold leading-none text-glass-ink">
          {formatRupiah(untung)}
        </p>
        <p className="mt-2 text-xs text-glass-ink-dim">Dari pesanan lunas</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel rounded-[20px] p-4">
          <p className="text-display text-xs font-medium text-glass-ink-dim">Omzet bulan ini</p>
          <p className="text-data mt-1 text-[20px] font-extrabold text-glass-ink">
            {formatRupiah(omzet)}
          </p>
        </div>
        <div className="glass-panel rounded-[20px] p-4">
          <p className="text-display text-xs font-medium text-glass-ink-dim">Nilai Stok (HPP)</p>
          <p className="text-data mt-1 text-[20px] font-extrabold text-glass-ink">
            {formatRupiah(nilaiStok)}
          </p>
        </div>
        <div className="glass-panel rounded-[20px] p-4">
          <p className="text-display text-xs font-medium text-glass-ink-dim">Pesanan pending</p>
          <p className="text-data mt-1 text-[20px] font-extrabold text-glass-ink">{pendingCount}</p>
        </div>
        <div className="glass-panel rounded-[20px] p-4">
          <p className="text-display text-xs font-medium text-glass-ink-dim">Belum dibayar</p>
          <p className="text-data mt-1 text-[20px] font-extrabold text-glass-ink">
            {formatRupiah(pendingOmzet)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/pesanan?new=1"
          className="brutal-interactive glass-panel flex items-center gap-3 rounded-[20px] p-4 transition active:scale-[0.98]"
        >
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-glass-accent/15 text-glass-accent">
            <PlusIcon />
          </span>
          <span className="text-display font-bold text-glass-ink">Tambah Pesanan</span>
        </Link>
        <Link
          href="/produk?new=1"
          className="brutal-interactive glass-panel flex items-center gap-3 rounded-[20px] p-4 transition active:scale-[0.98]"
        >
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-glass-success/15 text-glass-success">
            <PlusIcon />
          </span>
          <span className="text-display font-bold text-glass-ink">Tambah Produk</span>
        </Link>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-display font-bold text-glass-ink">Stok menipis</h2>
          <Link href="/produk" className="text-display text-sm font-semibold text-glass-accent">
            Lihat semua
          </Link>
        </div>
        {stokMenipis.length === 0 ? (
          <div className="glass-panel rounded-[20px] p-4 text-center text-sm text-glass-ink-dim">
            Semua stok aman
          </div>
        ) : (
          <div className="space-y-2">
            {stokMenipis.map((p) => (
              <div
                key={p.id}
                className="glass-panel flex items-center justify-between rounded-[20px] border-l-[3px] border-l-glass-warning py-3 pl-3.5 pr-4"
              >
                <span className="font-medium text-glass-ink">{p.nama}</span>
                <span className="badge-warning text-data rounded-full bg-glass-warning/15 px-2.5 py-1 text-sm font-bold text-glass-warning">
                  Sisa {p.stok}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
