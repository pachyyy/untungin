"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible dialog (Radix): focus trap, Esc to close, scroll lock, ARIA.
 * Bottom-sheet on mobile, centered dialog on desktop.
 */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          // Don't let a Radix popover/combobox (portaled outside the dialog)
          // dismiss the dialog when interacted with.
          onInteractOutside={(e) => {
            const target = e.target as Element | null;
            if (target?.closest("[data-radix-popper-content-wrapper]")) {
              e.preventDefault();
            }
          }}
          className={cn(
            // mobile: bottom sheet
            "fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-card p-4 text-card-foreground shadow-xl",
            // desktop: centered dialog
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            // animations
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
            className
          )}
        >
          {title ? (
            <DialogPrimitive.Title className="mb-3 pr-8 text-lg font-bold text-foreground">
              {title}
            </DialogPrimitive.Title>
          ) : (
            <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
          )}
          {children}
          <DialogPrimitive.Close
            className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
