function GlassSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-panel-strong ${className ?? ""}`} />;
}

export default function ProdukLoading() {
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-152px)] lg:flex-row">
      <div className="glass-panel space-y-2 rounded-[20px] p-3 lg:w-[340px] lg:shrink-0">
        <GlassSkeleton className="h-11 w-full rounded-[12px]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5 rounded-[14px] px-3 py-2.5">
            <GlassSkeleton className="h-4 w-32" />
            <GlassSkeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="glass-panel hidden flex-1 rounded-[20px] lg:block" />
    </div>
  );
}
