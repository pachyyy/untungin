import Link from "next/link";
import { LogOut, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getStrukSetting } from "@/lib/services/struk";
import { logoutAction } from "@/lib/actions/auth";
import { listDevices } from "@/lib/services/devices";
import { formatTanggal } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";
import { DesignModeToggle } from "./DesignModeToggle";
import { PerangkatManager } from "./PerangkatManager";

export const metadata = { title: "Pengaturan · Untungin" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [devicesResult, struk] = await Promise.all([listDevices(), getStrukSetting()]);
  const devices = devicesResult.ok ? devicesResult.data : [];

  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <div className="glass-panel space-y-4 rounded-[20px] p-5">
        <div>
          <h2 className="text-display font-bold text-glass-ink">Tampilan</h2>
          <p className="text-sm text-glass-ink-dim">Pilih tema terang atau gelap.</p>
        </div>
        <ThemeToggle />

        <div>
          <p className="text-display text-xs font-semibold uppercase tracking-wide text-glass-ink-faint">
            Gaya Tampilan
          </p>
        </div>
        <DesignModeToggle />
      </div>

      <div className="glass-panel space-y-4 rounded-[20px] p-5">
        <div>
          <h2 className="text-display font-bold text-glass-ink">Struk</h2>
          <p className="text-sm text-glass-ink-dim">
            Atur tampilan struk yang dibagikan dari halaman pesanan.
          </p>
        </div>
        <div className="rounded-[14px] bg-panel-strong px-3 py-2.5 text-sm">
          <p className="truncate font-bold text-glass-ink">{struk.namaToko}</p>
          <p className="text-xs text-glass-ink-dim">
            Ukuran default {struk.ukuranDefault === "a5" ? "Nota A5" : "Struk 80mm"} · Nomor{" "}
            {struk.prefixNota}0001
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/settings/struk">
            <Receipt className="h-4 w-4" />
            Edit Struk
          </Link>
        </Button>
      </div>

      <div className="glass-panel space-y-4 rounded-[20px] p-5">
        <div>
          <h2 className="text-display font-bold text-glass-ink">Perangkat</h2>
          <p className="text-sm text-glass-ink-dim">
            Kelola HP yang login lewat aplikasi mobile Untungin.
          </p>
        </div>
        <PerangkatManager
          devices={devices.map((d) => ({
            id: d.id,
            nama: d.nama,
            role: d.role,
            lastSeenLabel: d.lastSeenAt ? formatTanggal(d.lastSeenAt) : null,
            createdLabel: formatTanggal(d.createdAt),
            isRevoked: !!d.revokedAt,
          }))}
        />
      </div>

      <div className="glass-panel space-y-3 rounded-[20px] p-5">
        <div>
          <h2 className="text-display font-bold text-glass-ink">Sesi</h2>
          <p className="text-sm text-glass-ink-dim">
            Sesi berlaku 7 hari di perangkat ini.
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="brutal-interactive text-display flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-panel-border bg-glass-danger/15 text-[15px] font-bold text-glass-danger transition-colors hover:bg-glass-danger/25"
          >
            <LogOut className="h-5 w-5" />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}
