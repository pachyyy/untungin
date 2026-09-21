import { requireDevice } from "@/lib/api/auth";
import { tandaiLunas } from "@/lib/services/pembayaran";
import { fromGuardFailure, jsonError, jsonOk } from "@/lib/api/respond";
import { revalidatePembayaranPaths } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

/** Owner only — forces an order to Lunas even while underpaid (discount,
 * rounding, write-off); the resulting realized profit can go negative. */
export async function POST(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await tandaiLunas(id, { deviceId: guard.device.id });
  if (result.ok) revalidatePembayaranPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}
