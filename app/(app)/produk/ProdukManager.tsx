"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Plus } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { createProduk, updateProduk, deleteProduk } from "@/lib/actions/produk";
import { restockProduk } from "@/lib/actions/restock";

type RiwayatRestockRow = {
  id: string;
  qty: number;
  hargaBeli: number;
  tanggalLabel: string;
};
type ProdukRow = {
  id: string;
  nama: string;
  hargaModal: number;
  stok: number;
  supplierId: string;
  supplierNama: string;
  riwayatRestock: RiwayatRestockRow[];
};
type Supplier = { id: string; nama: string; kontak: string | null };

export function ProdukManager({
  produk,
  suppliers,
  openNew,
}: {
  produk: ProdukRow[];
  suppliers: Supplier[];
  openNew: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProdukRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ProdukRow | null>(null);
  const [restocking, setRestocking] = useState<ProdukRow | null>(null);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return produk;
    return produk.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        p.supplierNama.toLowerCase().includes(q)
    );
  }, [produk, query]);

  useEffect(() => {
    if (openNew) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [openNew]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: ProdukRow) {
    setEditing(p);
    setFormOpen(true);
  }

  return (
    <div className="p-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Cari nama produk atau supplier…"
        className="mb-3"
      />
      {shown.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          {produk.length === 0
            ? "Belum ada produk. Tambahkan produk pertamamu."
            : "Tidak ada produk yang cocok."}
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((p) => {
            const low = p.stok < 5;
            return (
              <Card key={p.id} className="flex items-center justify-between gap-3">
                <button
                  onClick={() => openEdit(p)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-semibold text-ink">{p.nama}</p>
                  <p className="truncate text-xs text-muted">{p.supplierNama}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                    <span className="font-medium text-ink">
                      Modal {formatRupiah(p.hargaModal)}
                    </span>
                  </div>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-bold " +
                      (low
                        ? "bg-warning/10 text-warning"
                        : "bg-secondary text-secondary-foreground")
                    }
                  >
                    Stok {p.stok}
                  </span>
                  <button
                    onClick={() => setRestocking(p)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Restock
                  </button>
                  <button
                    onClick={() => setConfirmDel(p)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95"
        aria-label="Tambah produk"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <ProdukFormModal
        key={editing?.id ?? "new"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        suppliers={suppliers}
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

      <RestockModal
        key={restocking?.id}
        row={restocking}
        onClose={() => setRestocking(null)}
        onDone={() => {
          setRestocking(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function ProdukFormModal({
  open,
  onClose,
  editing,
  suppliers,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  editing: ProdukRow | null;
  suppliers: Supplier[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [supplierId, setSupplierId] = useState(
    editing?.supplierId ?? suppliers[0]?.id ?? "__new__"
  );

  const addingSupplier = supplierId === "__new__" || suppliers.length === 0;

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const res = editing
        ? await updateProduk(formData)
        : await createProduk(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Produk" : "Tambah Produk"}
    >
      <form action={handleSubmit} className="space-y-3">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div>
          <Label htmlFor="nama">Nama produk</Label>
          <Input
            id="nama"
            name="nama"
            defaultValue={editing?.nama}
            placeholder="Contoh: Kaos Polos Hitam"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="hargaModal">Harga modal</Label>
            <Input
              id="hargaModal"
              name="hargaModal"
              inputMode="numeric"
              defaultValue={editing?.hargaModal}
              placeholder="50000"
              required
            />
          </div>
          <div>
            <Label htmlFor="stok">Stok</Label>
            <Input
              id="stok"
              name="stok"
              inputMode="numeric"
              defaultValue={editing?.stok ?? 0}
              placeholder="0"
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Harga jual diisi saat membuat pesanan.
        </p>

        <div>
          <Label>Supplier</Label>
          <input type="hidden" name="supplierId" value={supplierId} />
          <Combobox
            options={suppliers.map((s) => ({ value: s.id, label: s.nama }))}
            value={supplierId === "__new__" ? "" : supplierId}
            onChange={(v) => setSupplierId(v)}
            placeholder={
              supplierId === "__new__"
                ? "Supplier baru (isi di bawah)"
                : "Pilih supplier"
            }
            searchPlaceholder="Cari supplier…"
            emptyText="Supplier tidak ditemukan."
            footer={({ close }) => (
              <button
                type="button"
                onClick={() => {
                  setSupplierId("__new__");
                  close();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
                Tambah supplier baru
              </button>
            )}
          />
        </div>

        {addingSupplier && (
          <div className="space-y-3 rounded-xl bg-secondary p-3">
            <div>
              <Label htmlFor="supplierNama">Nama supplier baru</Label>
              <Input
                id="supplierNama"
                name="supplierNama"
                placeholder="Nama supplier"
              />
            </div>
            <div>
              <Label htmlFor="supplierKontak">Kontak (opsional)</Label>
              <Input
                id="supplierKontak"
                name="supplierKontak"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
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
  row: ProdukRow | null;
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
      const res = await deleteProduk(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus produk?">
      <p className="text-sm text-muted">
        Yakin ingin menghapus{" "}
        <span className="font-semibold text-ink">{row?.nama}</span>? Tindakan ini
        tidak bisa dibatalkan.
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

function RestockModal({
  row,
  onClose,
  onDone,
}: {
  row: ProdukRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState("");
  const [hargaBeli, setHargaBeli] = useState(() => String(row?.hargaModal ?? ""));
  const [error, setError] = useState<string>();

  const qtyNum = Math.floor(Number(qty));
  const hargaBeliNum = Math.floor(Number(hargaBeli));
  const preview =
    row && Number.isFinite(qtyNum) && qtyNum > 0 && Number.isFinite(hargaBeliNum) && hargaBeliNum > 0
      ? {
          stokBaru: row.stok + qtyNum,
          hargaModalBaru: Math.round(
            (row.stok * row.hargaModal + qtyNum * hargaBeliNum) / (row.stok + qtyNum)
          ),
        }
      : null;

  function handleSubmit() {
    if (!row) return;
    setError(undefined);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0)
      return setError("Jumlah masuk harus lebih dari 0.");
    if (!Number.isFinite(hargaBeliNum) || hargaBeliNum <= 0)
      return setError("Harga beli harus lebih dari 0.");

    const fd = new FormData();
    fd.set("produkId", row.id);
    fd.set("qty", String(qtyNum));
    fd.set("hargaBeli", String(hargaBeliNum));
    fd.set("tanggal", tanggal);
    startTransition(async () => {
      const res = await restockProduk(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title={row ? `Restock — ${row.nama}` : "Restock"}
    >
      {row && (
        <div className="space-y-3">
          <div className="flex justify-between rounded-xl bg-secondary px-3 py-2 text-sm">
            <span>Stok saat ini {row.stok}</span>
            <span>HPP saat ini {formatRupiah(row.hargaModal)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input
                type="date"
                className="h-10"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Jumlah masuk</Label>
              <Input
                className="h-10"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Harga beli per unit</Label>
            <Input
              className="h-10"
              inputMode="numeric"
              value={hargaBeli}
              onChange={(e) => setHargaBeli(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
            />
          </div>

          {preview && (
            <div className="flex justify-between rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
              <span>Stok baru {preview.stokBaru}</span>
              <span>HPP baru {formatRupiah(preview.hargaModalBaru)}</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={handleSubmit}
          >
            {pending ? "Menyimpan…" : "Simpan Restock"}
          </Button>

          {row.riwayatRestock.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted">Riwayat restock terakhir</p>
              <ul className="space-y-1.5">
                {row.riwayatRestock.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-sm text-ink"
                  >
                    <span>
                      +{r.qty} · {formatRupiah(r.hargaBeli)}
                    </span>
                    <span className="text-xs text-muted">{r.tanggalLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
