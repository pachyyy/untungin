import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";
import { setMode } from "@/lib/actions/mode";
import { getMode } from "@/lib/mode";
import { ThemeToggle } from "./ThemeToggle";
import { ProfitSyncSettings } from "./ProfitSyncSettings";

export const metadata = { title: "Pengaturan · Untungin" };

export default async function SettingsPage() {
  const mode = await getMode();

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Sesuaikan aplikasimu" />
      <div className="space-y-4 p-4">
        <Card className="space-y-3">
          <div>
            <h2 className="font-bold text-foreground">Mode Aplikasi</h2>
            <p className="text-sm text-muted-foreground">
              Pindah antara Jualan (Untungin) dan Uang (Money Manager).
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <form action={setMode}>
              <input type="hidden" name="mode" value="jual" />
              <button
                type="submit"
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition-colors",
                  mode === "jual"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                Jualan
              </button>
            </form>
            <form action={setMode}>
              <input type="hidden" name="mode" value="uang" />
              <button
                type="submit"
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition-colors",
                  mode === "uang"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                Uang
              </button>
            </form>
          </div>
        </Card>

        <Card className="space-y-3">
          <div>
            <h2 className="font-bold text-foreground">Tampilan</h2>
            <p className="text-sm text-muted-foreground">
              Pilih tema terang, gelap, atau ikuti sistem.
            </p>
          </div>
          <ThemeToggle />
        </Card>

        <ProfitSyncSettings />

        <Card>
          <h2 className="font-bold text-foreground">Tentang</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Untungin — kelola produk, pesanan, dan untung bisnis resellermu.
          </p>
        </Card>

        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="h-5 w-5" />
            Keluar
          </Button>
        </form>
      </div>
    </div>
  );
}
