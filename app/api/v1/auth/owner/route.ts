import { loginOwner } from "@/lib/services/devices";
import { fromServiceResult, jsonError, readJsonBody } from "@/lib/api/respond";

/** The owner's phone authenticates with APP_PASSWORD — the same shared
 * secret the web login uses, turned into a revocable per-device session. */
export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body || typeof body !== "object") {
    return jsonError("Body permintaan tidak valid.", 400);
  }
  const { password, nama } = body as Record<string, unknown>;
  if (typeof password !== "string") {
    return jsonError("Password wajib diisi.", 400);
  }

  const result = await loginOwner({
    password,
    nama: typeof nama === "string" ? nama : "",
  });
  return fromServiceResult(result, 201);
}
