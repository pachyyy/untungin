import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LaporanLoading() {
  return (
    <div>
      <PageHeader title="Laporan" subtitle="Memuat…" />
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-14 flex-1" />
          <Skeleton className="h-14 flex-1" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-16 p-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-2 h-4 w-16" />
            </Card>
          ))}
        </div>
        <Card>
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="h-56 w-full" />
        </Card>
        <Card className="space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
