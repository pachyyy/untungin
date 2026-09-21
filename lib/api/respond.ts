import { NextResponse } from "next/server";
import type { ServiceResult } from "@/lib/services/types";
import type { RequireDeviceResult } from "@/lib/api/auth";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

/** Maps a ServiceResult straight to a Response — services already carry an
 * Indonesian error message and, for failures, an HTTP status hint
 * (lib/services/types.ts). `successStatus` lets a route ask for e.g. 201 on
 * create; everything else defaults to 200. */
export function fromServiceResult<T>(
  result: ServiceResult<T>,
  successStatus = 200
): NextResponse {
  if (result.ok) return jsonOk(result.data, successStatus);
  return jsonError(result.error, result.status ?? 400);
}

/** requireDevice()'s failure branch, turned into the same Response shape.
 * Call at the top of every protected route:
 *   const guard = await requireDevice(req, { role: "owner" });
 *   if (!guard.ok) return fromGuardFailure(guard);
 */
export function fromGuardFailure(
  guard: Extract<RequireDeviceResult, { ok: false }>
): NextResponse {
  return jsonError(guard.error, guard.status);
}

/** Parses a request body as JSON, returning null on any failure (empty
 * body, malformed JSON, wrong content-type) rather than throwing — routes
 * treat null as "bad request" with their own message, matching how the web
 * actions already treat malformed FormData input as "no data" rather than
 * an error. */
export async function readJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
