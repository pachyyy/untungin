import { prisma } from "@/lib/prisma";
import { formatRupiah, formatBulanKey } from "@/lib/format";
import { monthStartJakarta, monthKeyJakarta, toDateOnlyJakarta, parseDateOnlyJakarta } from "@/lib/date";
import { totalDibayar, modalPesanan } from "@/lib/calc";
import { LaporanChart } from "./LaporanChart";
import { DateRangeFilter } from "./DateRangeFilter";

export const dynamic = "force-dynamic";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const now = new Date();
  const defaultFrom = monthStartJakarta(now, 5);
  const fromStr = sp.from || toDateOnlyJakarta(defaultFrom);
  const toStr = sp.to || toDateOnlyJakarta(now);

  const from = parseDateOnlyJakarta(fromStr, "start");
  const to = parseDateOnlyJakarta(toStr, "end");

  const pesanan = await prisma.pesanan.findMany({
    where: { createdAt: { gte: from, lte: to } },
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

  const realized = pesanan.filter((p) => p.status === "lunas");

  // Monthly aggregation. Omzet/modal/untung are order-level (money actually
  // received minus snapshotted cost — see lib/calc's totalDibayar/
  // modalPesanan), since a discount or overpayment can't be decomposed back
  // onto individual line items. Best-seller qty is unaffected by that and
  // still comes from the per-item/per-komponen loop below.
  const monthly = new Map<string, { omzet: number; modal: number; untung: number }>();
  let totOmzet = 0;
  let totModal = 0;
  const bestSeller = new Map<string, { nama: string; qty: number }>();

  for (const p of realized) {
    const key = monthKeyJakarta(p.createdAt);
    const bucket = monthly.get(key) ?? { omzet: 0, modal: 0, untung: 0 };

    const omzet = totalDibayar(p);
    const modal = modalPesanan(p);
    bucket.omzet += omzet;
    bucket.modal += modal;
    bucket.untung += omzet - modal;
    totOmzet += omzet;
    totModal += modal;
    monthly.set(key, bucket);

    const addQty = (nama: string, qty: number) => {
      const bs = bestSeller.get(nama) ?? { nama, qty: 0 };
      bs.qty += qty;
      bestSeller.set(nama, bs);
    };
    for (const it of p.items) addQty(it.produk?.nama ?? it.namaManual ?? "", it.jumlah);
    for (const pk of p.pakets)
      for (const k of pk.komponen) addQty(k.produk.nama, k.pcs);
  }

  const chartData = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      label: formatBulanKey(key),
      untung: v.untung,
      omzet: v.omzet,
    }));

  const topProduk = Array.from(bestSeller.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const totUntung = totOmzet - totModal;

  return (
    <div className="space-y-4">
      <DateRangeFilter from={fromStr} to={toStr} />

      <div className="glass-hero rounded-[22px] p-5">
        <p className="text-display text-[13px] font-semibold text-glass-ink-dim">Untung periode ini</p>
        <p className="text-data mt-2 text-[38px] font-extrabold leading-none text-glass-ink">
          {formatRupiah(totUntung)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel rounded-[20px] p-3">
          <p className="text-display text-[11px] font-medium text-glass-ink-dim">Omzet</p>
          <p className="text-data mt-1 text-sm font-bold text-glass-ink">
            {formatRupiah(totOmzet)}
          </p>
        </div>
        <div className="glass-panel rounded-[20px] p-3">
          <p className="text-display text-[11px] font-medium text-glass-ink-dim">Modal</p>
          <p className="text-data mt-1 text-sm font-bold text-glass-ink">
            {formatRupiah(totModal)}
          </p>
        </div>
        <div className="glass-panel rounded-[20px] p-3">
          <p className="text-display text-[11px] font-medium text-glass-ink-dim">Untung</p>
          <p className="text-data mt-1 text-sm font-bold text-glass-success">
            {formatRupiah(totUntung)}
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-[20px] p-5">
        <h2 className="text-display mb-3 font-bold text-glass-ink">Profit per bulan</h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-glass-ink-faint">
            Belum ada data pada rentang ini.
          </p>
        ) : (
          <LaporanChart data={chartData} />
        )}
      </div>

      <div className="glass-panel rounded-[20px] p-5">
        <h2 className="text-display mb-3 font-bold text-glass-ink">Produk terlaris</h2>
        {topProduk.length === 0 ? (
          <p className="py-4 text-center text-sm text-glass-ink-faint">Belum ada data.</p>
        ) : (
          <ol className="space-y-2">
            {topProduk.map((p, i) => (
              <li key={p.nama} className="flex items-center gap-3">
                <span className="badge-primary text-data flex h-6 w-6 items-center justify-center rounded-full bg-glass-accent/15 text-xs font-bold text-glass-accent">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-glass-ink">
                  {p.nama}
                </span>
                <span className="text-data shrink-0 text-sm font-semibold text-glass-ink-dim">
                  {p.qty} terjual
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
