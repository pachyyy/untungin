import { requireDevice } from "@/lib/api/auth";
import { getPesananById, updatePesanan, deletePesanan } from "@/lib/services/pesanan";
import { serializePesanan } from "@/lib/api/serialize";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidatePesananPaths } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await getPesananById(id);
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(serializePesanan(result.data, guard.device.role));
}

/** Staff can edit an order, including its prices — attribution is only
 * recorded at creation (createdByDeviceId), not per edit; see
 * CLAUDE.md "Mobile client" for why that's an accepted gap for now. */
export async function PATCH(req: Request, { params }: Params) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { namaCustomer, noHp, items, pakets } = body as Record<string, unknown>;

  const result = await updatePesanan({
    id,
    namaCustomer: typeof namaCustomer === "string" ? namaCustomer : "",
    noHp: typeof noHp === "string" ? noHp : "",
    items,
    pakets,
  });
  if (result.ok) revalidatePesananPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}

/** Owner only — deleting an order returns its stock and cannot be undone. */
export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await deletePesanan(id);
  if (result.ok) revalidatePesananPaths();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}
