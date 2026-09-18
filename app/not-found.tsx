import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm rounded-[20px] p-6 text-center">
        <p className="text-display text-lg font-bold text-glass-ink">Halaman tidak ditemukan</p>
        <p className="mt-2 text-sm text-glass-ink-dim">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/dashboard">Kembali ke Beranda</Link>
        </Button>
      </div>
    </div>
  );
}
