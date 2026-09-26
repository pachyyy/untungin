import { forwardRef, type CSSProperties } from "react";
import { formatRupiah, formatNomorNota } from "@/lib/format";
import { totalPesanan } from "@/lib/calc";
import type { StrukSettingData, UkuranStruk } from "@/lib/services/struk";

export type StrukOrder = {
  nomor: number;
  tanggal: string;
  namaCustomer: string;
  status: string;
  items: { nama: string; keterangan: string | null; jumlah: number; hargaSaat: number }[];
  pakets: {
    nama: string;
    keterangan: string | null;
    harga: number;
    komponen: { nama: string; pcs: number }[];
  }[];
};

// Fixed dimensions in CSS px — the PNG is captured at 3x (lib/struk-image.ts).
// 80mm is a thermal-roll-style strip that grows with the order; A5 keeps the
// 148:210 page ratio as a minimum height and grows past it for long orders
// rather than cutting anything off.
const SIZE: Record<UkuranStruk, { width: number; minHeight?: number; pad: number; font: number }> = {
  "80mm": { width: 400, pad: 22, font: 14 },
  a5: { width: 560, minHeight: Math.round((560 * 210) / 148), pad: 40, font: 15 },
};

// Always black on white, regardless of the app's theme — this is a picture of
// a paper receipt, and it must look the same on whatever screen receives it.
const INK = "#111111";
const DIM = "#555555";
const FONT =
  'ui-monospace, "SF Mono", Menlo, Consolas, "Roboto Mono", "Courier New", monospace';

const divider: CSSProperties = { borderTop: `1.5px dashed ${INK}`, margin: "12px 0" };
const row: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12 };
const multiline: CSSProperties = { whiteSpace: "pre-line", wordBreak: "break-word" };

/**
 * The receipt image. Pure presentation with inline styles only (no Tailwind
 * theme tokens) so html-to-image captures exactly what's rendered. Shared by
 * the Cetak Struk modal and the live preview in Settings → Edit Struk.
 */
export const Struk = forwardRef<
  HTMLDivElement,
  { setting: StrukSettingData; order: StrukOrder; ukuran: UkuranStruk }
>(function Struk({ setting, order, ukuran }, ref) {
  const size = SIZE[ukuran];
  const small = size.font - 2;
  const lunas = order.status === "lunas";
  const kontak = [setting.noWa ? `WA ${setting.noWa}` : null, setting.sosmed]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      ref={ref}
      style={{
        width: size.width,
        minHeight: size.minHeight,
        padding: size.pad,
        boxSizing: "border-box",
        background: "#ffffff",
        color: INK,
        fontFamily: FONT,
        fontSize: size.font,
        lineHeight: 1.45,
      }}
    >
      <div style={{ textAlign: "center" }}>
        {setting.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- data: URL, captured by html-to-image
          <img
            src={setting.logo}
            alt=""
            style={{ maxWidth: 120, maxHeight: 80, margin: "0 auto 8px", display: "block" }}
          />
        )}
        <div style={{ fontSize: size.font + 6, fontWeight: 800, letterSpacing: 0.5 }}>
          {setting.namaToko}
        </div>
        {setting.tagline && <div style={{ color: DIM, fontSize: small }}>{setting.tagline}</div>}
        {setting.alamat && (
          <div style={{ ...multiline, fontSize: small, marginTop: 4 }}>{setting.alamat}</div>
        )}
        {kontak && <div style={{ fontSize: small }}>{kontak}</div>}
      </div>

      <div style={divider} />

      <div style={{ fontSize: small }}>
        <div style={row}>
          <span>No</span>
          <span style={{ fontWeight: 700 }}>{formatNomorNota(setting.prefixNota, order.nomor)}</span>
        </div>
        <div style={row}>
          <span>Tanggal</span>
          <span>{order.tanggal}</span>
        </div>
        <div style={row}>
          <span>Pelanggan</span>
          <span style={{ textAlign: "right", wordBreak: "break-word" }}>{order.namaCustomer}</span>
        </div>
      </div>

      <div style={divider} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {order.items.map((it, i) => (
          <div key={`i${i}`}>
            <div style={{ fontWeight: 700, wordBreak: "break-word" }}>{it.nama}</div>
            {it.keterangan && (
              <div style={{ ...multiline, color: DIM, fontSize: small }}>{it.keterangan}</div>
            )}
            <div style={row}>
              <span>
                {it.jumlah} x {formatRupiah(it.hargaSaat)}
              </span>
              <span>{formatRupiah(it.jumlah * it.hargaSaat)}</span>
            </div>
          </div>
        ))}
        {order.pakets.map((pk, i) => (
          <div key={`p${i}`}>
            <div style={{ fontWeight: 700, wordBreak: "break-word" }}>{pk.nama}</div>
            {pk.keterangan && (
              <div style={{ ...multiline, color: DIM, fontSize: small }}>{pk.keterangan}</div>
            )}
            {setting.tampilkanKomponenPaket &&
              pk.komponen.map((k, j) => (
                <div key={j} style={{ color: DIM, fontSize: small, paddingLeft: 10 }}>
                  - {k.nama} x{k.pcs}
                </div>
              ))}
            <div style={row}>
              <span>1 paket</span>
              <span>{formatRupiah(pk.harga)}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={divider} />

      <div style={{ ...row, fontSize: size.font + 3, fontWeight: 800 }}>
        <span>TOTAL</span>
        <span>{formatRupiah(totalPesanan(order))}</span>
      </div>

      {setting.tampilkanStempel && (
        <div style={{ textAlign: "center", margin: "18px 0 6px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 16px",
              border: `3px solid ${lunas ? "#15803d" : "#b91c1c"}`,
              borderRadius: 6,
              color: lunas ? "#15803d" : "#b91c1c",
              fontSize: size.font + 6,
              fontWeight: 900,
              letterSpacing: 3,
              transform: "rotate(-5deg)",
            }}
          >
            {lunas ? "LUNAS" : "BELUM LUNAS"}
          </span>
        </div>
      )}

      {setting.infoPembayaran && (
        <>
          <div style={divider} />
          <div style={{ fontSize: small }}>
            <div style={{ fontWeight: 700 }}>Pembayaran</div>
            <div style={multiline}>{setting.infoPembayaran}</div>
          </div>
        </>
      )}

      {setting.footer && (
        <>
          <div style={divider} />
          <div style={{ ...multiline, textAlign: "center", fontSize: small }}>{setting.footer}</div>
        </>
      )}
    </div>
  );
});
