import { redirect } from "next/navigation";
import { getMode } from "@/lib/mode";

export default async function Home() {
  const mode = await getMode();
  redirect(mode === "uang" ? "/uang" : "/dashboard");
}
