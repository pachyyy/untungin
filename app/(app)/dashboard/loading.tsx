function GlassSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-panel-strong ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="glass-panel h-[128px] rounded-[22px] p-5">
        <GlassSkeleton className="h-4 w-28" />
        <GlassSkeleton className="mt-3 h-8 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass-panel h-20 rounded-[20px] p-4">
          <GlassSkeleton className="h-3 w-20" />
          <GlassSkeleton className="mt-2 h-5 w-24" />
        </div>
        <div className="glass-panel h-20 rounded-[20px] p-4">
          <GlassSkeleton className="h-3 w-20" />
          <GlassSkeleton className="mt-2 h-5 w-16" />
        </div>
        <div className="glass-panel col-span-2 h-20 rounded-[20px] p-4 sm:col-span-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel h-16 rounded-[20px]" />
        <div className="glass-panel h-16 rounded-[20px]" />
      </div>
      <div className="space-y-2">
        <GlassSkeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-panel flex items-center justify-between rounded-[20px] py-3 px-4">
            <GlassSkeleton className="h-4 w-32" />
            <GlassSkeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
