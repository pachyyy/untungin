import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getStrukSetting } from "@/lib/services/struk";
import { StrukEditor } from "./StrukEditor";

export const metadata = { title: "Edit Struk · Untungin" };
export const dynamic = "force-dynamic";

export default async function EditStrukPage() {
  const setting = await getStrukSetting();

  return (
    <div className="space-y-3">
      <Link
        href="/settings"
        className="flex items-center gap-1 text-sm font-semibold text-glass-accent"
      >
        <ChevronLeft className="h-4 w-4" />
        Pengaturan
      </Link>
      <StrukEditor initial={setting} />
    </div>
  );
}
