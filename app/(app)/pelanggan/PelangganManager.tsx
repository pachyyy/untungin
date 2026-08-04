"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { totalPesanan, untungPesanan } from "@/lib/calc";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/actions/customer";

type PesananItemRow = {
  id: string;
  produkId: string;
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
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<CustomerRow | null>(null);
  const [query, setQuery] = useState("");
  const [sheetCustomer, setSheetCustomer] = useState<CustomerRow | null>(null);
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

  return (
    <div className="p-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Cari nama atau no. HP…"
        className="mb-3"
      />
      {shown.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          {customers.length === 0
            ? "Belum ada pelanggan."
            : "Tidak ada pelanggan yang cocok."}
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-3">
              <button
                onClick={() => setSheetCustomer(c)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate font-semibold text-ink">{c.nama}</p>
                <p className="truncate text-sm text-muted">
                  {c.noHp || "Tanpa kontak"} · {c.pesanan.length} pesanan
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDel(c)}
                  className="text-xs font-medium text-destructive hover:underline"
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
        aria-label="Tambah pelanggan"
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

      <PesananListSheet
        customer={sheetCustomer}
        onClose={() => setSheetCustomer(null)}
        onSelectPesanan={(p) => setSheetPesanan(p)}
      />

      <PesananDetailSheet
        pesanan={sheetPesanan}
        onClose={() => setSheetPesanan(null)}
      />
    </div>
  );
}

function PesananListSheet({
  customer,
  onClose,
  onSelectPesanan,
}: {
  customer: CustomerRow | null;
  onClose: () => void;
  onSelectPesanan: (p: CustomerPesananRow) => void;
}) {
  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title={customer ? `Pesanan ${customer.nama}` : undefined}
    >
      {customer && customer.pesanan.length === 0 && (
        <p className="text-sm text-muted">Belum ada pesanan.</p>
      )}
      {customer && customer.pesanan.length > 0 && (
        <div className="space-y-2">
          {customer.pesanan.map((p) => {
            const produkNames = [
              ...p.items.map((it) => it.nama),
              ...p.pakets.map((pk) => pk.nama),
            ];
            return (
              <button
                key={p.id}
                onClick={() => onSelectPesanan(p)}
                className="block w-full rounded-xl border border-border p-3 text-left transition hover:bg-secondary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{p.tanggal}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 truncate text-sm text-muted">
                  {produkNames.join(", ") || "Tidak ada produk"}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
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
            <span className="text-sm text-muted">{pesanan.tanggal}</span>
            <StatusBadge status={pesanan.status} />
          </div>

          <ul className="space-y-1 text-sm">
            {pesanan.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-ink">
                  {it.nama} <span className="text-muted">×{it.jumlah}</span>
                </span>
                <span className="shrink-0 text-muted">
                  {formatRupiah(it.hargaSaat * it.jumlah)}
                </span>
              </li>
            ))}
            {pesanan.pakets.map((pk) => (
              <li key={pk.id} className="rounded-lg bg-secondary px-2 py-1.5">
                <div className="flex justify-between gap-2">
                  <span className="min-w-0 truncate font-medium text-ink">
                    <span className="mr-1 rounded bg-primary/10 px-1 text-[10px] font-bold uppercase text-primary">
                      Paket
                    </span>
                    {pk.nama}
                  </span>
                  <span className="shrink-0 text-muted">{formatRupiah(pk.harga)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {pk.komponen.map((k) => `${k.nama} ×${k.pcs}`).join(" + ")}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="font-semibold text-ink">
              Total {formatRupiah(total)}
            </span>
            <span className="font-semibold text-success">
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
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
      <p className="text-sm text-muted">
        Yakin ingin menghapus{" "}
        <span className="font-semibold text-ink">{row?.nama}</span>?
      </p>
      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
