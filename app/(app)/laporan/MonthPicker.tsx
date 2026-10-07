"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { monthKeyJakarta } from "@/lib/date";
import { BULAN_PANJANG, formatBulanPanjang } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM" shifted by `delta` months. */
function shiftBulan(bulan: string, delta: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

const NAV_BTN =
  "flex h-9 w-9 items-center justify-center rounded-full text-glass-ink-dim transition-colors hover:bg-panel disabled:pointer-events-none disabled:opacity-30";

/**
 * ‹ Oktober 2026 › stepper. Tapping the label opens a year + month grid to
 * jump straight to any month. Months after the current one are disabled —
 * nothing can be lunas in the future.
 */
export function MonthPicker({ bulan }: { bulan: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(bulan.slice(0, 4)));

  const current = monthKeyJakarta(new Date());
  const currentYear = Number(current.slice(0, 4));

  function go(target: string) {
    setOpen(false);
    if (target === bulan) return;
    startTransition(() => router.push(`/laporan?bulan=${target}`));
  }

  return (
    <div className={cn("flex items-center justify-between gap-2", pending && "opacity-60")}>
      <button
        type="button"
        aria-label="Bulan sebelumnya"
        className={NAV_BTN}
        onClick={() => go(shiftBulan(bulan, -1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setViewYear(Number(bulan.slice(0, 4)));
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-display rounded-full px-4 py-1.5 text-base font-bold text-glass-ink transition-colors hover:bg-panel"
          >
            {formatBulanPanjang(bulan)}
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-72 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Tahun sebelumnya"
              className={NAV_BTN}
              onClick={() => setViewYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-data text-sm font-bold text-glass-ink">{viewYear}</span>
            <button
              type="button"
              aria-label="Tahun berikutnya"
              className={NAV_BTN}
              disabled={viewYear >= currentYear}
              onClick={() => setViewYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {BULAN_PANJANG.map((nama, i) => {
              const key = `${viewYear}-${pad2(i + 1)}`;
              const selected = key === bulan;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={key > current}
                  onClick={() => go(key)}
                  className={cn(
                    "rounded-[10px] py-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-30",
                    selected
                      ? "bg-gradient-to-br from-glass-accent to-glass-accent2 text-white"
                      : key === current
                        ? "text-glass-accent hover:bg-panel"
                        : "text-glass-ink hover:bg-panel"
                  )}
                >
                  {nama.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        aria-label="Bulan berikutnya"
        className={NAV_BTN}
        disabled={bulan >= current}
        onClick={() => go(shiftBulan(bulan, 1))}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
