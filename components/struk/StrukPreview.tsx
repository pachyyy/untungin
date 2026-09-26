"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Struk, type StrukOrder } from "@/components/struk/Struk";
import type { StrukSettingData, UkuranStruk } from "@/lib/services/struk";

/**
 * <Struk> scaled down to fit its container (a phone is narrower than the
 * 400/560px struk). Only the visual wrapper is scaled — the forwarded ref
 * points at the unscaled struk node itself, so capturing it still yields a
 * full-size PNG.
 */
export const StrukPreview = forwardRef<
  HTMLDivElement | null,
  { setting: StrukSettingData; order: StrukOrder; ukuran: UkuranStruk }
>(function StrukPreview(props, ref) {
  const boxRef = useRef<HTMLDivElement>(null);
  const strukRef = useRef<HTMLDivElement>(null);
  useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(ref, () => strukRef.current);
  const [dims, setDims] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const box = boxRef.current;
    const struk = strukRef.current;
    if (!box || !struk) return;
    const measure = () => {
      const scale = Math.min(1, box.clientWidth / struk.offsetWidth);
      setDims({ scale, height: struk.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(struk);
    return () => ro.disconnect();
  }, [props.ukuran]);

  return (
    <div ref={boxRef} className="w-full overflow-hidden" style={{ height: dims.height || undefined }}>
      <div
        className="mx-auto w-fit shadow-md ring-1 ring-black/10"
        style={{ transform: `scale(${dims.scale})`, transformOrigin: "top left" }}
      >
        <Struk ref={strukRef} {...props} />
      </div>
    </div>
  );
});
