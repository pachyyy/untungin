import { LoginForm } from "./LoginForm";

export const metadata = { title: "Masuk · Untungin" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white shadow-lg">
            U
          </div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            Untungin
          </h1>
          <p className="mt-1 text-sm text-muted">
            Kelola produk, pesanan, dan untungmu.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
