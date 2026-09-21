import { requireDevice } from "@/lib/api/auth";
import { listDevices } from "@/lib/services/devices";
import { serializeDevice } from "@/lib/api/serialize";
import { fromGuardFailure, jsonOk, jsonError } from "@/lib/api/respond";

/** The owner's device list (Settings → Perangkat, mirrored here for the
 * mobile app to show the same management screen). */
export async function GET(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const result = await listDevices();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data.map(serializeDevice));
}
