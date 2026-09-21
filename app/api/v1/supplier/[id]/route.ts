import { requireDevice } from "@/lib/api/auth";
import { updateSupplier, deleteSupplier } from "@/lib/services/supplier";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateSupplierWrite, revalidateSupplierDelete } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { nama, kontak } = body as Record<string, unknown>;

  const result = await updateSupplier({
    id,
    nama: typeof nama === "string" ? nama : "",
    kontak: typeof kontak === "string" ? kontak : "",
  });
  if (result.ok) revalidateSupplierWrite();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await deleteSupplier(id);
  if (result.ok) revalidateSupplierDelete();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}
