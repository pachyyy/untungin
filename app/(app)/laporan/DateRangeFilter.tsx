"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toDateOnlyJakarta, monthStartJakarta, jakartaParts } from "@/lib/date";

function presetRange(preset: "bulan" | "3bulan" | "tahun") {
  const now = new Date();
  if (preset === "bulan") {
    return {
      from: toDateOnlyJakarta(monthStartJakarta(now, 0)),
      to: toDateOnlyJakarta(now),
    };
  }
  if (preset === "3bulan") {
    return {
      from: toDateOnlyJakarta(monthStartJakarta(now, 2)),
      to: toDateOnlyJakarta(now),
    };
  }
  const { year } = jakartaParts(now);
  return {
    from: `${year}-01-01`,
    to: toDateOnlyJakarta(now),
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
