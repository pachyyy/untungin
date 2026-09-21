import { formatRupiah } from "@/lib/format";
import { monthStartJakarta, toDateOnlyJakarta, parseDateOnlyJakarta } from "@/lib/date";
import { getLaporanData } from "@/lib/services/laporan";
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

  const { chartData, totOmzet, totModal, totUntung, topProduk } =
    await getLaporanData(from, to);

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
