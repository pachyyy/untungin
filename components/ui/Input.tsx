import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(fieldBase, "pr-8", className)} {...props} />
));
Select.displayName = "Select";
