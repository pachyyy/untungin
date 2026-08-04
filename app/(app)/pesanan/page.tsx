import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatTanggal } from "@/lib/format";
import Link from "next/link";
import { PesananManager } from "./PesananManager";

export const dynamic = "force-dynamic";

export default async function PesananPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const [pesanan, produk, customers, akun] = await Promise.all([
    prisma.pesanan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            produk: { select: { nama: true } },
          },
        },
        pakets: {
          include: {
            komponen: {
              include: { produk: { select: { nama: true } } },
            },
          },
        },
        pembayaran: {
          orderBy: { tanggal: "asc" },
          include: { akun: { select: { nama: true } } },
        },
      },
    }),
    prisma.produk.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, stok: true },
    }),
    prisma.customer.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, noHp: true },
    }),
    prisma.akun.findMany({
      where: { aktif: true },
      orderBy: { urutan: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Pesanan"
        subtitle={`${pesanan.length} pesanan`}
        action={
          <Link
            href="/pelanggan"
            className="rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Pelanggan
          </Link>
        }
      />
      <PesananManager
        pesanan={pesanan.map((p) => ({
          id: p.id,
          namaCustomer: p.namaCustomer,
          noHp: p.noHp,
          status: p.status,
          tanggal: formatTanggal(p.createdAt),
          items: p.items.map((it) => ({
            id: it.id,
            produkId: it.produkId,
            nama: it.produk.nama,
            jumlah: it.jumlah,
            hargaSaat: it.hargaSaat,
            modalSaat: it.modalSaat,
          })),
          pakets: p.pakets.map((pk) => ({
            id: pk.id,
            nama: pk.nama,
            harga: pk.harga,
            komponen: pk.komponen.map((k) => ({
              id: k.id,
              produkId: k.produkId,
              nama: k.produk.nama,
              pcs: k.pcs,
              modalSaat: k.modalSaat,
            })),
          })),
          pembayaran: p.pembayaran.map((b) => ({
            id: b.id,
            tanggal: b.tanggal.toISOString().slice(0, 10),
            tanggalLabel: formatTanggal(b.tanggal),
            akunId: b.akunId,
            akunNama: b.akun.nama,
            jumlah: b.jumlah,
            jenis: b.jenis,
          })),
        }))}
        produk={produk}
        customers={customers}
        akun={akun}
        openNew={sp.new === "1"}
      />
    </div>
  );
}
