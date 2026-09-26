"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { StrukPreview } from "@/components/struk/StrukPreview";
import type { StrukOrder } from "@/components/struk/Struk";
import type { StrukSettingData, UkuranStruk } from "@/lib/services/struk";
import { formatNomorNota } from "@/lib/format";
import { renderStrukPng, shareOrDownload, downloadBlob } from "@/lib/struk-image";
import { cn } from "@/lib/utils";

const UKURAN: { value: UkuranStruk; label: string }[] = [
  { value: "80mm", label: "Struk 80mm" },
  { value: "a5", label: "Nota A5" },
];

export function StrukModal({
  order,
  setting,
  onClose,
}: {
  order: StrukOrder | null;
  setting: StrukSettingData;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [ukuran, setUkuran] = useState<UkuranStruk>(setting.ukuranDefault);
  const strukRef = useRef<HTMLDivElement | null>(null);
  // The PNG is rendered ahead of time, not on tap: iOS Safari only allows
  // navigator.share() within a short window after the user's tap, and an
  // html-to-image render can take longer than that on a slow phone.
  const [blob, setBlob] = useState<Blob | null>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    setBlob(null);
    setRenderError(false);
    // The dialog content is portaled and mounts a render or two after
    // `order` is set — wait (up to ~1s of frames) for the struk node to exist
    // and be laid out before capturing it.
    let raf = 0;
    let tries = 0;
    const tryRender = () => {
      const node = strukRef.current;
      if (!node || node.offsetWidth === 0) {
        if (++tries < 60) raf = requestAnimationFrame(tryRender);
        else setRenderError(true);
        return;
      }
      renderStrukPng(node)
        .then((b) => !cancelled && setBlob(b))
        .catch(() => !cancelled && setRenderError(true));
    };
    raf = requestAnimationFrame(tryRender);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [order, ukuran, setting]);

  const filename = order ? `${formatNomorNota(setting.prefixNota, order.nomor)}.png` : "struk.png";

  async function handleShare() {
    if (!blob) return;
    try {
      const res = await shareOrDownload(blob, filename);
      if (res === "downloaded") toast("Struk diunduh.");
    } catch {
      toast("Gagal membagikan struk.");
    }
  }

  return (
    <Modal open={!!order} onClose={onClose} title="Cetak Struk" className="sm:max-w-lg">
      {order && (
        <div className="space-y-3">
          <div className="flex gap-1 rounded-[10px] bg-panel-strong p-0.5 text-xs font-semibold">
            {UKURAN.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUkuran(u.value)}
                className={cn(
                  "flex-1 rounded-[8px] py-1.5 transition-colors",
                  ukuran === u.value ? "bg-panel text-glass-ink" : "text-glass-ink-faint"
                )}
              >
                {u.label}
              </button>
            ))}
          </div>

          <div className="max-h-[55vh] overflow-y-auto rounded-[12px] bg-panel p-2">
            <StrukPreview ref={strukRef} setting={setting} order={order} ukuran={ukuran} />
          </div>

          {renderError && (
            <p className="rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
              Gagal membuat gambar struk. Coba tutup dan buka lagi.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={!blob}
              onClick={() => blob && downloadBlob(blob, filename)}
            >
              <Download className="h-4 w-4" />
              Unduh
            </Button>
            <Button type="button" className="flex-1" disabled={!blob} onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              {blob ? "Bagikan" : "Menyiapkan…"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
