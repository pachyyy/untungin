import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { SupplierManager } from "./SupplierManager";

export const dynamic = "force-dynamic";

export default async function SupplierPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { nama: "asc" },
    include: {
      produk: {
        orderBy: { nama: "asc" },
        select: { id: true, nama: true, stok: true, hargaModal: true },
      },
    },
  });

  return (
    <div>
      <PageHeader title="Supplier" subtitle={`${suppliers.length} supplier`} />
      <SupplierManager
        suppliers={suppliers.map((s) => ({
          id: s.id,
          nama: s.nama,
          kontak: s.kontak,
          jumlahProduk: s.produk.length,
          produk: s.produk,
        }))}
      />
    </div>
  );
}
