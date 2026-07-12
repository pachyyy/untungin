import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatTanggal } from "@/lib/format";
import { PesananManager } from "./PesananManager";

export const dynamic = "force-dynamic";

export default async function PesananPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const [pesanan, produk] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeader title="Pesanan" subtitle={`${pesanan.length} pesanan`} />
      <PesananManager
        pesanan={pesanan.map((p) => ({
          id: p.id,
          namaCustomer: p.namaCustomer,
          noHp: p.noHp,
          status: p.status,
          tanggal: formatTanggal(p.createdAt),
          items: p.items.map((it) => ({
            id: it.id,
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
              nama: k.produk.nama,
              pcs: k.pcs,
              produk: { hargaModal: k.produk.hargaModal },
            })),
          })),
        }))}
        produk={produk}
        openNew={sp.new === "1"}
      />
    </div>
  );
}
