function GlassSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-panel-strong ${className ?? ""}`} />;
}

export default function EditStrukLoading() {
  return (
    <div className="space-y-3">
      <GlassSkeleton className="h-4 w-24" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="glass-panel space-y-4 rounded-[20px] p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <GlassSkeleton className="h-3.5 w-28" />
              <GlassSkeleton className="h-11 w-full rounded-[12px]" />
            </div>
          ))}
        </div>
        <div className="glass-panel space-y-3 rounded-[20px] p-5">
          <GlassSkeleton className="h-5 w-24" />
          <GlassSkeleton className="h-[480px] w-full rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}
