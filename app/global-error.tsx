"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: only fires when the ROOT layout itself throws (e.g.
 * ThemeProvider/DesignModeProvider), which app/(app)/error.tsx can't catch
 * since it sits below that layout. Must render its own <html>/<body> and
 * can't safely assume globals.css or the design-mode CSS vars loaded, so
 * this stays plain inline styles rather than the usual glass-* classes.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "system-ui, sans-serif",
          background: "#05070d",
          color: "#f2f4f8",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Terjadi kesalahan</p>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>
            Maaf, aplikasi mengalami masalah saat memuat. Coba muat ulang halaman.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 20,
              width: "100%",
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#4f7cff",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
