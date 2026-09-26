import { toBlob } from "html-to-image";

/**
 * Captures a rendered <Struk> node as a PNG. pixelRatio 3 keeps text crisp
 * after WhatsApp's recompression. skipFonts: the struk uses a system
 * monospace stack, so there's nothing to embed — and embedding would make
 * html-to-image fetch every webfont the app page loaded.
 */
export async function renderStrukPng(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    skipFonts: true,
    cacheBust: true,
  });
  if (!blob) throw new Error("Gagal membuat gambar struk.");
  return blob;
}

/**
 * Opens the OS share sheet (WhatsApp, Telegram, Gallery, …) with the PNG
 * attached when the browser can share files — Chrome on Android, Safari on
 * iOS — and falls back to a plain download everywhere else (desktop).
 * Returns what actually happened so the caller can word its toast.
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      // User closed the share sheet — not an error worth surfacing.
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      throw e;
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
