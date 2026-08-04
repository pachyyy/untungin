import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "./ThemeToggle";

export const metadata = { title: "Pengaturan · Untungin" };

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Sesuaikan aplikasimu" />
      <div className="space-y-4 p-4">
        <Card className="space-y-3">
          <div>
            <h2 className="font-bold text-foreground">Tampilan</h2>
            <p className="text-sm text-muted-foreground">
              Pilih tema terang, gelap, atau ikuti sistem.
            </p>
          </div>
          <ThemeToggle />
        </Card>

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
