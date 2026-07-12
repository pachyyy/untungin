import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <PageHeader title="Beranda" subtitle="Ringkasan bisnismu" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="col-span-2 h-28">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-8 w-40" />
          </Card>
          <Card className="h-20">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-24" />
          </Card>
          <Card className="h-20">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-16" />
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="h-16" />
          <Card className="h-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex items-center justify-between py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
