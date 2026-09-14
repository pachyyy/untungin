"use client";

import { usePathname } from "next/navigation";
import { Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { NAV_ITEMS, isNavItemActive } from "@/lib/nav";
import { useCommandPalette } from "@/components/ui/CommandPalette";
import { logoutAction } from "@/lib/actions/auth";

function useActiveTitle() {
  const pathname = usePathname();
  const active = NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href));
  return active?.label ?? "Untungin";
}

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? theme !== "light" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-1.5 rounded-full border border-panel-border bg-panel px-3 py-2 text-[13px] font-semibold text-glass-ink-dim transition-colors hover:bg-panel-strong"
    >
      {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isDark ? "Mode Gelap" : "Mode Terang"}</span>
    </button>
  );
}

export function Topbar() {
  const title = useActiveTitle();
  const { open } = useCommandPalette();

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 lg:px-5 lg:pt-5">
      <div className="glass-panel flex items-center justify-between gap-3 rounded-[20px] px-4 py-2.5">
        <h1 className="truncate text-[17px] font-extrabold tracking-tight text-glass-ink lg:text-[19px]">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={open}
            className="hidden items-center gap-2 rounded-full border border-panel-border bg-panel px-3.5 py-2 text-[13px] text-glass-ink-faint transition-colors hover:bg-panel-strong sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Cari atau jalankan perintah…</span>
            <span className="rounded-md border border-panel-border bg-panel-strong px-1.5 py-0.5 text-[10px] font-semibold text-glass-ink-dim">
              ⌘K
            </span>
          </button>
          <button
            type="button"
            onClick={open}
            aria-label="Cari"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-panel-border bg-panel text-glass-ink-dim transition-colors hover:bg-panel-strong sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <ThemeToggleButton />

          <form action={logoutAction} className="hidden lg:block">
            <button
              type="submit"
              aria-label="Keluar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-glass-accent to-glass-accent2 text-[13px] font-bold text-white"
            >
              U
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
