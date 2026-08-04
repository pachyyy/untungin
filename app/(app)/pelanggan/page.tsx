import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatTanggal } from "@/lib/format";
import { PelangganManager } from "./PelangganManager";

export const dynamic = "force-dynamic";

export default async function PelangganPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { nama: "asc" },
    include: {
      pesanan: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { produk: { select: { nama: true } } },
          },
          pakets: {
            include: {
              komponen: {
                include: { produk: { select: { nama: true } } },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader title="Pelanggan" subtitle={`${customers.length} pelanggan`} />
      <PelangganManager
        customers={customers.map((c) => ({
          id: c.id,
          nama: c.nama,
          noHp: c.noHp,
          catatan: c.catatan,
          pesanan: c.pesanan.map((p) => ({
            id: p.id,
            status: p.status,
            tanggal: formatTanggal(p.createdAt),
            noHp: p.noHp,
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
          })),
        }))}
      />
    </div>
  );
}
