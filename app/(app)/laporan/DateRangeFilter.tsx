"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: "bulan" | "3bulan" | "tahun") {
  const now = new Date();
  if (preset === "bulan") {
    return {
      from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toDateOnly(now),
    };
  }
  if (preset === "3bulan") {
    return {
      from: toDateOnly(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
      to: toDateOnly(now),
    };
  }
  return {
    from: toDateOnly(new Date(now.getFullYear(), 0, 1)),
    to: toDateOnly(now),
  };
}

const PRESETS: { key: "bulan" | "3bulan" | "tahun"; label: string }[] = [
  { key: "bulan", label: "Bulan ini" },
  { key: "3bulan", label: "3 Bulan" },
  { key: "tahun", label: "Tahun ini" },
];

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();

  function apply(preset: "bulan" | "3bulan" | "tahun") {
    const range = presetRange(preset);
    const params = new URLSearchParams(range);
    router.push(`/laporan?${params.toString()}`);
  }

  return (
    <div className="flex gap-1.5">
      {PRESETS.map((p) => {
        const range = presetRange(p.key);
        const active = range.from === from && range.to === to;
        return (
          <button
            key={p.key}
            onClick={() => apply(p.key)}
            className={cn(
              "text-display rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-panel-strong text-glass-ink"
                : "text-glass-ink-faint hover:bg-panel"
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
