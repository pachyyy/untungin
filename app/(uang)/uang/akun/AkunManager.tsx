"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  createAkun,
  updateAkun,
  toggleAkunAktif,
  deleteAkun,
  createGrupAkun,
} from "@/lib/actions/akun";

type GrupRow = { id: string; nama: string; aktif: boolean };
type AkunRow = {
  id: string;
  nama: string;
  grupId: string;
  catatan: string | null;
  aktif: boolean;
  saldo: number;
};

export function AkunManager({ grup, akun }: { grup: GrupRow[]; akun: AkunRow[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [grupFormOpen, setGrupFormOpen] = useState(false);
  const [editing, setEditing] = useState<AkunRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<AkunRow | null>(null);

  const byGrup = useMemo(() => {
    const map = new Map<string, AkunRow[]>();
    for (const a of akun) {
      const arr = map.get(a.grupId) ?? [];
      arr.push(a);
      map.set(a.grupId, arr);
    }
    return grup
      .filter((g) => g.aktif || (map.get(g.id)?.length ?? 0) > 0)
      .map((g) => ({ grup: g, akun: map.get(g.id) ?? [] }));
  }, [grup, akun]);

  const totalSaldo = akun.reduce((s, a) => s + a.saldo, 0);

  return (
    <div className="p-4">
      <Card className="mb-4 bg-primary text-white">
        <p className="text-sm/none opacity-90">Total saldo</p>
        <p className="mt-2 text-3xl font-black">{formatRupiah(totalSaldo)}</p>
      </Card>

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setGrupFormOpen(true)}
          className="text-sm font-semibold text-primary"
        >
          + Grup akun
        </button>
      </div>

      <div className="space-y-4">
        {byGrup.map(({ grup: g, akun: rows }) => {
          const subtotal = rows.reduce((s, a) => s + a.saldo, 0);
          return (
            <div key={g.id}>
              <div className="mb-1.5 flex items-center justify-between px-1">
                <p
                  className={cn(
                    "text-xs font-semibold text-muted-foreground",
                    !g.aktif && "line-through opacity-60"
                  )}
                >
                  {g.nama}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {formatRupiah(subtotal)}
                </p>
              </div>
              <div className="space-y-1.5">
                {rows.length === 0 && (
                  <Card className="p-3 text-center text-xs text-muted-foreground">
                    Belum ada akun di grup ini.
                  </Card>
                )}
                {rows.map((a) => (
                  <Card
                    key={a.id}
                    className={cn(
                      "flex items-center justify-between gap-2 p-3",
                      !a.aktif && "opacity-50"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.nama}</p>
                      {a.catatan && (
                        <p className="truncate text-xs text-muted-foreground">{a.catatan}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatRupiah(a.saldo)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(a);
                          setFormOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                        aria-label="Edit akun"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95"
        aria-label="Tambah akun"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <AkunFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        editing={editing}
        grup={grup}
        onClose={() => setFormOpen(false)}
        onDelete={
          editing
            ? () => {
                setFormOpen(false);
                setConfirmDel(editing);
              }
            : undefined
        }
        onDone={() => {
          setFormOpen(false);
          router.refresh();
        }}
      />

      <GrupFormModal
        open={grupFormOpen}
        onClose={() => setGrupFormOpen(false)}
        onDone={() => {
          setGrupFormOpen(false);
          router.refresh();
        }}
      />

      <DeleteModal
        row={confirmDel}
        onClose={() => setConfirmDel(null)}
        onDone={() => {
          setConfirmDel(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function AkunFormModal({
  open,
  editing,
  grup,
  onClose,
  onDelete,
  onDone,
}: {
  open: boolean;
  editing: AkunRow | null;
  grup: GrupRow[];
  onClose: () => void;
  onDelete?: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [nama, setNama] = useState(editing?.nama ?? "");
  const [grupId, setGrupId] = useState(editing?.grupId ?? grup[0]?.id ?? "");
  const [catatan, setCatatan] = useState(editing?.catatan ?? "");
  const [aktif, setAktif] = useState(editing?.aktif ?? true);
  const [error, setError] = useState<string>();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("nama", nama);
    fd.set("grupId", grupId);
    fd.set("catatan", catatan);
    startTransition(async () => {
      const res = editing ? await updateAkun(fd) : await createAkun(fd);
      if (!res.ok) return setError(res.error);
      if (editing && aktif !== editing.aktif) {
        const fd2 = new FormData();
        fd2.set("id", editing.id);
        fd2.set("aktif", String(aktif));
        await toggleAkunAktif(fd2);
      }
      onDone();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Akun" : "Akun Baru"}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nama akun</Label>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Cash" />
        </div>
        <div>
          <Label className="text-xs">Grup</Label>
          <Select value={grupId} onValueChange={setGrupId}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Pilih grup" />
            </SelectTrigger>
            <SelectContent>
              {grup.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Catatan (opsional)</Label>
          <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
            Aktif (nonaktifkan untuk menyembunyikan dari pilihan baru)
          </label>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" className="flex-1" disabled={pending} onClick={submit}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-lg py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Hapus akun
          </button>
        )}
      </div>
    </Modal>
  );
}

function GrupFormModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [nama, setNama] = useState("");
  const [error, setError] = useState<string>();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    fd.set("nama", nama);
    startTransition(async () => {
      const res = await createGrupAkun(fd);
      if (res.ok) {
        setNama("");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Grup Akun Baru">
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nama grup</Label>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Tabungan" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" className="flex-1" disabled={pending} onClick={submit}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal({
  row,
  onClose,
  onDone,
}: {
  row: AkunRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!row) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      const res = await deleteAkun(fd);
      if (res.ok) onDone();
      else alert(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus akun?">
      <p className="text-sm text-muted-foreground">
        Yakin ingin menghapus akun <span className="font-semibold text-foreground">{row?.nama}</span>?
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Batal
        </Button>
        <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={pending}>
          {pending ? "Menghapus…" : "Hapus"}
        </Button>
      </div>
    </Modal>
  );
}
