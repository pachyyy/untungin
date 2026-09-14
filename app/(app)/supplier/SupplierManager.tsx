"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions/supplier";

type SupplierProduk = {
  id: string;
  nama: string;
  stok: number;
  hargaModal: number;
};

type SupplierRow = {
  id: string;
  nama: string;
  kontak: string | null;
  jumlahProduk: number;
  produk: SupplierProduk[];
};

export function SupplierManager({ suppliers }: { suppliers: SupplierRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<SupplierRow | null>(null);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        (s.kontak ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, query]);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;

  function selectRow(id: string) {
    router.replace(`${pathname}?id=${id}`, { scroll: false });
  }
  function clearSelection() {
    router.replace(pathname, { scroll: false });
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(s: SupplierRow) {
    setEditing(s);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-152px)] lg:flex-row">
      <div
        className={cn(
          "glass-panel flex-col rounded-[20px] lg:flex lg:w-[340px] lg:shrink-0",
          selected ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nama atau kontak…"
            className="flex-1"
          />
          <button
            onClick={openAdd}
            aria-label="Tambah supplier"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-glass-accent to-glass-accent2 text-white"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3 lg:min-h-0">
          {shown.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-glass-ink-faint">
              {suppliers.length === 0
                ? "Belum ada supplier."
                : "Tidak ada supplier yang cocok."}
            </p>
          ) : (
            shown.map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => selectRow(s.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[14px] border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-panel-border bg-panel-strong"
                      : "border-transparent hover:bg-panel"
                  )}
                >
                  <span className="min-w-0 truncate text-[14px] font-bold text-glass-ink">
                    {s.nama}
                  </span>
                  <span className="shrink-0 text-xs text-glass-ink-dim">
                    {s.jumlahProduk} produk
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div
        className={cn(
          "glass-panel flex-1 rounded-[20px]",
          selected ? "flex flex-col" : "hidden lg:flex lg:items-center lg:justify-center"
        )}
      >
        {selected ? (
          <div className="flex-1 space-y-5 overflow-y-auto p-5 lg:min-h-0">
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 text-sm font-semibold text-glass-accent lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
              Semua supplier
            </button>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-[22px] font-extrabold text-glass-ink">{selected.nama}</h2>
              {selected.kontak && (
                <a
                  href={`https://wa.me/${selected.kontak.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-glass-success/15 px-3.5 py-1.5 text-sm font-semibold text-glass-success"
                >
                  <MessageCircle className="h-4 w-4" />
                  Hubungi WA
                </a>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-glass-ink-faint">
                Produk dari supplier ini ({selected.produk.length})
              </p>
              {selected.produk.length === 0 ? (
                <p className="rounded-[14px] bg-panel-strong px-3 py-4 text-center text-sm text-glass-ink-dim">
                  Belum ada produk.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selected.produk.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-[12px] bg-panel px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-glass-ink">
                        {p.nama}
                      </span>
                      <span className="shrink-0 text-glass-ink-dim">
                        {p.stok} stok · {formatRupiah(p.hargaModal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" onClick={() => openEdit(selected)}>
                Edit Supplier
              </Button>
              <Button variant="danger" onClick={() => setConfirmDel(selected)}>
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <p className="p-5 text-sm text-glass-ink-faint">Pilih supplier untuk melihat detail.</p>
        )}
      </div>

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
          if (confirmDel?.id === selectedId) clearSelection();
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
          <p className="rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
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
      <p className="text-sm text-glass-ink-dim">
        Yakin ingin menghapus{" "}
        <span className="font-semibold text-glass-ink">{row?.nama}</span>?
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
