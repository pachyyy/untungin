import { prisma } from "@/lib/prisma";
import { formatBulanKey } from "@/lib/format";
import { monthKeyJakarta } from "@/lib/date";
import { totalDibayar, modalPesanan } from "@/lib/calc";

export type LaporanData = {
  chartData: { label: string; untung: number; omzet: number }[];
  totOmzet: number;
  totModal: number;
  totUntung: number;
  topProduk: { nama: string; qty: number }[];
};

/** `from`/`to` are already-resolved instants (Jakarta-day boundaries) — date
 * parsing/defaulting from searchParams stays a page concern in
 * app/(app)/laporan/page.tsx, not business logic. */
export async function getLaporanData(from: Date, to: Date): Promise<LaporanData> {
  const pesanan = await prisma.pesanan.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: {
      items: { include: { produk: { select: { nama: true } } } },
      pakets: {
        include: {
          komponen: { include: { produk: { select: { nama: true } } } },
        },
      },
      pembayaran: true,
    },
  });

  const realized = pesanan.filter((p) => p.status === "lunas");

  // Monthly aggregation. Omzet/modal/untung are order-level (money actually
  // received minus snapshotted cost — see lib/calc's totalDibayar/
  // modalPesanan), since a discount or overpayment can't be decomposed back
  // onto individual line items. Best-seller qty is unaffected by that and
  // still comes from the per-item/per-komponen loop below.
  const monthly = new Map<string, { omzet: number; modal: number; untung: number }>();
  let totOmzet = 0;
  let totModal = 0;
  const bestSeller = new Map<string, { nama: string; qty: number }>();

  for (const p of realized) {
    const key = monthKeyJakarta(p.createdAt);
    const bucket = monthly.get(key) ?? { omzet: 0, modal: 0, untung: 0 };

    const omzet = totalDibayar(p);
    const modal = modalPesanan(p);
    bucket.omzet += omzet;
    bucket.modal += modal;
    bucket.untung += omzet - modal;
    totOmzet += omzet;
    totModal += modal;
    monthly.set(key, bucket);

    const addQty = (nama: string, qty: number) => {
      const bs = bestSeller.get(nama) ?? { nama, qty: 0 };
      bs.qty += qty;
      bestSeller.set(nama, bs);
    };
    for (const it of p.items) addQty(it.produk?.nama ?? it.namaManual ?? "", it.jumlah);
    for (const pk of p.pakets)
      for (const k of pk.komponen) addQty(k.produk.nama, k.pcs);
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

  return { chartData, totOmzet, totModal, totUntung, topProduk };
}
