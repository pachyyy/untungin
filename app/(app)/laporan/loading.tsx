function GlassSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-panel-strong ${className ?? ""}`} />;
}

export default function LaporanLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <GlassSkeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="glass-panel h-[128px] rounded-[22px] p-5">
        <GlassSkeleton className="h-4 w-28" />
        <GlassSkeleton className="mt-3 h-8 w-40" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-panel h-16 rounded-[20px] p-3">
            <GlassSkeleton className="h-3 w-12" />
            <GlassSkeleton className="mt-2 h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="glass-panel rounded-[20px] p-5">
        <GlassSkeleton className="mb-3 h-5 w-32" />
        <GlassSkeleton className="h-56 w-full" />
      </div>
      <div className="glass-panel space-y-3 rounded-[20px] p-5">
        <GlassSkeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <GlassSkeleton className="h-6 w-6 rounded-full" />
            <GlassSkeleton className="h-4 flex-1" />
            <GlassSkeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
