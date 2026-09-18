"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkPassword,
  sessionToken,
} from "@/lib/auth";

export type LoginState = { error?: string };

// Fixed delay applied to every login attempt, success or failure alike, so a
// scripted guesser can't use response time to tell which passwords are
// "closer" and can't speed past ~2.5 attempts/sec by hammering the endpoint.
const LOGIN_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  const [ok] = await Promise.all([
    Promise.resolve(checkPassword(password)),
    delay(LOGIN_DELAY_MS),
  ]);

  if (!ok) {
    return { error: "Password salah. Coba lagi." };
  }

  const token = await sessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
