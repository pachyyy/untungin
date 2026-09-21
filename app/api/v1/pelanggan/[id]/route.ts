import { requireDevice } from "@/lib/api/auth";
import { updateCustomer, deleteCustomer } from "@/lib/services/customer";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateCustomerWrite, revalidateCustomerDelete } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

/** Staff can edit a customer's details (phone number, notes) — this is
 * routine bookkeeping, unlike deleting one outright. */
export async function PATCH(req: Request, { params }: Params) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { nama, noHp, catatan } = body as Record<string, unknown>;

  const result = await updateCustomer({
    id,
    nama: typeof nama === "string" ? nama : "",
    noHp: typeof noHp === "string" ? noHp : "",
    catatan: typeof catatan === "string" ? catatan : "",
  });
  if (result.ok) revalidateCustomerWrite();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await deleteCustomer(id);
  if (result.ok) revalidateCustomerDelete();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}
