/**
 * Parse a digits-only form value (strips anything non-numeric first, so a
 * value like "Rp 15.000" still parses). Returns null when absent, malformed,
 * or below `min` — callers treat null as "invalid" and surface their own
 * Indonesian error message.
 *
 * `value` is `unknown` (not just `FormDataEntryValue | null`) so the same
 * function works for a JSON API body's numbers/strings, not only web
 * FormData — `String(value)` handles both the same way a form's string input
 * always did.
 */
export function parseIntField(
  value: unknown,
  { min = 1 }: { min?: number } = {}
): number | null {
  const n = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n < min) return null;
  return Math.floor(n);
}
