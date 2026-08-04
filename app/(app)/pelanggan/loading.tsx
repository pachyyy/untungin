import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/ui/ListSkeleton";

export default function PelangganLoading() {
  return (
    <div>
      <PageHeader title="Pelanggan" subtitle="Memuat…" />
      <ListSkeleton rows={5} />
    </div>
  );
}
