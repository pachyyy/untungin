import { prisma } from "@/lib/prisma";
import { formatTanggal } from "@/lib/format";
import { ProdukManager } from "./ProdukManager";

export const dynamic = "force-dynamic";

const RIWAYAT_RESTOCK_LIMIT = 5;

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const [produk, suppliers] = await Promise.all([
    prisma.produk.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { nama: true } },
        restock: {
          orderBy: { tanggal: "desc" },
          take: RIWAYAT_RESTOCK_LIMIT,
        },
      },
    }),
    prisma.supplier.findMany({ orderBy: { nama: "asc" } }),
  ]);

  return (
    <ProdukManager
      produk={produk.map((p) => ({
        id: p.id,
        nama: p.nama,
        hargaModal: p.hargaModal,
        stok: p.stok,
        supplierId: p.supplierId,
        supplierNama: p.supplier.nama,
        riwayatRestock: p.restock.map((r) => ({
          id: r.id,
          qty: r.qty,
          hargaBeli: r.hargaBeli,
          tanggalLabel: formatTanggal(r.tanggal),
        })),
      }))}
      suppliers={suppliers}
      openNew={sp.new === "1"}
    />
  );
}
