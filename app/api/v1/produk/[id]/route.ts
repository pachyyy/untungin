import { requireDevice } from "@/lib/api/auth";
import { updateProduk, deleteProduk } from "@/lib/services/produk";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateProdukWrite, revalidateProdukDelete } from "@/lib/services/revalidate";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { nama, hargaModal, stok, supplierId, supplierNama, supplierKontak } =
    body as Record<string, unknown>;

  const result = await updateProduk({
    id,
    nama: typeof nama === "string" ? nama : "",
    hargaModal,
    stok,
    supplierId: typeof supplierId === "string" ? supplierId : "",
    supplierNama: typeof supplierNama === "string" ? supplierNama : undefined,
    supplierKontak: typeof supplierKontak === "string" ? supplierKontak : undefined,
  });
  if (result.ok) revalidateProdukWrite();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}

export async function DELETE(req: Request, { params }: Params) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const { id } = await params;
  const result = await deleteProduk(id);
  if (result.ok) revalidateProdukDelete();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data);
}
