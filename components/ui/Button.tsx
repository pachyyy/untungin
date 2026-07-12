import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "success" | "outline" | "ghost" | "danger";
type Size = "md" | "sm" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark",
  success: "bg-success text-white hover:brightness-95 active:brightness-90",
  outline:
    "border border-slate-300 bg-white text-ink hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-primary hover:bg-primary/10 active:bg-primary/20",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
