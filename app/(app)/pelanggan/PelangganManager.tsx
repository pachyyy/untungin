"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah } from "@/lib/format";
import { totalPesanan, untungPesanan } from "@/lib/calc";
import { cn } from "@/lib/utils";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/actions/customer";

type PesananItemRow = {
  id: string;
  produkId: string | null;
  nama: string;
  jumlah: number;
  hargaSaat: number;
  modalSaat: number;
};
type PesananKomponenRow = {
  id: string;
  produkId: string;
  nama: string;
  pcs: number;
  modalSaat: number;
};
type PesananPaketRow = {
  id: string;
  nama: string;
  harga: number;
  komponen: PesananKomponenRow[];
};
type CustomerPesananRow = {
  id: string;
  status: string;
  tanggal: string;
  noHp: string | null;
  items: PesananItemRow[];
  pakets: PesananPaketRow[];
};
type CustomerRow = {
  id: string;
  nama: string;
  noHp: string | null;
  catatan: string | null;
  pesanan: CustomerPesananRow[];
};

export function PelangganManager({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<CustomerRow | null>(null);
  const [query, setQuery] = useState("");
  const [sheetPesanan, setSheetPesanan] = useState<CustomerPesananRow | null>(
    null
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.nama.toLowerCase().includes(q) ||
        (c.noHp ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

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
  function openEdit(c: CustomerRow) {
    setEditing(c);
    setFormOpen(true);
  }

  const totalBelanja = selected
    ? selected.pesanan.reduce((s, p) => s + totalPesanan(p), 0)
    : 0;

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
            placeholder="Cari nama atau no. HP…"
            className="flex-1"
          />
          <button
            onClick={openAdd}
            aria-label="Tambah pelanggan"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-glass-accent to-glass-accent2 text-white"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3 lg:min-h-0">
          {shown.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-glass-ink-faint">
              {customers.length === 0
                ? "Belum ada pelanggan."
                : "Tidak ada pelanggan yang cocok."}
            </p>
          ) : (
            shown.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => selectRow(c.id)}
                  className={cn(
                    "brutal-interactive flex w-full items-center justify-between gap-2 rounded-[14px] border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-panel-border bg-panel-strong"
                      : "border-transparent hover:bg-panel"
                  )}
                >
                  <span className="min-w-0 truncate text-[14px] font-bold text-glass-ink">
                    {c.nama}
                  </span>
                  <span className="text-data shrink-0 text-xs text-glass-ink-dim">
                    {c.pesanan.length} pesanan
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
              Semua pelanggan
            </button>

            <div>
              <h2 className="text-display text-[22px] font-extrabold text-glass-ink">{selected.nama}</h2>
              <p className="text-data mt-0.5 text-sm text-glass-ink-dim">
                {selected.noHp || "Tanpa nomor HP"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] bg-panel-strong p-3">
                <p className="text-display text-xs text-glass-ink-dim">Jumlah Pesanan</p>
                <p className="text-data mt-1 text-lg font-bold text-glass-ink">
                  {selected.pesanan.length}
                </p>
              </div>
              <div className="rounded-[14px] bg-panel-strong p-3">
                <p className="text-display text-xs text-glass-ink-dim">Total Belanja</p>
                <p className="text-data mt-1 text-lg font-bold text-glass-ink">
                  {formatRupiah(totalBelanja)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-display mb-2 text-xs font-semibold uppercase tracking-wide text-glass-ink-faint">
                Riwayat pesanan
              </p>
              {selected.pesanan.length === 0 ? (
                <p className="rounded-[14px] bg-panel-strong px-3 py-4 text-center text-sm text-glass-ink-dim">
                  Belum ada pesanan.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selected.pesanan.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSheetPesanan(p)}
                      className="brutal-interactive flex w-full items-center justify-between gap-2 rounded-[12px] bg-panel px-3 py-2.5 text-left text-sm transition-colors hover:bg-panel-strong"
                    >
                      <span className="text-data text-glass-ink-dim">{p.tanggal}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-data font-semibold text-glass-ink">
                          {formatRupiah(totalPesanan(p))}
                        </span>
                        <StatusBadge status={p.status} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" onClick={() => openEdit(selected)}>
                Edit Pelanggan
              </Button>
              <Button variant="danger" onClick={() => setConfirmDel(selected)}>
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <p className="p-5 text-sm text-glass-ink-faint">
            Pilih pelanggan untuk melihat detail.
          </p>
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

      <PesananDetailSheet pesanan={sheetPesanan} onClose={() => setSheetPesanan(null)} />
    </div>
  );
}

function PesananDetailSheet({
  pesanan,
  onClose,
}: {
  pesanan: CustomerPesananRow | null;
  onClose: () => void;
}) {
  const total = pesanan ? totalPesanan(pesanan) : 0;
  const untung = pesanan ? untungPesanan(pesanan) : 0;

  return (
    <Modal open={!!pesanan} onClose={onClose} title="Detail Pesanan">
      {pesanan && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-data text-sm text-glass-ink-dim">{pesanan.tanggal}</span>
            <StatusBadge status={pesanan.status} />
          </div>

          <ul className="space-y-1 text-sm">
            {pesanan.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-glass-ink">
                  {it.nama} <span className="text-data text-glass-ink-faint">×{it.jumlah}</span>
                </span>
                <span className="text-data shrink-0 text-glass-ink-dim">
                  {formatRupiah(it.hargaSaat * it.jumlah)}
                </span>
              </li>
            ))}
            {pesanan.pakets.map((pk) => (
              <li key={pk.id} className="rounded-[12px] bg-panel-strong px-2 py-1.5">
                <div className="flex justify-between gap-2">
                  <span className="min-w-0 truncate font-medium text-glass-ink">
                    <span className="badge-primary text-display mr-1 rounded bg-glass-accent/15 px-1 text-[10px] font-bold uppercase text-glass-accent">
                      Paket
                    </span>
                    {pk.nama}
                  </span>
                  <span className="text-data shrink-0 text-glass-ink-dim">{formatRupiah(pk.harga)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-glass-ink-faint">
                  {pk.komponen.map((k) => `${k.nama} ×${k.pcs}`).join(" + ")}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-glass-divider pt-2 text-sm">
            <span className="text-data font-semibold text-glass-ink">
              Total {formatRupiah(total)}
            </span>
            <span className="text-data font-semibold text-glass-success">
              Untung {formatRupiah(untung)}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FormModal({
  open,
  editing,
  onClose,
  onDone,
}: {
  open: boolean;
  editing: CustomerRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const res = editing
        ? await updateCustomer(formData)
        : await createCustomer(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
    >
      <form action={handleSubmit} className="space-y-3">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div>
          <Label htmlFor="c-nama">Nama pelanggan</Label>
          <Input
            id="c-nama"
            name="nama"
            defaultValue={editing?.nama}
            placeholder="Nama pelanggan"
            required
          />
        </div>
        <div>
          <Label htmlFor="c-noHp">No. HP (opsional)</Label>
          <Input
            id="c-noHp"
            name="noHp"
            inputMode="tel"
            defaultValue={editing?.noHp ?? ""}
            placeholder="08xxxxxxxxxx"
          />
        </div>
        <div>
          <Label htmlFor="c-catatan">Catatan (opsional)</Label>
          <Input
            id="c-catatan"
            name="catatan"
            defaultValue={editing?.catatan ?? ""}
            placeholder="Catatan tambahan"
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
  row: CustomerRow | null;
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
      const res = await deleteCustomer(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus pelanggan?">
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
