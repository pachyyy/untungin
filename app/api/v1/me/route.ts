import { requireDevice } from "@/lib/api/auth";
import { fromGuardFailure, jsonOk } from "@/lib/api/respond";

/** Who am I — the device's own identity, for the app to know its role
 * (show/hide owner-only screens) and confirm its session is still valid. */
export async function GET(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  return jsonOk({
    id: guard.device.id,
    nama: guard.device.nama,
    role: guard.device.role,
  });
}
