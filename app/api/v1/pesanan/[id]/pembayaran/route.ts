import { requireDevice } from "@/lib/api/auth";
import { tambahPembayaran } from "@/lib/services/pembayaran";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidatePembayaranPaths } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

/** Staff can record payments — recording money received is routine
 * day-to-day work; removing one (DELETE .../pembayaran/[pid]) is owner-only
 * because it can downgrade a paid order's status. */
export async function POST(req: Request, { params }: Params) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const { id: pesananId } = await params;
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { tanggal, metode, jumlah, jenis } = body as Record<string, unknown>;

  const result = await tambahPembayaran(
    {
      pesananId,
      tanggal: typeof tanggal === "string" ? tanggal : "",
      metode: typeof metode === "string" ? metode : "",
      jumlah,
      jenis: typeof jenis === "string" ? jenis : "cicilan",
    },
    { deviceId: guard.device.id }
  );
  if (result.ok) revalidatePembayaranPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data, 201);
}
