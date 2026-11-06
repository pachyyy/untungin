function GlassSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-panel-strong ${className ?? ""}`} />;
}

function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-panel h-20 rounded-[20px] p-4 ${className}`}>
      <GlassSkeleton className="h-3 w-20" />
      <GlassSkeleton className="mt-2 h-5 w-24" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="glass-panel h-[128px] rounded-[22px] p-5">
        <GlassSkeleton className="h-4 w-28" />
        <GlassSkeleton className="mt-3 h-8 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton className="col-span-2" />
      </div>
    </div>
  );
}
