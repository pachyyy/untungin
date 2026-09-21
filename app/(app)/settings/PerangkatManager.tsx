"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Smartphone, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { generateEnrollCodeAction, revokeDeviceAction } from "@/lib/actions/devices";

type DeviceRow = {
  id: string;
  nama: string;
  role: string;
  lastSeenLabel: string | null;
  createdLabel: string;
  isRevoked: boolean;
};

export function PerangkatManager({ devices }: { devices: DeviceRow[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<DeviceRow | null>(null);

  const active = devices.filter((d) => !d.isRevoked);
  const revoked = devices.filter((d) => d.isRevoked);

  return (
    <div className="space-y-3">
      <Button variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4" />
        Tambah perangkat
      </Button>

      {active.length === 0 ? (
        <p className="rounded-[14px] bg-panel-strong px-3 py-4 text-center text-sm text-glass-ink-dim">
          Belum ada perangkat yang login.
        </p>
      ) : (
        <div className="space-y-2">
          {active.map((d) => (
            <DeviceItem key={d.id} device={d} onRevoke={() => setConfirmRevoke(d)} />
          ))}
        </div>
      )}

      {revoked.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-glass-ink-faint">
            {revoked.length} perangkat dicabut
          </summary>
          <div className="mt-2 space-y-2">
            {revoked.map((d) => (
              <DeviceItem key={d.id} device={d} onRevoke={undefined} />
            ))}
          </div>
        </details>
      )}

      <AddDeviceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <RevokeModal
        device={confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        onDone={() => {
          setConfirmRevoke(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function DeviceItem({
  device,
  onRevoke,
}: {
  device: DeviceRow;
  onRevoke: (() => void) | undefined;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-[14px] px-3 py-2.5",
        device.isRevoked ? "bg-panel opacity-60" : "bg-panel-strong"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-glass-accent/15 text-glass-accent">
          <Smartphone className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-bold text-glass-ink">{device.nama}</span>
            <Badge variant={device.role === "owner" ? "primary" : "default"}>
              {device.role === "owner" ? "Pemilik" : "Staf"}
            </Badge>
          </div>
          <p className="text-xs text-glass-ink-dim">
            {device.isRevoked
              ? "Akses dicabut"
              : device.lastSeenLabel
                ? `Terakhir aktif ${device.lastSeenLabel}`
                : `Belum pernah login sejak dibuat ${device.createdLabel}`}
          </p>
        </div>
      </div>
      {onRevoke && (
        <Button variant="danger" size="sm" onClick={onRevoke}>
          Cabut
        </Button>
      )}
    </div>
  );
}

function AddDeviceModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [role, setRole] = useState<"staff" | "owner">("staff");
  const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    formData.set("role", role);
    startTransition(async () => {
      const res = await generateEnrollCodeAction(formData);
      if (res.ok) setResult({ code: res.code, expiresAt: res.expiresAt });
      else setError(res.error);
    });
  }

  function handleClose() {
    setResult(null);
    setRole("staff");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={result ? "Kode Enrollment" : "Tambah Perangkat"}>
      {result ? (
        <EnrollCodeDisplay code={result.code} expiresAt={result.expiresAt} onDone={onDone} />
      ) : (
        <form action={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="d-nama">Nama perangkat</Label>
            <Input id="d-nama" name="nama" placeholder="Contoh: HP Rina" required />
          </div>
          <div>
            <Label>Peran</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("staff")}
                className={cn(
                  "brutal-interactive flex-1 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition-colors",
                  role === "staff"
                    ? "border-glass-accent bg-glass-accent/10 text-glass-accent"
                    : "border-panel-border bg-panel text-glass-ink-dim"
                )}
              >
                Staf
              </button>
              <button
                type="button"
                onClick={() => setRole("owner")}
                className={cn(
                  "brutal-interactive flex-1 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition-colors",
                  role === "owner"
                    ? "border-glass-accent bg-glass-accent/10 text-glass-accent"
                    : "border-panel-border bg-panel text-glass-ink-dim"
                )}
              >
                Pemilik
              </button>
            </div>
            <p className="mt-1.5 text-xs text-glass-ink-faint">
              Staf tidak bisa melihat harga modal, untung, atau menghapus data.
            </p>
          </div>
          {error && (
            <p className="rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Membuat…" : "Buat Kode"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function EnrollCodeDisplay({
  code,
  expiresAt,
  onDone,
}: {
  code: string;
  expiresAt: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = secondsLeft <= 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast("Kode disalin.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, non-HTTPS context) — the
      // code is still shown on screen, so this isn't a hard failure, just a
      // missed convenience.
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-glass-ink-dim">
        Masukkan kode ini di HP staf saat pertama kali membuka aplikasi Untungin. Kode ini hanya
        tampil sekali.
      </p>
      <div className="flex items-center justify-center gap-2 rounded-[16px] bg-panel-strong py-5">
        <span className="text-data text-[32px] font-extrabold tracking-[0.2em] text-glass-ink">
          {code}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Salin kode"
          className="brutal-interactive rounded-[10px] p-2 text-glass-ink-dim hover:bg-panel hover:text-glass-ink"
        >
          {copied ? <Check className="h-5 w-5 text-glass-success" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>
      <p
        className={cn(
          "text-data text-center text-sm font-semibold",
          expired ? "text-glass-danger" : "text-glass-ink-dim"
        )}
      >
        {expired ? "Kode sudah kedaluwarsa." : `Berlaku selama ${mm}:${ss}`}
      </p>
      <Button className="w-full" onClick={onDone}>
        Selesai
      </Button>
    </div>
  );
}

function RevokeModal({
  device,
  onClose,
  onDone,
}: {
  device: DeviceRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const { toast } = useToast();

  function handleRevoke() {
    if (!device) return;
    setError(undefined);
    const fd = new FormData();
    fd.set("id", device.id);
    startTransition(async () => {
      const res = await revokeDeviceAction(fd);
      if (res.ok) {
        toast("Akses perangkat berhasil dicabut.");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={!!device} onClose={onClose} title="Cabut akses perangkat?">
      <p className="text-sm text-glass-ink-dim">
        <span className="font-semibold text-glass-ink">{device?.nama}</span> tidak akan bisa
        membuka aplikasi lagi sampai login ulang dengan kode baru.
      </p>
      {error && (
        <p className="mt-3 rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Batal
        </Button>
        <Button variant="danger" className="flex-1" onClick={handleRevoke} disabled={pending}>
          {pending ? "Mencabut…" : "Cabut Akses"}
        </Button>
      </div>
    </Modal>
  );
}
