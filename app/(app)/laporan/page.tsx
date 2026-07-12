import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatRupiah, formatBulanKey } from "@/lib/format";
import { isCommitted } from "@/lib/calc";
import { LaporanChart } from "./LaporanChart";
import { DateRangeFilter } from "./DateRangeFilter";

export const dynamic = "force-dynamic";

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fromStr = sp.from || toDateOnly(defaultFrom);
  const toStr = sp.to || toDateOnly(now);

  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T23:59:59");

  const pesanan = await prisma.pesanan.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: {
      items: { include: { produk: { select: { nama: true, hargaModal: true } } } },
      pakets: {
        include: {
          komponen: {
            include: { produk: { select: { nama: true, hargaModal: true } } },
          },
        },
      },
    },
  });

  const realized = pesanan.filter((p) => isCommitted(p.status));

  // Monthly aggregation
  const monthly = new Map<string, { omzet: number; modal: number; untung: number }>();
  let totOmzet = 0;
  let totModal = 0;
  const bestSeller = new Map<string, { nama: string; qty: number }>();

  for (const p of realized) {
    const key = `${p.createdAt.getFullYear()}-${String(
      p.createdAt.getMonth() + 1
    ).padStart(2, "0")}`;
    const bucket = monthly.get(key) ?? { omzet: 0, modal: 0, untung: 0 };
    const addSale = (omzet: number, modal: number) => {
      bucket.omzet += omzet;
      bucket.modal += modal;
      bucket.untung += omzet - modal;
      totOmzet += omzet;
      totModal += modal;
    };
    const addQty = (nama: string, qty: number) => {
      const bs = bestSeller.get(nama) ?? { nama, qty: 0 };
      bs.qty += qty;
      bestSeller.set(nama, bs);
    };

    for (const it of p.items) {
      addSale(it.hargaSaat * it.jumlah, it.produk.hargaModal * it.jumlah);
      addQty(it.produk.nama, it.jumlah);
    }
    for (const pk of p.pakets) {
      const modal = pk.komponen.reduce(
        (s, k) => s + k.produk.hargaModal * k.pcs,
        0
      );
      addSale(pk.harga, modal);
      for (const k of pk.komponen) addQty(k.produk.nama, k.pcs);
    }
    monthly.set(key, bucket);
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
    <div>
      <PageHeader title="Laporan" subtitle="Untung dari pesanan selesai/dikirim" />
      <div className="space-y-4 p-4">
        <DateRangeFilter from={fromStr} to={toStr} />

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <p className="text-[11px] font-medium text-muted">Omzet</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {formatRupiah(totOmzet)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] font-medium text-muted">Modal</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {formatRupiah(totModal)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-[11px] font-medium text-muted">Untung</p>
            <p className="mt-1 text-sm font-bold text-success">
              {formatRupiah(totUntung)}
            </p>
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 font-bold text-ink">Profit per bulan</h2>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Belum ada data pada rentang ini.
            </p>
          ) : (
            <LaporanChart data={chartData} />
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-bold text-ink">Produk terlaris</h2>
          {topProduk.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">Belum ada data.</p>
          ) : (
            <ol className="space-y-2">
              {topProduk.map((p, i) => (
                <li key={p.nama} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {p.nama}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-muted">
                    {p.qty} terjual
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
