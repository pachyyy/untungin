"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 lg:hidden">
      <div className="glass-panel-strong glass-shadow-lg mx-auto flex max-w-md items-stretch gap-0.5 overflow-x-auto rounded-full px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-[52px] flex-1 flex-col items-center gap-1 rounded-full px-1.5 py-1.5 transition-colors"
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[9px] text-[10px] font-bold transition-colors",
                  active
                    ? "bg-gradient-to-br from-glass-accent to-glass-accent2 text-white"
                    : "bg-panel text-glass-ink-faint"
                )}
              >
                {item.monogram}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "font-bold text-glass-ink" : "text-glass-ink-faint"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
