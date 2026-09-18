import { prisma } from "@/lib/prisma";
import { formatTanggal } from "@/lib/format";
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
    <PesananManager
      pesanan={pesanan.map((p) => ({
        id: p.id,
        namaCustomer: p.namaCustomer,
        noHp: p.noHp,
        status: p.status,
        tanggal: formatTanggal(p.createdAt),
        createdAtIso: p.createdAt.toISOString(),
        items: p.items.map((it) => ({
          id: it.id,
          produkId: it.produkId,
          nama: it.produk?.nama ?? it.namaManual ?? "",
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
          metode: b.metode,
          jumlah: b.jumlah,
          jenis: b.jenis,
        })),
      }))}
      produk={produk}
      customers={customers}
      openNew={sp.new === "1"}
    />
  );
}
