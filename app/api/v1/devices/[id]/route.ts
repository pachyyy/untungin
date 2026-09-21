import { requireDevice } from "@/lib/api/auth";
import { revokeDevice } from "@/lib/services/devices";
import { fromGuardFailure, fromServiceResult } from "@/lib/api/respond";

/** Owner revokes a device (lost phone, staff departure, etc). Immediate:
 * the next request from that device fails at requireDevice()'s revokedAt
 * check, regardless of how much life its 15-minute access token has left. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await revokeDevice(id);
  return fromServiceResult(result);
}
