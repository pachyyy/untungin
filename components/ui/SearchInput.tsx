"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari…",
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-glass-ink-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex h-11 w-full rounded-[12px] border border-panel-border bg-glass-input pl-9 pr-9 text-[15px] text-glass-ink outline-none transition placeholder:text-glass-ink-faint focus-visible:border-glass-accent focus-visible:ring-2 focus-visible:ring-glass-accent/25"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Hapus pencarian"
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-glass-ink-faint hover:bg-panel-strong hover:text-glass-ink"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
