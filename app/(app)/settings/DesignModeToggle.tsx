"use client";

import { useEffect, useState } from "react";
import { useDesignMode, type DesignMode } from "@/components/DesignModeProvider";
import { cn } from "@/lib/utils";

const options: { value: DesignMode; label: string }[] = [
  { value: "glass", label: "Liquid Glass" },
  { value: "brutalist", label: "Brutalism" },
  { value: "minimal", label: "Minimal" },
];

export function DesignModeToggle() {
  const { mode, setMode } = useDesignMode();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? mode : "glass";

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(({ value, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={active}
            className={cn(
              "brutal-interactive text-display rounded-2xl border p-3 text-center text-[13px] font-semibold leading-tight transition-colors",
              active
                ? "border-glass-accent/50 bg-glass-accent/10 text-glass-ink"
                : "border-panel-border bg-panel text-glass-ink-dim hover:bg-panel-strong"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
