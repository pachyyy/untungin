"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions/supplier";

type SupplierRow = {
  id: string;
  nama: string;
  kontak: string | null;
  jumlahProduk: number;
};

export function SupplierManager({ suppliers }: { suppliers: SupplierRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<SupplierRow | null>(null);

  return (
    <div className="p-4">
      {suppliers.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          Belum ada supplier.
        </Card>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setEditing(s);
                  setFormOpen(true);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate font-semibold text-ink">{s.nama}</p>
                <p className="truncate text-sm text-muted">
                  {s.kontak || "Tanpa kontak"} · {s.jumlahProduk} produk
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {s.kontak && (
                  <a
                    href={`https://wa.me/${s.kontak.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                  >
                    WA
                  </a>
                )}
                <button
                  onClick={() => setConfirmDel(s)}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  Hapus
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95"
        aria-label="Tambah supplier"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <FormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
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

function FormModal({
  open,
  editing,
  onClose,
  onDone,
}: {
  open: boolean;
  editing: SupplierRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const res = editing
        ? await updateSupplier(formData)
        : await createSupplier(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Supplier" : "Tambah Supplier"}
    >
      <form action={handleSubmit} className="space-y-3">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div>
          <Label htmlFor="s-nama">Nama supplier</Label>
          <Input
            id="s-nama"
            name="nama"
            defaultValue={editing?.nama}
            placeholder="Contoh: Grosir Tanah Abang"
            required
          />
        </div>
        <div>
          <Label htmlFor="s-kontak">Kontak WA/telepon (opsional)</Label>
          <Input
            id="s-kontak"
            name="kontak"
            inputMode="tel"
            defaultValue={editing?.kontak ?? ""}
            placeholder="08xxxxxxxxxx"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({
  row,
  onClose,
  onDone,
}: {
  row: SupplierRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleDelete() {
    if (!row) return;
    setError(undefined);
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      const res = await deleteSupplier(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus supplier?">
      <p className="text-sm text-muted">
        Yakin ingin menghapus{" "}
        <span className="font-semibold text-ink">{row?.nama}</span>?
      </p>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Batal
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={handleDelete}
          disabled={pending}
        >
          {pending ? "Menghapus…" : "Hapus"}
        </Button>
      </div>
    </Modal>
  );
}
