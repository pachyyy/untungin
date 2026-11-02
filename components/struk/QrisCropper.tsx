"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const VIEW = 280; // CSS px of the square crop window
const OUT_MAX = 512; // exported side length; never upscaled past the source
const MAX_ZOOM = 4;
// Keep the stored data URL comfortably under the server's cap
// (lib/services/struk.ts QRIS_MAX_CHARS).
const TARGET_CHARS = 250_000;

type Loaded = { el: HTMLImageElement; url: string; w: number; h: number };

/**
 * Drag-and-zoom 1:1 crop for the QRIS image. A QR code must stay square or
 * scanners fail, so the window is fixed at 1:1 and the exported image is
 * always square — the owner only chooses which part of the picture (e.g. a
 * m-banking screenshot with text around the code) ends up in it.
 */
export function QrisCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File | null;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const [img, setImg] = useState<Loaded | null>(null);
  const [error, setError] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image top-left inside the window
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setImg(null);
    setError(undefined);
    setZoom(1);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      const base = VIEW / Math.min(el.naturalWidth, el.naturalHeight);
      // Start centred, fully covering the window.
      setPos({
        x: (VIEW - el.naturalWidth * base) / 2,
        y: (VIEW - el.naturalHeight * base) / 2,
      });
      setImg({ el, url, w: el.naturalWidth, h: el.naturalHeight });
    };
    el.onerror = () => setError("Gambar tidak bisa dibaca.");
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const base = img ? VIEW / Math.min(img.w, img.h) : 1;
  const scale = base * zoom;

  // The image must always cover the whole window, so no blank edge can end up
  // inside the exported square.
  function clamp(x: number, y: number, s: number) {
    if (!img) return { x, y };
    return {
      x: Math.min(0, Math.max(VIEW - img.w * s, x)),
      y: Math.min(0, Math.max(VIEW - img.h * s, y)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    setPos(clamp(d.x + e.clientX - d.px, d.y + e.clientY - d.py, scale));
  }
  function onPointerUp() {
    drag.current = null;
  }

  function changeZoom(next: number) {
    if (!img) return;
    // Zoom around the window centre so the framed area stays put.
    const nextScale = base * next;
    const cx = (VIEW / 2 - pos.x) / scale;
    const cy = (VIEW / 2 - pos.y) / scale;
    setZoom(next);
    setPos(clamp(VIEW / 2 - cx * nextScale, VIEW / 2 - cy * nextScale, nextScale));
  }

  function handleUse() {
    if (!img) return;
    const sx = -pos.x / scale;
    const sy = -pos.y / scale;
    const sw = VIEW / scale;
    const out = Math.max(1, Math.min(OUT_MAX, Math.round(sw)));
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    // QRs are black on white; a transparent source would otherwise print dark.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.el, sx, sy, sw, sw, 0, 0, out, out);
    const png = canvas.toDataURL("image/png");
    if (png.length <= TARGET_CHARS) return onDone(png);
    const jpeg = canvas.toDataURL("image/jpeg", 0.92);
    if (jpeg.length <= TARGET_CHARS) return onDone(jpeg);
    setError("Gambar terlalu besar, coba zoom ke area QR saja.");
  }

  return (
    <Modal open={file !== null} onClose={onCancel} title="Potong gambar QRIS (1:1)">
      <div className="space-y-4">
        <p className="text-sm text-glass-ink-faint">
          Geser dan zoom sampai kode QR memenuhi kotak. Hasilnya selalu persegi (1:1).
        </p>

        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-[12px] border border-panel-border bg-white"
          style={{ width: VIEW, height: VIEW, cursor: img ? "grab" : "default" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL, local crop preview
            <img
              src={img.url}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: img.w * scale,
                height: img.h * scale,
                maxWidth: "none",
              }}
            />
          )}
        </div>

        <div className="mx-auto flex items-center gap-3" style={{ width: VIEW }}>
          <span className="text-xs text-glass-ink-faint">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!img}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
        </div>

        {error && (
          <p className="rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Batal
          </Button>
          <Button type="button" className="flex-1" disabled={!img} onClick={handleUse}>
            Pakai
          </Button>
        </div>
      </div>
    </Modal>
  );
}
