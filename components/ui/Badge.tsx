import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "text-display inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "badge-default bg-panel-strong text-glass-ink-dim",
        primary: "badge-primary bg-glass-accent/15 text-glass-accent",
        success: "badge-success bg-glass-success/15 text-glass-success",
        warning: "badge-warning bg-glass-warning/15 text-glass-warning",
        info: "badge-primary bg-glass-accent/15 text-glass-accent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
