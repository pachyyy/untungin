"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Error boundary for every route inside the (app) group — catches a thrown
 * server action / render error while keeping the surrounding layout (Sidebar,
 * Topbar, BottomNav) mounted. Vercel's function region (sin1) is pinned to
 * Supabase's region for latency, but a Supabase hiccup still surfaces here as
 * a raw connection error (CLAUDE.md flags P1001 as a recurring one) — give
 * that case its own friendlier copy instead of a generic "something broke".
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isConnectivity =
    /P1001|P1002|P1008|P1017|can't reach database|connection/i.test(error.message);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm rounded-[20px] p-6 text-center">
        <p className="text-display text-lg font-bold text-glass-ink">
          {isConnectivity ? "Tidak bisa terhubung ke server" : "Terjadi kesalahan"}
        </p>
        <p className="mt-2 text-sm text-glass-ink-dim">
          {isConnectivity
            ? "Sepertinya koneksi ke server sedang bermasalah. Periksa internet kamu, lalu coba lagi."
            : "Maaf, ada yang tidak beres saat memuat halaman ini. Coba lagi ya."}
        </p>
        <Button className="mt-5 w-full" onClick={() => reset()}>
          Coba lagi
        </Button>
      </div>
    </div>
  );
}
