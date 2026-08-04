"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";

export type ComboboxOption = { value: string; label: string };

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Rendered below the list, always visible (not filtered). e.g. an "add new" action. */
  footer?: (helpers: { close: () => void }) => React.ReactNode;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ditemukan.",
  disabled,
  className,
  footer,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-[15px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
            className
          )}
        >
          <span
            className={cn(
              "line-clamp-1 text-left",
              !selected && "text-muted-foreground"
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 text-primary",
                      value === o.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="line-clamp-1">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {footer && (
            <div className="border-t border-border p-1">
              {footer({ close: () => setOpen(false) })}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
