import { BackgroundMesh } from "@/components/ui/BackgroundMesh";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Masuk · Untungin" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <BackgroundMesh />
      <div className="glass-panel-strong glass-shadow-lg w-full max-w-[400px] rounded-[28px] px-8 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-gradient-to-br from-glass-accent to-glass-accent2 text-2xl font-black text-white">
            U
          </div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-glass-ink">
            Untungin
          </h1>
          <p className="mt-1.5 text-sm text-glass-ink-dim">
            Masuk untuk kelola produk, pesanan, dan laporan untungmu.
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-glass-ink-faint">
          Sesi berlaku 7 hari di perangkat ini.
        </p>
      </div>
    </main>
  );
}
