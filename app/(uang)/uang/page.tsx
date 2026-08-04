import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { TransaksiManager } from "./TransaksiManager";

export const dynamic = "force-dynamic";

export default async function UangPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const bulanStr =
    sp.bulan || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = bulanStr.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const [transaksi, akun, kategori] = await Promise.all([
    prisma.transaksi.findMany({
      where: { tanggal: { gte: start, lt: end } },
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
      include: {
        akun: { select: { nama: true } },
        akunTujuan: { select: { nama: true } },
        kategori: { select: { nama: true } },
      },
    }),
    prisma.akun.findMany({
      where: { aktif: true },
      orderBy: { urutan: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.kategori.findMany({
      where: { aktif: true },
      orderBy: { urutan: "asc" },
      select: { id: true, nama: true, jenis: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Uang" subtitle="Transaksi harian" />
      <TransaksiManager
        bulan={bulanStr}
        transaksi={transaksi.map((t) => ({
          id: t.id,
          jenis: t.jenis,
          tanggal: t.tanggal.toISOString().slice(0, 10),
          jumlah: t.jumlah,
          akunId: t.akunId,
          akunNama: t.akun.nama,
          akunTujuanId: t.akunTujuanId,
          akunTujuanNama: t.akunTujuan?.nama ?? null,
          kategoriId: t.kategoriId,
          kategoriNama: t.kategori?.nama ?? null,
          catatan: t.catatan,
          terkaitPesanan: Boolean(t.pembayaranId || t.pesananKeuntunganId),
        }))}
        akun={akun}
        kategori={kategori}
      />
    </div>
  );
}
