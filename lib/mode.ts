import { cookies } from "next/headers";

export const MODE_COOKIE = "untungin_mode";
export type Mode = "jual" | "uang";

/** Read the active app mode server-side (defaults to "jual" if unset). */
export async function getMode(): Promise<Mode> {
  const store = await cookies();
  return store.get(MODE_COOKIE)?.value === "uang" ? "uang" : "jual";
}
