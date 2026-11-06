"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setSaldoAction, tarikSaldoAction, transferKasAction } from "@/lib/actions/kas";

type Kas = { aktif: boolean; modal: number; saldo: number };
type Dialog = "atur" | "tarik" | "transfer" | null;

/** Digits, with an optional leading minus (a balance can be negative). */
function cleanInt(v: string): string {
  const neg = v.trimStart().startsWith("-");
  return (neg ? "-" : "") + v.replace(/[^0-9]/g, "");
}

export function KeuanganManager({ kas }: { kas: Kas }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const done = () => {
    setDialog(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {kas.aktif ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Balance label="Modal" value={kas.modal} />
            <Balance label="Saldo Keuntungan" value={kas.saldo} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialog("atur")}>
              Atur
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog("tarik")}>
              Tarik
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialog("transfer")}>
              Transfer
            </Button>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/settings/kas">Riwayat mutasi</Link>
          </Button>
        </>
      ) : (
        <SaldoAwalForm onDone={done} />
      )}

      <AturModal key={`${kas.modal}:${kas.saldo}`} open={dialog === "atur"} kas={kas} onClose={() => setDialog(null)} onDone={done} />
      <TarikModal open={dialog === "tarik"} onClose={() => setDialog(null)} onDone={done} />
      <TransferModal open={dialog === "transfer"} onClose={() => setDialog(null)} onDone={done} />
    </div>
  );
}

function Balance({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-panel-strong px-3 py-2.5">
      <p className="text-xs text-glass-ink-dim">{label}</p>
      <p
        className={cn(
          "text-data text-[15px] font-extrabold",
          value < 0 ? "text-glass-danger" : "text-glass-ink"
        )}
      >
        {formatRupiah(value)}
      </p>
    </div>
  );
}

/** First-time setup: the moment the ledger starts counting. */
function SaldoAwalForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [modal, setModal] = useState("");
  const [saldo, setSaldo] = useState("");
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("modal", modal || "0");
    fd.set("saldo", saldo || "0");
    startTransition(async () => {
      const res = await setSaldoAction(fd);
      if (res.ok) {
        toast("Saldo awal disimpan.");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-3 rounded-[14px] bg-panel-strong p-3">
      <p className="text-sm text-glass-ink-dim">
        Isi uang yang kamu punya sekarang. Mulai dari sini, pembayaran, restock, dan produk baru
        otomatis dihitung. Transaksi sebelumnya tidak ikut dihitung.
      </p>
      <div>
        <Label htmlFor="k-modal">Modal (uang untuk belanja stok)</Label>
        <Input
          id="k-modal"
          inputMode="numeric"
          placeholder="0"
          value={modal}
          onChange={(e) => setModal(cleanInt(e.target.value))}
        />
      </div>
      <div>
        <Label htmlFor="k-saldo">Saldo keuntungan awal</Label>
        <Input
          id="k-saldo"
          inputMode="numeric"
          placeholder="0"
          value={saldo}
          onChange={(e) => setSaldo(cleanInt(e.target.value))}
        />
      </div>
      {error && <p className="text-sm text-glass-danger">{error}</p>}
      <Button className="w-full" onClick={submit} disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan saldo awal"}
      </Button>
    </div>
  );
}

function AturModal({
  open,
  kas,
  onClose,
  onDone,
}: {
  open: boolean;
  kas: Kas;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [modal, setModal] = useState(String(kas.modal));
  const [saldo, setSaldo] = useState(String(kas.saldo));
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("modal", modal);
    fd.set("saldo", saldo);
    startTransition(async () => {
      const res = await setSaldoAction(fd);
      if (res.ok) {
        toast("Saldo diperbarui.");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Atur saldo sekarang">
      <div className="space-y-3">
        <p className="text-sm text-glass-ink-dim">
          Isi saldo yang sebenarnya sekarang. Selisihnya dicatat sebagai penyesuaian di riwayat.
        </p>
        <div>
          <Label htmlFor="a-modal">Modal</Label>
          <Input id="a-modal" inputMode="numeric" value={modal} onChange={(e) => setModal(cleanInt(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="a-saldo">Saldo keuntungan</Label>
          <Input id="a-saldo" inputMode="numeric" value={saldo} onChange={(e) => setSaldo(cleanInt(e.target.value))} />
        </div>
        {error && <p className="text-sm text-glass-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TarikModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("jumlah", jumlah);
    fd.set("catatan", catatan);
    startTransition(async () => {
      const res = await tarikSaldoAction(fd);
      if (res.ok) {
        toast("Saldo keuntungan ditarik.");
        setJumlah("");
        setCatatan("");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Tarik saldo keuntungan">
      <div className="space-y-3">
        <div>
          <Label htmlFor="t-jumlah">Jumlah</Label>
          <Input id="t-jumlah" inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/[^0-9]/g, ""))} />
        </div>
        <div>
          <Label htmlFor="t-catatan">Catatan (opsional)</Label>
          <Input id="t-catatan" maxLength={100} placeholder="cth: Kebutuhan pribadi" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
        {error && <p className="text-sm text-glass-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Tarik"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TransferModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [jumlah, setJumlah] = useState("");
  const [arah, setArah] = useState<"saldo_ke_modal" | "modal_ke_saldo">("saldo_ke_modal");
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("jumlah", jumlah);
    fd.set("arah", arah);
    startTransition(async () => {
      const res = await transferKasAction(fd);
      if (res.ok) {
        toast("Transfer berhasil.");
        setJumlah("");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Transfer antar saldo">
      <div className="space-y-3">
        <div className="flex gap-2">
          {(
            [
              ["saldo_ke_modal", "Saldo → Modal"],
              ["modal_ke_saldo", "Modal → Saldo"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setArah(value)}
              className={cn(
                "flex-1 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition-colors",
                arah === value
                  ? "border-glass-accent bg-glass-accent/10 text-glass-accent"
                  : "border-panel-border bg-panel text-glass-ink-dim"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="x-jumlah">Jumlah</Label>
          <Input id="x-jumlah" inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/[^0-9]/g, ""))} />
        </div>
        {error && <p className="text-sm text-glass-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" onClick={submit} disabled={pending}>
            {pending ? "Memproses…" : "Transfer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
