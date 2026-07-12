"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();

  function apply(next: { from?: string; to?: string }) {
    const params = new URLSearchParams();
    params.set("from", next.from ?? from);
    params.set("to", next.to ?? to);
    router.push(`/laporan?${params.toString()}`);
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">Dari</label>
        <Input
          type="date"
          value={from}
          max={to}
          onChange={(e) => apply({ from: e.target.value })}
          className="h-10 text-sm"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">Sampai</label>
        <Input
          type="date"
          value={to}
          min={from}
          onChange={(e) => apply({ to: e.target.value })}
          className="h-10 text-sm"
        />
      </div>
    </div>
  );
}
