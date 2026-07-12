import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/ListSkeleton";

export default function SupplierLoading() {
  return (
    <div>
      <PageHeader title="Supplier" subtitle="Memuat…" />
      <ListSkeleton rows={5} />
    </div>
  );
}
