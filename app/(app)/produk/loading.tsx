import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/ListSkeleton";

export default function ProdukLoading() {
  return (
    <div>
      <PageHeader title="Produk" subtitle="Memuat…" />
      <ListSkeleton rows={6} />
    </div>
  );
}
