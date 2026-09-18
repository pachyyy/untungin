// Edge-safe auth helpers. Uses Web Crypto (available in both the Edge middleware
// runtime and the Node.js server-action runtime) so the same token is produced
// everywhere. Single-user app: the session cookie holds SHA-256(APP_PASSWORD).

export const SESSION_COOKIE = "untungin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The expected session token derived from the configured password. */
export async function sessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  return sha256Hex("untungin:" + password);
}

/**
 * Constant-time string comparison: walks the full length of the longer
 * string regardless of where (or whether) a mismatch occurs, so neither a
 * length difference nor an early differing byte shortens the comparison —
 * that timing difference is exactly what would otherwise leak information to
 * a scripted guesser. Used for both the session cookie and the raw password.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Constant-time comparison of a candidate cookie value against the token. */
export async function isValidSession(
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await sessionToken();
  return timingSafeEqual(cookieValue, expected);
}

/** Check a submitted password against APP_PASSWORD (constant-time). */
export function checkPassword(candidate: string): boolean {
  const password = process.env.APP_PASSWORD ?? "";
  if (password.length === 0) return false;
  return timingSafeEqual(candidate, password);
}
