"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] p-5 lg:block">
      <div className="glass-panel flex h-full flex-col rounded-[24px] p-4">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-glass-accent to-glass-accent2 text-base font-black text-white">
            U
          </div>
          <span className="text-[15px] font-extrabold tracking-tight text-glass-ink">
            Untungin
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-[14px] transition-colors",
                  active
                    ? "border border-panel-border bg-panel-strong font-bold text-glass-ink"
                    : "border border-transparent text-glass-ink-dim hover:bg-panel"
                )}
              >
                <span
                  className={cn(
                    "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[11px] font-bold",
                    active
                      ? "bg-gradient-to-br from-glass-accent to-glass-accent2 text-white"
                      : "bg-panel-strong text-glass-ink-faint"
                  )}
                >
                  {item.monogram}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 px-2.5 pt-3 text-[11px] text-glass-ink-faint">
          <p>⌘K Cari cepat</p>
          <p>Esc Tutup panel</p>
        </div>
      </div>
    </aside>
  );
}
