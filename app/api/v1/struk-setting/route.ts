import { requireDevice } from "@/lib/api/auth";
import { fromGuardFailure, fromServiceResult, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { getStrukSetting, updateStrukSetting, type StrukSettingData } from "@/lib/services/struk";
import { revalidateStrukWrite } from "@/lib/services/revalidate";

/** Receipt customization (store name, logo, payment info, …) so the app can
 * render the same struk the web does. Any enrolled device can read it:
 * nothing in it is cost/profit data. */
export async function GET(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  return jsonOk(await getStrukSetting());
}

/** Owner-only edit — the mobile counterpart of Settings → Edit Struk.
 *
 * A key missing from the body keeps its current value instead of being
 * cleared (or, for the toggles, switched off): updateStrukSetting always
 * writes every field, so without this merge an APK built before some future
 * setting existed would silently wipe it on every save — the same hazard
 * normalizeKeterangan guards against for pesanan lines. `logo: null` is an
 * explicit removal; an absent `logo` keeps the stored one. */
export async function PATCH(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const b = body as Record<string, unknown>;
  const current = await getStrukSetting();

  const str = (key: keyof StrukSettingData): string => {
    if (!(key in b)) return String(current[key] ?? "");
    return typeof b[key] === "string" ? (b[key] as string) : "";
  };
  const bool = (key: "tampilkanStempel" | "tampilkanKomponenPaket"): boolean =>
    key in b ? b[key] === true : current[key];

  const result = await updateStrukSetting({
    namaToko: str("namaToko"),
    logo: "logo" in b ? (typeof b.logo === "string" && b.logo ? b.logo : null) : current.logo,
    tagline: str("tagline"),
    alamat: str("alamat"),
    noWa: str("noWa"),
    sosmed: str("sosmed"),
    infoPembayaran: str("infoPembayaran"),
    footer: str("footer"),
    prefixNota: str("prefixNota"),
    ukuranDefault: str("ukuranDefault"),
    tampilkanStempel: bool("tampilkanStempel"),
    tampilkanKomponenPaket: bool("tampilkanKomponenPaket"),
  });
  if (result.ok) revalidateStrukWrite();
  return fromServiceResult(result);
}
