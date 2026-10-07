import { requireDevice } from "@/lib/api/auth";
import { getLaporanData } from "@/lib/services/laporan";
import { serializeLaporan } from "@/lib/api/serialize";
import { monthStartJakarta, toDateOnlyJakarta, parseDateOnlyJakarta } from "@/lib/date";
import { fromGuardFailure, jsonOk } from "@/lib/api/respond";

/** Owner only. `from`/`to` default to a 6-month trailing window when
 * omitted. Orders fall in the range by the date they became lunas
 * (tanggalLunas in lib/services/laporan.ts), not createdAt — the same rule
 * as the web's month view, which uses getLaporanBulan instead. */
export async function GET(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const url = new URL(req.url);
  const now = new Date();
  const defaultFrom = monthStartJakarta(now, 5);
  const fromStr = url.searchParams.get("from") || toDateOnlyJakarta(defaultFrom);
  const toStr = url.searchParams.get("to") || toDateOnlyJakarta(now);

  const from = parseDateOnlyJakarta(fromStr, "start");
  const to = parseDateOnlyJakarta(toStr, "end");

  const data = await getLaporanData(from, to);
  return jsonOk(serializeLaporan(data));
}
