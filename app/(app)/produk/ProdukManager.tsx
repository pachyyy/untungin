"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/format";
import { todayJakarta } from "@/lib/date";
import { cn } from "@/lib/utils";
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

const STOK_MENIPIS = 5;

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [editing, setEditing] = useState<ProdukRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ProdukRow | null>(null);
  const [restocking, setRestocking] = useState<ProdukRow | null>(null);
  const [query, setQuery] = useState("");
  const [stokFilter, setStokFilter] = useState<"semua" | "menipis">("semua");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return produk.filter((p) => {
      if (stokFilter === "menipis" && !(p.stok < STOK_MENIPIS)) return false;
      if (!q) return true;
      return (
        p.nama.toLowerCase().includes(q) || p.supplierNama.toLowerCase().includes(q)
      );
    });
  }, [produk, query, stokFilter]);

  const selected = produk.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (openNew) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [openNew]);

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
  function openEdit(p: ProdukRow) {
    setEditing(p);
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
        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Cari produk…"
              className="flex-1"
            />
            <button
              onClick={openAdd}
              aria-label="Tambah produk"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-glass-accent to-glass-accent2 text-white"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <FilterPill active={stokFilter === "semua"} onClick={() => setStokFilter("semua")}>
              Semua
            </FilterPill>
            <FilterPill
              active={stokFilter === "menipis"}
              onClick={() => setStokFilter("menipis")}
            >
              Stok Menipis
            </FilterPill>
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3 lg:min-h-0">
          {shown.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-glass-ink-faint">
              {produk.length === 0
                ? "Belum ada produk."
                : "Tidak ada produk yang cocok."}
            </p>
          ) : (
            shown.map((p) => {
              const low = p.stok < STOK_MENIPIS;
              const active = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => selectRow(p.id)}
                  className={cn(
                    "brutal-interactive flex w-full items-center justify-between gap-2 rounded-[14px] border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-panel-border bg-panel-strong"
                      : "border-transparent hover:bg-panel"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold text-glass-ink">
                      {p.nama}
                    </span>
                    <span className="text-data block text-xs text-glass-ink-dim">
                      {formatRupiah(p.hargaModal)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-data shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                      low
                        ? "badge-warning bg-glass-warning/15 text-glass-warning"
                        : "badge-success bg-glass-success/15 text-glass-success"
                    )}
                  >
                    Stok {p.stok}
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
              Semua produk
            </button>

            <div>
              <h2 className="text-display text-[22px] font-extrabold text-glass-ink">{selected.nama}</h2>
              <p className="mt-0.5 text-sm text-glass-ink-dim">
                Supplier: {selected.supplierNama}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] bg-panel-strong p-3">
                <p className="text-display text-xs text-glass-ink-dim">Harga Modal</p>
                <p className="text-data mt-1 text-lg font-bold text-glass-ink">
                  {formatRupiah(selected.hargaModal)}
                </p>
              </div>
              <div className="rounded-[14px] bg-panel-strong p-3">
                <p className="text-display text-xs text-glass-ink-dim">Stok</p>
                <p className="text-data mt-1 text-lg font-bold text-glass-ink">{selected.stok}</p>
              </div>
            </div>

            {selected.riwayatRestock.length > 0 && (
              <div>
                <p className="text-display mb-2 text-xs font-semibold uppercase tracking-wide text-glass-ink-faint">
                  Riwayat restock terakhir
                </p>
                <ul className="space-y-1.5">
                  {selected.riwayatRestock.map((r) => (
                    <li
                      key={r.id}
                      className="text-data flex items-center justify-between rounded-[12px] bg-panel px-3 py-2 text-sm text-glass-ink"
                    >
                      <span>
                        +{r.qty} · {formatRupiah(r.hargaBeli)}
                      </span>
                      <span className="text-xs text-glass-ink-faint">{r.tanggalLabel}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" onClick={() => openEdit(selected)}>
                Edit Produk
              </Button>
              <Button variant="outline" onClick={() => setRestocking(selected)}>
                Restock
              </Button>
              <Button variant="danger" onClick={() => setConfirmDel(selected)}>
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <p className="p-5 text-sm text-glass-ink-faint">Pilih produk untuk melihat detail.</p>
        )}
      </div>

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
          if (confirmDel?.id === selectedId) clearSelection();
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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-display rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-panel-strong text-glass-ink"
          : "text-glass-ink-faint hover:bg-panel"
      )}
    >
      {children}
    </button>
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
  const { toast } = useToast();
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
      if (res.ok) {
        toast(editing ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.");
        onDone();
      } else setError(res.error);
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
        <p className="text-xs text-glass-ink-faint">
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium text-glass-accent hover:bg-glass-accent/10"
              >
                <Plus className="h-4 w-4" />
                Tambah supplier baru
              </button>
            )}
          />
        </div>

        {addingSupplier && (
          <div className="space-y-3 rounded-[14px] bg-panel-strong p-3">
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
          <p className="rounded-[12px] bg-glass-danger/10 px-3 py-2 text-sm text-glass-danger">
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
  const { toast } = useToast();

  function handleDelete() {
    if (!row) return;
    setError(undefined);
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      const res = await deleteProduk(fd);
      if (res.ok) {
        toast("Produk berhasil dihapus.");
        onDone();
      } else setError(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus produk?">
      <p className="text-sm text-glass-ink-dim">
        Yakin ingin menghapus{" "}
        <span className="font-semibold text-glass-ink">{row?.nama}</span>? Tindakan ini
        tidak bisa dibatalkan.
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
  const { toast } = useToast();
  const [tanggal, setTanggal] = useState(todayJakarta);
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
      if (res.ok) {
        toast("Restock berhasil disimpan.");
        onDone();
      } else setError(res.error);
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
          <div className="flex justify-between rounded-[14px] bg-panel-strong px-3 py-2 text-sm text-glass-ink">
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
            <div className="flex justify-between rounded-[14px] bg-glass-accent/10 px-3 py-2 text-sm text-glass-accent">
              <span>Stok baru {preview.stokBaru}</span>
              <span>HPP baru {formatRupiah(preview.hargaModalBaru)}</span>
            </div>
          )}

          {error && <p className="text-sm text-glass-danger">{error}</p>}

          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={handleSubmit}
          >
            {pending ? "Menyimpan…" : "Simpan Restock"}
          </Button>

          {row.riwayatRestock.length > 0 && (
            <div className="space-y-1.5 border-t border-glass-divider pt-3">
              <p className="text-xs font-medium text-glass-ink-faint">Riwayat restock terakhir</p>
              <ul className="space-y-1.5">
                {row.riwayatRestock.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-sm text-glass-ink"
                  >
                    <span>
                      +{r.qty} · {formatRupiah(r.hargaBeli)}
                    </span>
                    <span className="text-xs text-glass-ink-faint">{r.tanggalLabel}</span>
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
