"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MODE_COOKIE, type Mode } from "@/lib/mode";

const MODE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year — this is a UI preference, not a session

export async function setMode(formData: FormData): Promise<void> {
  const mode: Mode = String(formData.get("mode") ?? "jual") === "uang" ? "uang" : "jual";
  const store = await cookies();
  store.set(MODE_COOKIE, mode, {
    sameSite: "lax",
    path: "/",
    maxAge: MODE_MAX_AGE,
  });
  redirect(mode === "uang" ? "/uang" : "/dashboard");
}
