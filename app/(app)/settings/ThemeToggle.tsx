"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const options: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes resolves the active theme only on the client; avoid hydration mismatch.
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "dark" : undefined;

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-semibold transition-colors",
              active
                ? "border-glass-accent/50 bg-glass-accent/10 text-glass-ink"
                : "border-panel-border bg-panel text-glass-ink-dim hover:bg-panel-strong"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
