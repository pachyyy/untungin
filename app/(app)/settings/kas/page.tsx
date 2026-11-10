import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listMutasi } from "@/lib/services/kas";
import { formatRupiah, formatTanggal } from "@/lib/format";

export const metadata = { title: "Riwayat Keuangan · Untungin" };
export const dynamic = "force-dynamic";

const AKUN_LABEL: Record<string, string> = { modal: "Modal", saldo: "Saldo", kantong: "Posisi uang" };
const KANTONG_LABEL: Record<string, string> = { rekening: "Rekening", tunai: "Tunai" };

export default async function RiwayatKasPage() {
  const result = await listMutasi({ limit: 200 });
  const items = result.ok ? result.data.items : [];

  return (
    <div className="mx-auto max-w-[560px] space-y-3">
      <Link
        href="/settings"
        className="flex items-center gap-1 text-sm font-semibold text-glass-accent"
      >
        <ChevronLeft className="h-4 w-4" />
        Pengaturan
      </Link>

      <div className="glass-panel space-y-3 rounded-[20px] p-5">
        <div>
          <h2 className="text-display font-bold text-glass-ink">Riwayat mutasi</h2>
          <p className="text-sm text-glass-ink-dim">
            Setiap uang masuk dan keluar di Modal dan Saldo Keuntungan, beserta Rekening atau
            Tunai-nya.
          </p>
        </div>
        {items.length === 0 ? (
          <p className="rounded-[14px] bg-panel-strong px-3 py-4 text-center text-sm text-glass-ink-dim">
            Belum ada mutasi.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-[12px] bg-panel px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-glass-ink">{m.catatan ?? m.jenis}</p>
                  <p className="text-xs text-glass-ink-faint">
                    {formatTanggal(m.tanggal)} · {AKUN_LABEL[m.akun] ?? m.akun}
                    {m.kantong ? ` · ${KANTONG_LABEL[m.kantong] ?? m.kantong}` : ""}
                  </p>
                </div>
                <span
                  className={`text-data shrink-0 text-sm font-bold ${
                    m.jumlah < 0 ? "text-glass-danger" : "text-glass-success"
                  }`}
                >
                  {m.jumlah > 0 ? "+" : ""}
                  {formatRupiah(m.jumlah)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
