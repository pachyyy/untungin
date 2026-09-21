import { requireDevice } from "@/lib/api/auth";
import { listProduk, createProduk } from "@/lib/services/produk";
import { serializeProduk } from "@/lib/api/serialize";
import { fromGuardFailure, jsonError, jsonOk, readJsonBody } from "@/lib/api/respond";
import { revalidateProdukWrite } from "@/lib/services/revalidate";

export async function GET(req: Request) {
  const guard = await requireDevice(req);
  if (!guard.ok) return fromGuardFailure(guard);

  const result = await listProduk();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data.map((p) => serializeProduk(p, guard.device.role)));
}

/** Owner only — staff see stock and can sell against it (via pesanan), but
 * adding/editing the catalog and its cost prices is not routine staff work. */
export async function POST(req: Request) {
  const guard = await requireDevice(req, { role: "owner" });
  if (!guard.ok) return fromGuardFailure(guard);

  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { nama, hargaModal, stok, supplierId, supplierNama, supplierKontak } =
    body as Record<string, unknown>;

  const result = await createProduk({
    nama: typeof nama === "string" ? nama : "",
    hargaModal,
    stok,
    supplierId: typeof supplierId === "string" ? supplierId : "",
    supplierNama: typeof supplierNama === "string" ? supplierNama : undefined,
    supplierKontak: typeof supplierKontak === "string" ? supplierKontak : undefined,
  });
  if (result.ok) revalidateProdukWrite();
  if (!result.ok) return jsonError(result.error, result.status ?? 400);
  return jsonOk(result.data, 201);
}
