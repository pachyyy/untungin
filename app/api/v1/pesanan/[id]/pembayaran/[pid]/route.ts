import { requireDevice } from "@/lib/api/auth";
import { hapusPembayaran } from "@/lib/services/pembayaran";
import { fromGuardFailure, jsonError, jsonOk } from "@/lib/api/respond";
import { revalidatePembayaranPaths } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string; pid: string }> };

/** Owner only — removing a payment can downgrade a paid order's status
 * (even all the way from a tandaiLunas write-off back to belum_bayar). */
export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id, pid } = await params;
  const result = await hapusPembayaran(pid, { deviceId: guard.device.id }, id);
  if (result.ok) revalidatePembayaranPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}
