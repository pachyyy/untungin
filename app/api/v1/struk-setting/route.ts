import { requireDevice } from "@/lib/api/auth";
import { fromGuardFailure, jsonOk } from "@/lib/api/respond";
import { getStrukSetting } from "@/lib/services/struk";

/** Receipt customization (store name, logo, payment info, …) so the app can
 * render the same struk the web does. Read-only here — it's edited from the
 * web's Settings → Edit Struk. Any enrolled device: nothing in it is
 * cost/profit data. */
export async function GET(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  return jsonOk(await getStrukSetting());
}
