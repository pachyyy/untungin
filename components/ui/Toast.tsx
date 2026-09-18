"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };

const ToastContext = React.createContext<{
  toast: (message: string, variant?: ToastVariant) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const AUTO_DISMISS_MS = 4000;
const MAX_TOASTS = 3;
let nextId = 0;

/**
 * Minimal hand-rolled toast host — no new dependency, following the same
 * context-provider-with-a-portal shape as CommandPaletteProvider. Renders via
 * createPortal directly to document.body rather than through Radix's Portal,
 * so it's never nested inside a Modal's DOM subtree. z-[90] sits above both
 * CommandPalette (z-[80]) and Modal (z-50): a toast fired while a modal is
 * still open (the 3 former alert() call sites can happen mid-modal) stays
 * visible on top of it, at the cost of the visual/aria disconnect that's
 * inherent to notifying outside a focused dialog — acceptable here since the
 * alternative was a blocking native alert(), which was worse.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = ++nextId;
      setToasts((prev) => {
        const next = [...prev, { id, message, variant }];
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          // Bottom-anchored above BottomNav on mobile (BottomNav is z-40,
          // ~70px tall with its safe-area padding; bottom-24 clears it with
          // room to spare); top-right on lg, where BottomNav/Sidebar swap
          // (matches the lg breakpoint BottomNav/Sidebar already use).
          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-auto lg:right-5 lg:top-5 lg:items-end"
          >
            {toasts.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => dismiss(t.id)}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[14px] glass-panel-strong glass-shadow-lg px-4 py-3 text-left text-sm font-medium text-glass-ink",
                  "animate-in fade-in-0 slide-in-from-bottom-2 lg:slide-in-from-top-2"
                )}
              >
                {t.variant === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-glass-success" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-glass-danger" />
                )}
                <span className="flex-1">{t.message}</span>
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-glass-ink-faint" />
              </button>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
