"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brutal-interactive text-display flex h-[48px] w-full items-center justify-center rounded-[14px] border border-panel-border bg-gradient-to-br from-glass-accent to-glass-accent2 text-[15px] font-bold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "Memeriksa…" : "Masuk"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="text-display mb-1.5 block text-sm font-medium text-glass-ink-dim"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoFocus
            autoComplete="current-password"
            placeholder="Masukkan password"
            required
            className={cn(
              "h-[48px] w-full rounded-[14px] border border-panel-border bg-glass-input pl-3.5 pr-12 text-[15px] text-glass-ink outline-none transition placeholder:text-glass-ink-faint",
              "focus-visible:border-glass-accent focus-visible:ring-2 focus-visible:ring-glass-accent/25"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[14px] text-glass-ink-faint transition-colors hover:text-glass-ink"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {state.error && (
        <p className="rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
