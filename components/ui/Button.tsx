import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "brutal-interactive text-display inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glass-accent/40 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border border-panel-border bg-gradient-to-br from-glass-accent to-glass-accent2 text-white hover:brightness-105",
        success:
          "border border-panel-border bg-glass-success/15 text-glass-success hover:bg-glass-success/25",
        outline:
          "border border-panel-border bg-panel text-glass-ink hover:bg-panel-strong",
        ghost: "text-glass-accent hover:bg-glass-accent/10",
        danger:
          "border border-panel-border bg-glass-danger/15 text-glass-danger hover:bg-glass-danger/25",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-[15px]",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
