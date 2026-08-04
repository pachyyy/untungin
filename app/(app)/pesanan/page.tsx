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
  const [pesanan, produk, customers] = await Promise.all([
    prisma.pesanan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            produk: { select: { nama: true, hargaModal: true } },
          },
        },
        pakets: {
          include: {
            komponen: {
              include: { produk: { select: { nama: true, hargaModal: true } } },
            },
          },
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
            produk: { hargaModal: it.produk.hargaModal },
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
              produk: { hargaModal: k.produk.hargaModal },
            })),
          })),
        }))}
        produk={produk}
        customers={customers}
        openNew={sp.new === "1"}
      />
    </div>
  );
}
