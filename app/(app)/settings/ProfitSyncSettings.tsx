import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { PENGATURAN_KEYS } from "@/lib/sync/keuntungan";
import { ProfitSyncForm } from "./ProfitSyncForm";

export async function ProfitSyncSettings() {
  const [akun, kategori, pengaturan] = await Promise.all([
    prisma.akun.findMany({
      where: { aktif: true },
      orderBy: { urutan: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.kategori.findMany({
      where: { aktif: true, jenis: "masuk" },
      orderBy: { urutan: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.pengaturan.findMany({
      where: { key: { in: Object.values(PENGATURAN_KEYS) } },
    }),
  ]);

  const current = Object.fromEntries(pengaturan.map((p) => [p.key, p.value]));

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-bold text-foreground">Sinkron Keuntungan</h2>
        <p className="text-sm text-muted-foreground">
          Saat pesanan Lunas, keuntungan otomatis dicatat ke Uang.
        </p>
      </div>

      {akun.length === 0 || kategori.length === 0 ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Belum ada akun atau kategori pemasukan. Impor data Money Manager dulu,
          atau buat akun/kategori manual di Uang.
        </p>
      ) : (
        <ProfitSyncForm
          akun={akun}
          kategori={kategori}
          akunSumberId={current[PENGATURAN_KEYS.akunSumberKeuntungan] ?? ""}
          akunTujuanId={current[PENGATURAN_KEYS.akunKeuntungan] ?? ""}
          kategoriId={current[PENGATURAN_KEYS.kategoriPenjualan] ?? ""}
        />
      )}
    </Card>
  );
}
