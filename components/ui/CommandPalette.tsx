"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { cn } from "@/lib/utils";

type PaletteAction = {
  label: string;
  href: string;
};

const ACTIONS: PaletteAction[] = [
  { label: "Tambah Pesanan Baru", href: "/pesanan?new=1" },
  { label: "Tambah Produk Baru", href: "/produk?new=1" },
  { label: "Buka Beranda", href: "/dashboard" },
  { label: "Buka Laporan", href: "/laporan" },
  { label: "Buka Pengaturan", href: "/settings" },
];

const PaletteContext = React.createContext<{ open: () => void } | null>(null);

export function useCommandPalette() {
  const ctx = React.useContext(PaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function select(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <PaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              "fixed inset-0 z-[80] bg-[var(--glass-scrim)]",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            )}
          />
          <DialogPrimitive.Content
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "fixed left-1/2 top-[14vh] z-[80] w-[92vw] max-w-[520px] -translate-x-1/2 overflow-hidden rounded-[20px] glass-panel-strong glass-shadow-lg",
              "duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
            )}
          >
            <DialogPrimitive.Title className="sr-only">Cari perintah</DialogPrimitive.Title>
            <Command
              className="bg-transparent text-glass-ink"
              shouldFilter
            >
              <div className="flex items-center border-b border-glass-divider px-4">
                <CommandInput
                  autoFocus
                  placeholder="Ketik perintah atau layar…"
                  className="h-[52px] bg-transparent text-[15px] text-glass-ink placeholder:text-glass-ink-faint"
                />
              </div>
              <CommandList className="max-h-[320px] p-2">
                <CommandEmpty className="py-6 text-center text-sm text-glass-ink-faint">
                  Tidak ditemukan.
                </CommandEmpty>
                <CommandGroup className="p-0 text-glass-ink">
                  {ACTIONS.map((action) => (
                    <CommandItem
                      key={action.href}
                      value={action.label}
                      onSelect={() => select(action.href)}
                      className="text-display rounded-xl px-3 py-2.5 text-[14px] font-semibold text-glass-ink data-[selected=true]:bg-panel-strong"
                    >
                      {action.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </PaletteContext.Provider>
  );
}
