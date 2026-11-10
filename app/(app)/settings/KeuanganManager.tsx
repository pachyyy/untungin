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
import {
  setSaldoAction,
  tarikSaldoAction,
  transferKasAction,
  pindahKantongAction,
  setKantongAction,
} from "@/lib/actions/kas";

type Kas = {
  aktif: boolean;
  modal: number;
  saldo: number;
  kantongAktif: boolean;
  rekening: number;
  tunai: number;
};
type Dialog = "atur" | "tarik" | "transfer" | "cocokkan" | "pindah" | null;
type Kantong = "rekening" | "tunai";

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

  const totalKantong = kas.rekening + kas.tunai;
  const totalAkun = kas.modal + kas.saldo;
  const selisih = totalKantong - totalAkun;

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

          <div className="space-y-2 border-t border-glass-divider pt-3">
            <div>
              <p className="text-display text-xs font-semibold uppercase tracking-wide text-glass-ink-faint">
                Posisi uang
              </p>
              <p className="text-xs text-glass-ink-dim">
                Modal dan saldo keuntungan itu fungsinya; Rekening dan Tunai itu letak uangnya.
              </p>
            </div>

            {kas.kantongAktif ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Balance label="Rekening" value={kas.rekening} />
                  <Balance label="Tunai" value={kas.tunai} />
                </div>
                <p
                  className={cn(
                    "rounded-[12px] px-3 py-2 text-xs",
                    selisih === 0
                      ? "bg-glass-success/10 text-glass-success"
                      : "bg-glass-warning/10 text-glass-warning"
                  )}
                >
                  {selisih === 0
                    ? "Rekening + Tunai sama dengan Modal + Saldo Keuntungan."
                    : `Rekening + Tunai ${formatRupiah(totalKantong)} · Modal + Saldo ${formatRupiah(
                        totalAkun
                      )} · selisih ${selisih > 0 ? "+" : "−"}${formatRupiah(Math.abs(selisih))}`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDialog("cocokkan")}>
                    Cocokkan
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDialog("pindah")}>
                    Setor / Tarik tunai
                  </Button>
                </div>
              </>
            ) : (
              <KantongAwalForm onDone={done} />
            )}
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link href="/settings/kas">Riwayat mutasi</Link>
          </Button>
        </>
      ) : (
        <SaldoAwalForm onDone={done} />
      )}

      <AturModal key={`${kas.modal}:${kas.saldo}`} open={dialog === "atur"} kas={kas} onClose={() => setDialog(null)} onDone={done} />
      <TarikModal open={dialog === "tarik"} kantongAktif={kas.kantongAktif} onClose={() => setDialog(null)} onDone={done} />
      <TransferModal open={dialog === "transfer"} onClose={() => setDialog(null)} onDone={done} />
      <CocokkanModal key={`c${kas.rekening}:${kas.tunai}`} open={dialog === "cocokkan"} kas={kas} onClose={() => setDialog(null)} onDone={done} />
      <PindahModal open={dialog === "pindah"} onClose={() => setDialog(null)} onDone={done} />
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

/** Two-way chip choice, used for the pocket and the direction pickers. */
function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 rounded-[12px] border px-3 py-2.5 text-sm font-semibold transition-colors",
            value === v
              ? "border-glass-accent bg-glass-accent/10 text-glass-accent"
              : "border-panel-border bg-panel text-glass-ink-dim"
          )}
        >
          {label}
        </button>
      ))}
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

/** First-time setup of Rekening / Tunai: the balances the pockets start from. */
function KantongAwalForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [rekening, setRekening] = useState("");
  const [tunai, setTunai] = useState("");
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("rekening", rekening || "0");
    fd.set("tunai", tunai || "0");
    startTransition(async () => {
      const res = await setKantongAction(fd);
      if (res.ok) {
        toast("Saldo rekening dan tunai disimpan.");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-3 rounded-[14px] bg-panel-strong p-3">
      <p className="text-sm text-glass-ink-dim">
        Isi saldo rekening jualan dan tunai jualan kamu sekarang. Mulai dari sini, setiap
        pembayaran, belanja stok, dan penarikan dicatat masuk atau keluar dari salah satunya.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="kw-rekening">Rekening</Label>
          <Input
            id="kw-rekening"
            inputMode="numeric"
            placeholder="0"
            value={rekening}
            onChange={(e) => setRekening(cleanInt(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="kw-tunai">Tunai</Label>
          <Input
            id="kw-tunai"
            inputMode="numeric"
            placeholder="0"
            value={tunai}
            onChange={(e) => setTunai(cleanInt(e.target.value))}
          />
        </div>
      </div>
      {error && <p className="text-sm text-glass-danger">{error}</p>}
      <Button className="w-full" onClick={submit} disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
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
          Ini tidak mengubah saldo Rekening dan Tunai.
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

/** Reconcile the pockets with the real bank balance and cash on hand. */
function CocokkanModal({
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
  const [rekening, setRekening] = useState(String(kas.rekening));
  const [tunai, setTunai] = useState(String(kas.tunai));
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("rekening", rekening);
    fd.set("tunai", tunai);
    startTransition(async () => {
      const res = await setKantongAction(fd);
      if (res.ok) {
        toast("Saldo rekening dan tunai dicocokkan.");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Cocokkan Rekening & Tunai">
      <div className="space-y-3">
        <p className="text-sm text-glass-ink-dim">
          Isi saldo rekening jualan dan tunai jualan yang sebenarnya sekarang. Selisihnya dicatat
          sebagai penyesuaian di riwayat; Modal dan Saldo Keuntungan tidak berubah.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="c-rekening">Rekening</Label>
            <Input id="c-rekening" inputMode="numeric" value={rekening} onChange={(e) => setRekening(cleanInt(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="c-tunai">Tunai</Label>
            <Input id="c-tunai" inputMode="numeric" value={tunai} onChange={(e) => setTunai(cleanInt(e.target.value))} />
          </div>
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

function TarikModal({
  open,
  kantongAktif,
  onClose,
  onDone,
}: {
  open: boolean;
  kantongAktif: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [kantong, setKantong] = useState<Kantong>("rekening");
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("jumlah", jumlah);
    fd.set("catatan", catatan);
    // Without the pocket view set up there is nothing to take it out of, so
    // the pocket is left off rather than guessed.
    if (kantongAktif) fd.set("kantong", kantong);
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
        {kantongAktif && (
          <div>
            <Label>Diambil dari</Label>
            <Chips
              options={[
                ["rekening", "Rekening"],
                ["tunai", "Tunai"],
              ] as const}
              value={kantong}
              onChange={setKantong}
            />
          </div>
        )}
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
        <Chips
          options={[
            ["saldo_ke_modal", "Saldo → Modal"],
            ["modal_ke_saldo", "Modal → Saldo"],
          ] as const}
          value={arah}
          onChange={setArah}
        />
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

/** Cash moved between Rekening and Tunai — modal and saldo stay as they are. */
function PindahModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [jumlah, setJumlah] = useState("");
  const [arah, setArah] = useState<"rekening_ke_tunai" | "tunai_ke_rekening">("rekening_ke_tunai");
  const { toast } = useToast();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("jumlah", jumlah);
    fd.set("arah", arah);
    startTransition(async () => {
      const res = await pindahKantongAction(fd);
      if (res.ok) {
        toast(arah === "rekening_ke_tunai" ? "Tarik tunai dicatat." : "Setor tunai dicatat.");
        setJumlah("");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Setor / Tarik tunai">
      <div className="space-y-3">
        <Chips
          options={[
            ["rekening_ke_tunai", "Tarik tunai"],
            ["tunai_ke_rekening", "Setor tunai"],
          ] as const}
          value={arah}
          onChange={setArah}
        />
        <p className="text-sm text-glass-ink-dim">
          {arah === "rekening_ke_tunai"
            ? "Uang pindah dari Rekening ke Tunai (tarik di ATM)."
            : "Uang pindah dari Tunai ke Rekening (setor tunai)."}{" "}
          Modal dan Saldo Keuntungan tidak berubah.
        </p>
        <div>
          <Label htmlFor="p-jumlah">Jumlah</Label>
          <Input id="p-jumlah" inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/[^0-9]/g, ""))} />
        </div>
        {error && <p className="text-sm text-glass-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" onClick={submit} disabled={pending}>
            {pending ? "Memproses…" : "Simpan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
