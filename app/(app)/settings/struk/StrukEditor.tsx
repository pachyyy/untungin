"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { StrukPreview } from "@/components/struk/StrukPreview";
import type { StrukOrder } from "@/components/struk/Struk";
import type { StrukSettingData, UkuranStruk } from "@/lib/services/struk";
import { updateStrukSettingAction } from "@/lib/actions/struk";
import { cn } from "@/lib/utils";

// Sample order for the live preview — exercises every section of the struk
// (plain item with a note, dropship-style item, paket with components).
const SAMPLE_ORDER: StrukOrder = {
  nomor: 42,
  tanggal: "26 Sep 2026",
  namaCustomer: "Budi Santoso",
  status: "belum_bayar",
  items: [
    { nama: "Kaos Polos Premium", keterangan: "Warna hitam, size L", jumlah: 2, hargaSaat: 75000 },
    { nama: "Topi Baseball", keterangan: null, jumlah: 1, hargaSaat: 45000 },
  ],
  pakets: [
    {
      nama: "Paket Hemat Duo",
      keterangan: "Bungkus kado",
      harga: 120000,
      komponen: [
        { nama: "Kaos Polos Premium", pcs: 1 },
        { nama: "Totebag Kanvas", pcs: 1 },
      ],
    },
  ],
};

const LOGO_MAX_PX = 300;
// Keep the stored data URL comfortably under the server's cap
// (lib/services/struk.ts LOGO_MAX_CHARS).
const LOGO_TARGET_CHARS = 150_000;

/** Downscale a picked image to <= LOGO_MAX_PX on its longest side. Tries PNG
 * first (keeps transparency); if that's still too large — typical for a
 * photo — re-encodes as JPEG on a white background. */
async function resizeLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
      el.src = url;
    });
    const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    if (png.length <= LOGO_TARGET_CHARS) return png;

    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL("image/jpeg", 0.85);
    if (jpeg.length <= LOGO_TARGET_CHARS) return jpeg;
    throw new Error("Logo terlalu besar, coba gambar yang lebih sederhana.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const textareaClass =
  "flex min-h-[76px] w-full rounded-[12px] border border-panel-border bg-glass-input px-3 py-2 text-[15px] text-glass-ink outline-none transition placeholder:text-glass-ink-faint focus-visible:border-glass-accent focus-visible:ring-2 focus-visible:ring-glass-accent/25";

export function StrukEditor({ initial }: { initial: StrukSettingData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [s, setS] = useState<StrukSettingData>(initial);
  const [previewUkuran, setPreviewUkuran] = useState<UkuranStruk>(initial.ukuranDefault);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof StrukSettingData>(key: K, value: StrukSettingData[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }
  // Text fields are edited as strings; an empty optional field previews as absent.
  function setText(key: keyof StrukSettingData, value: string) {
    setS((prev) => ({ ...prev, [key]: value === "" ? null : value }));
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      set("logo", await resizeLogo(file));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal memuat logo.");
    }
  }

  function handleSave() {
    setError(undefined);
    const fd = new FormData();
    fd.set("namaToko", s.namaToko);
    fd.set("logo", s.logo ?? "");
    fd.set("tagline", s.tagline ?? "");
    fd.set("alamat", s.alamat ?? "");
    fd.set("noWa", s.noWa ?? "");
    fd.set("sosmed", s.sosmed ?? "");
    fd.set("infoPembayaran", s.infoPembayaran ?? "");
    fd.set("footer", s.footer ?? "");
    fd.set("prefixNota", s.prefixNota);
    fd.set("ukuranDefault", s.ukuranDefault);
    fd.set("tampilkanStempel", s.tampilkanStempel ? "1" : "0");
    fd.set("tampilkanKomponenPaket", s.tampilkanKomponenPaket ? "1" : "0");
    startTransition(async () => {
      const res = await updateStrukSettingAction(fd);
      if (res.ok) {
        toast("Pengaturan struk disimpan.");
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="glass-panel space-y-4 rounded-[20px] p-5">
        <Section title="Identitas toko">
          <Field label="Nama toko" htmlFor="namaToko">
            <Input
              id="namaToko"
              maxLength={100}
              value={s.namaToko}
              onChange={(e) => set("namaToko", e.target.value)}
            />
          </Field>

          <div>
            <Label>Logo (opsional)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-panel-border bg-white">
                {s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data: URL preview
                  <img src={s.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-neutral-400" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  {s.logo ? "Ganti logo" : "Pilih gambar"}
                </Button>
                {s.logo && (
                  <Button type="button" variant="danger" size="sm" onClick={() => set("logo", null)}>
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogo}
              />
            </div>
          </div>

          <Field label="Tagline (opsional)" htmlFor="tagline">
            <Input
              id="tagline"
              maxLength={100}
              placeholder="cth: Fashion murah berkualitas"
              value={s.tagline ?? ""}
              onChange={(e) => setText("tagline", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Kontak">
          <Field label="Alamat (opsional)" htmlFor="alamat">
            <textarea
              id="alamat"
              maxLength={500}
              className={textareaClass}
              value={s.alamat ?? ""}
              onChange={(e) => setText("alamat", e.target.value)}
            />
          </Field>
          <Field label="No. WhatsApp (opsional)" htmlFor="noWa">
            <Input
              id="noWa"
              inputMode="tel"
              maxLength={100}
              placeholder="08xxxxxxxxxx"
              value={s.noWa ?? ""}
              onChange={(e) => setText("noWa", e.target.value)}
            />
          </Field>
          <Field label="Media sosial (opsional)" htmlFor="sosmed">
            <Input
              id="sosmed"
              maxLength={100}
              placeholder="cth: IG @tokoku"
              value={s.sosmed ?? ""}
              onChange={(e) => setText("sosmed", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Pembayaran & catatan">
          <Field label="Info pembayaran (opsional)" htmlFor="infoPembayaran">
            <textarea
              id="infoPembayaran"
              maxLength={500}
              className={textareaClass}
              placeholder={"cth: BCA 1234567890 a.n. Budi\nDANA 08xxxxxxxxxx"}
              value={s.infoPembayaran ?? ""}
              onChange={(e) => setText("infoPembayaran", e.target.value)}
            />
          </Field>
          <Field label="Catatan bawah (opsional)" htmlFor="footer">
            <textarea
              id="footer"
              maxLength={500}
              className={textareaClass}
              placeholder={"cth: Terima kasih sudah berbelanja!\nBarang yang sudah dibeli tidak dapat ditukar."}
              value={s.footer ?? ""}
              onChange={(e) => setText("footer", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Format">
          <Field label="Awalan nomor nota" htmlFor="prefixNota">
            <Input
              id="prefixNota"
              maxLength={12}
              placeholder="INV-"
              value={s.prefixNota}
              onChange={(e) => set("prefixNota", e.target.value)}
            />
          </Field>
          <div>
            <Label>Ukuran default</Label>
            <UkuranSwitch
              value={s.ukuranDefault}
              onChange={(v) => {
                set("ukuranDefault", v);
                setPreviewUkuran(v);
              }}
            />
          </div>
          <Toggle
            label="Tampilkan stempel LUNAS / BELUM LUNAS"
            checked={s.tampilkanStempel}
            onChange={(v) => set("tampilkanStempel", v)}
          />
          <Toggle
            label="Tampilkan isi paket"
            checked={s.tampilkanKomponenPaket}
            onChange={(v) => set("tampilkanKomponenPaket", v)}
          />
        </Section>

        {error && (
          <p className="rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
            {error}
          </p>
        )}

        <Button type="button" className="w-full" disabled={pending} onClick={handleSave}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>

      <div className="glass-panel space-y-3 rounded-[20px] p-5 lg:sticky lg:top-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-display font-bold text-glass-ink">Pratinjau</h2>
          <span className="text-xs text-glass-ink-faint">Contoh pesanan</span>
        </div>
        <UkuranSwitch value={previewUkuran} onChange={setPreviewUkuran} />
        <div className="rounded-[12px] bg-panel p-2">
          <StrukPreview setting={s} order={SAMPLE_ORDER} ukuran={previewUkuran} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-display text-xs font-semibold uppercase tracking-wide text-glass-ink-faint">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function UkuranSwitch({
  value,
  onChange,
}: {
  value: UkuranStruk;
  onChange: (v: UkuranStruk) => void;
}) {
  const options: { value: UkuranStruk; label: string }[] = [
    { value: "80mm", label: "Struk 80mm" },
    { value: "a5", label: "Nota A5" },
  ];
  return (
    <div className="flex gap-1 rounded-[10px] bg-panel-strong p-0.5 text-xs font-semibold">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-[8px] py-1.5 transition-colors",
            value === o.value ? "bg-panel text-glass-ink" : "text-glass-ink-faint"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-panel-strong px-3 py-2.5 text-left text-sm text-glass-ink"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-glass-accent" : "bg-glass-ink-faint/40"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}
