import { requireDevice } from "@/lib/api/auth";
import { getDashboardData } from "@/lib/services/dashboard";
import { serializeDashboard } from "@/lib/api/serialize";
import { fromGuardFailure, jsonOk } from "@/lib/api/respond";

/** Both roles can see the dashboard; serializeDashboard strips the
 * financial figures (untung/omzet/nilaiStok) for staff, keeping only what's
 * operationally useful (pending orders, low stock). */
export async function GET(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const data = await getDashboardData();
  return jsonOk(serializeDashboard(data, guard.device.role));
}
