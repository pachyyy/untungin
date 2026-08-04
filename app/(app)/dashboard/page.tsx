import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";
import { totalPesanan, untungPesanan } from "@/lib/calc";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const STOK_MENIPIS = 5;

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [pesananBulanIni, pendingCount, stokMenipis] = await Promise.all([
    prisma.pesanan.findMany({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      include: { items: true, pakets: { include: { komponen: true } } },
    }),
    prisma.pesanan.count({ where: { status: { in: ["belum_bayar", "nyicil"] } } }),
    prisma.produk.findMany({
      where: { stok: { lt: STOK_MENIPIS } },
      orderBy: { stok: "asc" },
      take: 10,
    }),
  ]);

  // Realized omzet/untung = orders fully paid (lunas) this month.
  const realized = pesananBulanIni.filter((p) => p.status === "lunas");
  const omzet = realized.reduce((s, p) => s + totalPesanan(p), 0);
  const untung = realized.reduce((s, p) => s + untungPesanan(p), 0);

  return (
    <div>
      <PageHeader title="Beranda" subtitle="Ringkasan bisnismu" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="col-span-2 bg-primary text-white">
            <p className="text-sm/none opacity-90">Untung bulan ini</p>
            <p className="mt-2 text-3xl font-black">{formatRupiah(untung)}</p>
            <p className="mt-1 text-xs opacity-80">Dari pesanan lunas</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-muted">Omzet bulan ini</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {formatRupiah(omzet)}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-muted">Pesanan pending</p>
            <p className="mt-1 text-lg font-bold text-ink">{pendingCount}</p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/pesanan?new=1">
            <Card className="flex h-full items-center gap-3 transition active:scale-[0.98]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PlusIcon />
              </span>
              <span className="font-semibold text-ink">Tambah Pesanan</span>
            </Card>
          </Link>
          <Link href="/produk?new=1">
            <Card className="flex h-full items-center gap-3 transition active:scale-[0.98]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <PlusIcon />
              </span>
              <span className="font-semibold text-ink">Tambah Produk</span>
            </Card>
          </Link>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-ink">Stok menipis</h2>
            <Link href="/produk" className="text-sm font-medium text-primary">
              Lihat semua
            </Link>
          </div>
          {stokMenipis.length === 0 ? (
            <Card className="text-center text-sm text-muted">
              Semua stok aman 👍
            </Card>
          ) : (
            <div className="space-y-2">
              {stokMenipis.map((p) => (
                <Card
                  key={p.id}
                  className="flex items-center justify-between border-l-4 border-l-warning py-3"
                >
                  <span className="font-medium text-ink">{p.nama}</span>
                  <span className="rounded-full bg-warning/10 px-2.5 py-1 text-sm font-bold text-warning">
                    Sisa {p.stok}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
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
