"use client";

import { useActionState } from "react";
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

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="text-display mb-1.5 block text-sm font-medium text-glass-ink-dim"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Masukkan password"
          required
          className={cn(
            "h-[48px] w-full rounded-[14px] border border-panel-border bg-glass-input px-3.5 text-[15px] text-glass-ink outline-none transition placeholder:text-glass-ink-faint",
            "focus-visible:border-glass-accent focus-visible:ring-2 focus-visible:ring-glass-accent/25"
          )}
        />
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
