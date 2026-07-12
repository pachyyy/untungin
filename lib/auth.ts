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

/** Constant-time-ish comparison of a candidate cookie value against the token. */
export async function isValidSession(
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await sessionToken();
  if (cookieValue.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= cookieValue.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Check a submitted password against APP_PASSWORD. */
export function checkPassword(candidate: string): boolean {
  const password = process.env.APP_PASSWORD ?? "";
  return password.length > 0 && candidate === password;
}
