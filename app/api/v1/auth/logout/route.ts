import { requireDevice } from "@/lib/api/auth";
import { logoutDevice } from "@/lib/services/devices";
import { fromGuardFailure, fromServiceResult } from "@/lib/api/respond";

/** Logs the calling device out by revoking it outright — there's no user
 * session underneath a Device to end other than the device itself. */
export async function POST(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const result = await logoutDevice(guard.device.id);
  return fromServiceResult(result);
}
