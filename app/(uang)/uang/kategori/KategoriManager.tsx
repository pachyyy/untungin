"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  createKategori,
  updateKategori,
  toggleKategoriAktif,
  deleteKategori,
} from "@/lib/actions/kategori";

type KategoriRow = {
  id: string;
  nama: string;
  jenis: string;
  parentId: string | null;
  aktif: boolean;
};

const TABS = [
  { value: "masuk", label: "Pemasukan" },
  { value: "keluar", label: "Pengeluaran" },
] as const;

export function KategoriManager({ kategori }: { kategori: KategoriRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"masuk" | "keluar">("keluar");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KategoriRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<KategoriRow | null>(null);

  const shown = useMemo(() => {
    const inTab = kategori.filter((k) => k.jenis === tab);
    const roots = inTab.filter((k) => !k.parentId);
    const byParent = new Map<string, KategoriRow[]>();
    for (const k of inTab) {
      if (!k.parentId) continue;
      const arr = byParent.get(k.parentId) ?? [];
      arr.push(k);
      byParent.set(k.parentId, arr);
    }
    return roots.map((r) => ({ root: r, anak: byParent.get(r.id) ?? [] }));
  }, [kategori, tab]);

  return (
    <div className="p-4">
      <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition",
              tab === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">Belum ada kategori.</Card>
      ) : (
        <div className="space-y-1.5">
          {shown.map(({ root, anak }) => (
            <div key={root.id}>
              <Card
                className={cn(
                  "flex items-center justify-between gap-2 p-3",
                  !root.aktif && "opacity-50"
                )}
              >
                <span className="truncate text-sm font-medium text-foreground">{root.nama}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(root);
                    setFormOpen(true);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  aria-label="Edit kategori"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </Card>
              {anak.length > 0 && (
                <div className="ml-4 mt-1 space-y-1.5 border-l border-border pl-3">
                  {anak.map((a) => (
                    <Card
                      key={a.id}
                      className={cn(
                        "flex items-center justify-between gap-2 p-2.5",
                        !a.aktif && "opacity-50"
                      )}
                    >
                      <span className="truncate text-sm text-foreground">{a.nama}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(a);
                          setFormOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                        aria-label="Edit kategori"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95"
        aria-label="Tambah kategori"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <KategoriFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        editing={editing}
        defaultJenis={tab}
        options={kategori.filter((k) => k.jenis === tab && !k.parentId && k.id !== editing?.id)}
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

function KategoriFormModal({
  open,
  editing,
  defaultJenis,
  options,
  onClose,
  onDelete,
  onDone,
}: {
  open: boolean;
  editing: KategoriRow | null;
  defaultJenis: "masuk" | "keluar";
  options: KategoriRow[];
  onClose: () => void;
  onDelete?: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [nama, setNama] = useState(editing?.nama ?? "");
  const [parentId, setParentId] = useState(editing?.parentId ?? "");
  const [aktif, setAktif] = useState(editing?.aktif ?? true);
  const [error, setError] = useState<string>();

  function submit() {
    setError(undefined);
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("nama", nama);
    fd.set("jenis", editing?.jenis ?? defaultJenis);
    fd.set("parentId", parentId);
    startTransition(async () => {
      const res = editing ? await updateKategori(fd) : await createKategori(fd);
      if (!res.ok) return setError(res.error);
      if (editing && aktif !== editing.aktif) {
        const fd2 = new FormData();
        fd2.set("id", editing.id);
        fd2.set("aktif", String(aktif));
        await toggleKategoriAktif(fd2);
      }
      onDone();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Kategori" : "Kategori Baru"}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nama kategori</Label>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Induk (opsional)</Label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
          >
            <option value="">— Tanpa induk —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nama}
              </option>
            ))}
          </select>
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
            Aktif
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
            Hapus kategori
          </button>
        )}
      </div>
    </Modal>
  );
}

function DeleteModal({
  row,
  onClose,
  onDone,
}: {
  row: KategoriRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!row) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      const res = await deleteKategori(fd);
      if (res.ok) onDone();
      else alert(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus kategori?">
      <p className="text-sm text-muted-foreground">
        Yakin ingin menghapus kategori{" "}
        <span className="font-semibold text-foreground">{row?.nama}</span>?
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
