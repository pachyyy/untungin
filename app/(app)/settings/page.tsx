import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "./ThemeToggle";
import { DesignModeToggle } from "./DesignModeToggle";

export const metadata = { title: "Pengaturan · Untungin" };

export default function SettingsPage() {
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
