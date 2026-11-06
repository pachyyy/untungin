import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { getDashboardData } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { untung, omzet, nilaiStok, pendingOmzet, modal, saldoKeuntungan } =
    await getDashboardData();

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
        <KasCard label="Modal" value={modal} />
        <div className="glass-panel rounded-[20px] p-4">
          <p className="text-display text-xs font-medium text-glass-ink-dim">Nilai Stok (HPP)</p>
          <p className="text-data mt-1 text-[20px] font-extrabold text-glass-ink">
            {formatRupiah(nilaiStok)}
          </p>
        </div>
        <div className="glass-panel rounded-[20px] p-4">
          <p className="text-display text-xs font-medium text-glass-ink-dim">Omzet bulan ini</p>
          <p className="text-data mt-1 text-[20px] font-extrabold text-glass-ink">
            {formatRupiah(omzet)}
          </p>
        </div>
        <div className="glass-panel rounded-[20px] p-4">
          <p className="text-display text-xs font-medium text-glass-ink-dim">Belum dibayar</p>
          <p className="text-data mt-1 text-[20px] font-extrabold text-glass-ink">
            {formatRupiah(pendingOmzet)}
          </p>
        </div>
        <KasCard label="Saldo Keuntungan" value={saldoKeuntungan} className="col-span-2" />
      </div>
    </div>
  );
}

/** Modal / Saldo Keuntungan — null until the owner has entered starting
 * balances, in which case the card points at where to do that. A negative
 * balance is shown in red (allowed on purpose; it means an entry is off). */
function KasCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number | null;
  className?: string;
}) {
  return (
    <div className={`glass-panel rounded-[20px] p-4 ${className}`}>
      <p className="text-display text-xs font-medium text-glass-ink-dim">{label}</p>
      {value === null ? (
        <Link
          href="/settings"
          className="mt-1 block text-sm font-semibold text-glass-accent"
        >
          Belum diatur · isi di Pengaturan
        </Link>
      ) : (
        <p
          className={`text-data mt-1 text-[20px] font-extrabold ${
            value < 0 ? "text-glass-danger" : "text-glass-ink"
          }`}
        >
          {formatRupiah(value)}
        </p>
      )}
    </div>
  );
}
