import { prisma } from "@/lib/prisma";
import { ok, fail, type ServiceResult } from "@/lib/services/types";

/**
 * Receipt ("Cetak Struk") customization — a single StrukSetting row with id
 * "default". Plain-serializable (no Date) so a Server Component can pass it
 * straight to a client component, and the API can return it as-is.
 */
export type UkuranStruk = "80mm" | "a5";

export type StrukSettingData = {
  namaToko: string;
  logo: string | null;
  tagline: string | null;
  alamat: string | null;
  noWa: string | null;
  sosmed: string | null;
  infoPembayaran: string | null;
  footer: string | null;
  prefixNota: string;
  ukuranDefault: UkuranStruk;
  tampilkanStempel: boolean;
  tampilkanKomponenPaket: boolean;
};

const SETTING_ID = "default";

// A logo is resized client-side to <=300px before upload (StrukEditor), which
// lands well under this; the cap only stops a hand-crafted oversized request
// from bloating the one row every struk render reads.
const LOGO_MAX_CHARS = 200_000;

const SHORT_MAX = 100;
const LONG_MAX = 500;

function toData(row: {
  namaToko: string;
  logo: string | null;
  tagline: string | null;
  alamat: string | null;
  noWa: string | null;
  sosmed: string | null;
  infoPembayaran: string | null;
  footer: string | null;
  prefixNota: string;
  ukuranDefault: string;
  tampilkanStempel: boolean;
  tampilkanKomponenPaket: boolean;
}): StrukSettingData {
  return {
    namaToko: row.namaToko,
    logo: row.logo,
    tagline: row.tagline,
    alamat: row.alamat,
    noWa: row.noWa,
    sosmed: row.sosmed,
    infoPembayaran: row.infoPembayaran,
    footer: row.footer,
    prefixNota: row.prefixNota,
    ukuranDefault: row.ukuranDefault === "a5" ? "a5" : "80mm",
    tampilkanStempel: row.tampilkanStempel,
    tampilkanKomponenPaket: row.tampilkanKomponenPaket,
  };
}

// Mirrors the @default values on the StrukSetting model — used until the
// owner saves Edit Struk for the first time (the row is created by that
// save, not by a read: the pesanan page reads this on every load).
const DEFAULT_SETTING: StrukSettingData = {
  namaToko: "Untungin",
  logo: null,
  tagline: null,
  alamat: null,
  noWa: null,
  sosmed: null,
  infoPembayaran: null,
  footer: null,
  prefixNota: "INV-",
  ukuranDefault: "80mm",
  tampilkanStempel: true,
  tampilkanKomponenPaket: true,
};

export async function getStrukSetting(): Promise<StrukSettingData> {
  const row = await prisma.strukSetting.findUnique({ where: { id: SETTING_ID } });
  return row ? toData(row) : DEFAULT_SETTING;
}

export type UpdateStrukSettingInput = {
  namaToko: string;
  logo: string | null;
  tagline: string;
  alamat: string;
  noWa: string;
  sosmed: string;
  infoPembayaran: string;
  footer: string;
  prefixNota: string;
  ukuranDefault: string;
  tampilkanStempel: boolean;
  tampilkanKomponenPaket: boolean;
};

export async function updateStrukSetting(
  input: UpdateStrukSettingInput
): Promise<ServiceResult<StrukSettingData>> {
  const namaToko = input.namaToko.trim();
  if (!namaToko) return fail("Nama toko wajib diisi.");
  if (namaToko.length > SHORT_MAX) return fail(`Nama toko maksimal ${SHORT_MAX} karakter.`);

  const logo = input.logo || null;
  if (logo) {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(logo))
      return fail("Format logo tidak valid.");
    if (logo.length > LOGO_MAX_CHARS) return fail("Ukuran logo terlalu besar.");
  }

  const short = (v: string) => v.trim().slice(0, SHORT_MAX) || null;
  const long = (v: string) => v.trim().slice(0, LONG_MAX) || null;
  const prefixNota = input.prefixNota.trim().slice(0, 12);

  const data = {
    namaToko,
    logo,
    tagline: short(input.tagline),
    alamat: long(input.alamat),
    noWa: short(input.noWa),
    sosmed: short(input.sosmed),
    infoPembayaran: long(input.infoPembayaran),
    footer: long(input.footer),
    prefixNota,
    ukuranDefault: input.ukuranDefault === "a5" ? "a5" : "80mm",
    tampilkanStempel: input.tampilkanStempel,
    tampilkanKomponenPaket: input.tampilkanKomponenPaket,
  };

  const row = await prisma.strukSetting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, ...data },
    update: data,
  });
  return ok(toData(row));
}
