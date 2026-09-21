/**
 * Common return shape for every service function in lib/services/*.
 *
 * Services are the one place business logic (validation, Prisma writes,
 * stock/status invariants) lives. They're called from two kinds of thin
 * callers: `lib/actions/*.ts` ("use server" functions, used by the web app's
 * forms) and, eventually, `app/api/v1/*` route handlers (used by the mobile
 * app). Neither caller re-implements logic — they only translate their own
 * transport (FormData vs. JSON body) into a service call, then translate the
 * ServiceResult back into their own response shape (ActionResult vs. a JSON
 * HTTP response with a status code).
 *
 * `status` is an HTTP status hint for the future API layer (400 for bad
 * input, 404 for missing records, 409 for conflicts like insufficient stock);
 * the web actions ignore it since ActionResult has no such concept.
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail(error: string, status?: number): ServiceResult<never> {
  return { ok: false, error, status };
}

/** Actor performing a mutation. Currently unused (no Device model exists
 * yet), but every mutating service accepts it now so nothing needs a
 * signature change when the mobile API's device auth lands (see CLAUDE.md
 * "Mobile client" — `createdByDeviceId` is planned for Pesanan/Pembayaran).
 * `null` means "the web app" (single shared login, no per-user identity). */
export type Actor = { deviceId: string | null };

export const WEB_ACTOR: Actor = { deviceId: null };
