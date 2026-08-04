"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Combobox } from "@/components/ui/Combobox";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { formatRupiah } from "@/lib/format";
import {
  STATUS_LIST,
  STATUS_LABEL,
  totalPesanan,
  modalPesanan,
  untungPesanan,
  type Status,
} from "@/lib/calc";
import { Pencil } from "lucide-react";
import { createPesanan, updatePesanan, deletePesanan } from "@/lib/actions/pesanan";
import {
  tambahPembayaran,
  hapusPembayaran,
  tandaiLunas,
} from "@/lib/actions/pembayaran";

type ItemRow = {
  id: string;
  produkId: string;
  nama: string;
  jumlah: number;
  hargaSaat: number;
  modalSaat: number;
};
type PaketKomponenRow = {
  id: string;
  produkId: string;
  nama: string;
  pcs: number;
  modalSaat: number;
};
type PaketRow = {
  id: string;
  nama: string;
  harga: number;
  komponen: PaketKomponenRow[];
};
type PembayaranRow = {
  id: string;
  tanggal: string;
  tanggalLabel: string;
  akunId: string;
  akunNama: string;
  jumlah: number;
  jenis: string;
};
type PesananRow = {
  id: string;
  namaCustomer: string;
  noHp: string | null;
  status: string;
  tanggal: string;
  items: ItemRow[];
  pakets: PaketRow[];
  pembayaran: PembayaranRow[];
};
type ProdukOpt = { id: string; nama: string; stok: number };
type CustomerOpt = { id: string; nama: string; noHp: string | null };
type AkunOpt = { id: string; nama: string };

const FILTERS = ["semua", ...STATUS_LIST] as const;

export function PesananManager({
  pesanan,
  produk,
  customers,
  akun,
  openNew,
}: {
  pesanan: PesananRow[];
  produk: ProdukOpt[];
  customers: CustomerOpt[];
  akun: AkunOpt[];
  openNew: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("semua");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PesananRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<PesananRow | null>(null);
  const [payingOrder, setPayingOrder] = useState<PesananRow | null>(null);

  useEffect(() => {
    if (openNew) {
      setEditingOrder(null);
      setFormOpen(true);
    }
  }, [openNew]);

  // Keep the open payment modal's data in sync after router.refresh() brings
  // in a fresh `pesanan` list (e.g. right after adding/removing a payment).
  useEffect(() => {
    if (!payingOrder) return;
    const fresh = pesanan.find((p) => p.id === payingOrder.id);
    if (fresh && fresh !== payingOrder) setPayingOrder(fresh);
  }, [pesanan, payingOrder]);

  function openNewForm() {
    setEditingOrder(null);
    setFormOpen(true);
  }
  function openEditForm(order: PesananRow) {
    setEditingOrder(order);
    setFormOpen(true);
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pesanan.filter((p) => {
      if (filter !== "semua" && p.status !== filter) return false;
      if (!q) return true;
      const namaMatch = p.namaCustomer.toLowerCase().includes(q);
      const hpMatch = (p.noHp ?? "").toLowerCase().includes(q);
      const itemMatch = p.items.some((it) => it.nama.toLowerCase().includes(q));
      const paketMatch = p.pakets.some(
        (pk) =>
          pk.nama.toLowerCase().includes(q) ||
          pk.komponen.some((k) => k.nama.toLowerCase().includes(q))
      );
      return namaMatch || hpMatch || itemMatch || paketMatch;
    });
  }, [filter, query, pesanan]);

  return (
    <div className="p-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Cari customer, no. HP, atau produk…"
        className="mb-3"
      />
      {/* Filter tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold capitalize transition " +
              (filter === f
                ? "bg-primary text-white"
                : "bg-card text-muted-foreground border border-border")
            }
          >
            {f === "semua" ? "Semua" : STATUS_LABEL[f as Status]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          Tidak ada pesanan
          {filter !== "semua" ? " dengan status ini" : ""}
          {query.trim() ? " yang cocok" : ""}.
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => (
            <PesananCard
              key={p.id}
              p={p}
              onEdit={() => openEditForm(p)}
              onDelete={() => setConfirmDel(p)}
              onPay={() => setPayingOrder(p)}
            />
          ))}
        </div>
      )}

      <button
        onClick={openNewForm}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95"
        aria-label="Tambah pesanan"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <PesananFormModal
        key={`${editingOrder?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        editing={editingOrder}
        produk={produk}
        customers={customers}
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

      <PaymentModal
        key={payingOrder?.id}
        row={payingOrder}
        akun={akun}
        onClose={() => setPayingOrder(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}

function PesananCard({
  p,
  onEdit,
  onDelete,
  onPay,
}: {
  p: PesananRow;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
}) {
  const total = totalPesanan(p);
  const untung = untungPesanan(p);
  const dibayar = p.pembayaran.reduce((s, b) => s + b.jumlah, 0);
  const sisa = Math.max(0, total - dibayar);

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{p.namaCustomer}</p>
          <p className="text-xs text-muted">
            {p.tanggal}
            {p.noHp ? ` · ${p.noHp}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit pesanan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <StatusBadge status={p.status} />
        </div>
      </div>

      <ul className="space-y-1 text-sm">
        {p.items.map((it) => (
          <li key={it.id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate text-ink">
              {it.nama} <span className="text-muted">×{it.jumlah}</span>
            </span>
            <span className="shrink-0 text-muted">
              {formatRupiah(it.hargaSaat * it.jumlah)}
            </span>
          </li>
        ))}
        {p.pakets.map((pk) => (
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

      {p.status !== "belum_bayar" && (
        <div className="flex justify-between text-xs text-muted">
          <span>Dibayar {formatRupiah(dibayar)}</span>
          {p.status === "nyicil" && <span>Sisa {formatRupiah(sisa)}</span>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onPay}>
          {p.status === "belum_bayar" ? "Catat Bayar" : "Kelola Pembayaran"}
        </Button>
        <button
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          Hapus
        </button>
      </div>
    </Card>
  );
}

type DraftItem = { produkId: string; jumlah: number; harga: string };
type DraftKomp = { produkId: string; pcs: number };
type DraftPaket = { nama: string; harga: string; komponen: DraftKomp[] };

function PesananFormModal({
  open,
  editing,
  produk,
  customers,
  onClose,
  onDone,
}: {
  open: boolean;
  editing: PesananRow | null;
  produk: ProdukOpt[];
  customers: CustomerOpt[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [namaCustomer, setNamaCustomer] = useState(editing?.namaCustomer ?? "");
  const [noHp, setNoHp] = useState(editing?.noHp ?? "");
  const [items, setItems] = useState<DraftItem[]>(() =>
    editing
      ? editing.items.map((it) => ({
          produkId: it.produkId,
          jumlah: it.jumlah,
          harga: String(it.hargaSaat),
        }))
      : []
  );
  const [pakets, setPakets] = useState<DraftPaket[]>(() =>
    editing
      ? editing.pakets.map((pk) => ({
          nama: pk.nama,
          harga: String(pk.harga),
          komponen: pk.komponen.map((k) => ({
            produkId: k.produkId,
            pcs: k.pcs,
          })),
        }))
      : []
  );

  const produkMap = useMemo(
    () => new Map(produk.map((p) => [p.id, p])),
    [produk]
  );
  const produkOptions = useMemo(
    () => produk.map((p) => ({ value: p.id, label: p.nama })),
    [produk]
  );

  function itemHarga(it: DraftItem): number {
    const n = Math.floor(Number(it.harga));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function paketHarga(pk: DraftPaket): number {
    const n = Math.floor(Number(pk.harga));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  const total =
    items.reduce((s, it) => s + itemHarga(it) * it.jumlah, 0) +
    pakets.reduce((s, pk) => s + paketHarga(pk), 0);

  // --- single items ---
  function addItem() {
    if (produk.length === 0) return;
    setItems((prev) => [
      ...prev,
      { produkId: produk[0].id, jumlah: 1, harga: "" },
    ]);
  }
  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // --- pakets ---
  function addPaket() {
    if (produk.length === 0) return;
    setPakets((prev) => [
      ...prev,
      { nama: "", harga: "", komponen: [{ produkId: produk[0].id, pcs: 1 }] },
    ]);
  }
  function updatePaket(idx: number, patch: Partial<DraftPaket>) {
    setPakets((prev) =>
      prev.map((pk, i) => (i === idx ? { ...pk, ...patch } : pk))
    );
  }
  function removePaket(idx: number) {
    setPakets((prev) => prev.filter((_, i) => i !== idx));
  }
  function addKomp(pi: number) {
    setPakets((prev) =>
      prev.map((pk, i) =>
        i === pi
          ? { ...pk, komponen: [...pk.komponen, { produkId: produk[0].id, pcs: 1 }] }
          : pk
      )
    );
  }
  function updateKomp(pi: number, ki: number, patch: Partial<DraftKomp>) {
    setPakets((prev) =>
      prev.map((pk, i) =>
        i === pi
          ? {
              ...pk,
              komponen: pk.komponen.map((k, j) =>
                j === ki ? { ...k, ...patch } : k
              ),
            }
          : pk
      )
    );
  }
  function removeKomp(pi: number, ki: number) {
    setPakets((prev) =>
      prev.map((pk, i) =>
        i === pi
          ? { ...pk, komponen: pk.komponen.filter((_, j) => j !== ki) }
          : pk
      )
    );
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);

    const cleanItems = items
      .map((it) => ({
        produkId: it.produkId,
        jumlah: it.jumlah,
        hargaSaat: itemHarga(it),
      }))
      .filter((it) => it.produkId && it.jumlah > 0 && it.hargaSaat > 0);

    if (cleanItems.length !== items.length) {
      setError("Setiap item satuan harus punya harga jual lebih dari 0.");
      return;
    }

    const cleanPakets = pakets.map((pk) => ({
      nama: pk.nama.trim() || "Paket",
      harga: paketHarga(pk),
      komponen: pk.komponen.filter((k) => k.produkId && k.pcs > 0),
    }));

    for (const pk of cleanPakets) {
      if (pk.harga <= 0) {
        setError("Setiap paket harus punya harga jual lebih dari 0.");
        return;
      }
      if (pk.komponen.length === 0) {
        setError("Setiap paket harus punya minimal satu produk.");
        return;
      }
    }

    if (cleanItems.length === 0 && cleanPakets.length === 0) {
      setError("Tambahkan minimal satu item satuan atau satu paket.");
      return;
    }

    formData.set("items", JSON.stringify(cleanItems));
    formData.set("pakets", JSON.stringify(cleanPakets));
    if (editing) formData.set("id", editing.id);
    startTransition(async () => {
      const res = editing
        ? await updatePesanan(formData)
        : await createPesanan(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Pesanan" : "Pesanan Baru"}
    >
      {produk.length === 0 ? (
        <p className="text-sm text-muted">
          Belum ada produk. Tambahkan produk dulu sebelum membuat pesanan.
        </p>
      ) : (
        <form action={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="namaCustomer">Nama customer</Label>
            <input type="hidden" name="namaCustomer" value={namaCustomer} />
            <CustomerCombobox
              customers={customers}
              value={namaCustomer}
              onChange={(nama, hp) => {
                setNamaCustomer(nama);
                if (hp !== undefined) setNoHp(hp ?? "");
              }}
            />
          </div>
          <div>
            <Label htmlFor="noHp">No. HP (opsional)</Label>
            <Input
              id="noHp"
              name="noHp"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Item satuan</Label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm font-semibold text-primary"
              >
                + Tambah item
              </button>
            </div>

            {items.length === 0 && (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                Belum ada item satuan.
              </p>
            )}

            <div className="space-y-2">
              {items.map((it, idx) => {
                const pr = produkMap.get(it.produkId);
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-border p-2"
                  >
                    <div className="flex gap-2">
                      <Combobox
                        className="h-10 flex-1 text-sm"
                        options={produkOptions}
                        value={it.produkId}
                        onChange={(v) => updateItem(idx, { produkId: v })}
                        placeholder="Pilih produk"
                        searchPlaceholder="Cari produk…"
                        emptyText="Produk tidak ditemukan."
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="px-1 text-destructive"
                        aria-label="Hapus item"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <span className="mb-0.5 block text-[11px] text-muted">
                          Jumlah
                        </span>
                        <Input
                          className="h-10 text-center"
                          inputMode="numeric"
                          value={it.jumlah}
                          onChange={(e) =>
                            updateItem(idx, {
                              jumlah: Math.max(
                                1,
                                Math.floor(Number(e.target.value) || 1)
                              ),
                            })
                          }
                        />
                      </div>
                      <div>
                        <span className="mb-0.5 block text-[11px] text-muted">
                          Harga jual / pcs
                        </span>
                        <Input
                          className="h-10"
                          inputMode="numeric"
                          placeholder="cth: 75000"
                          value={it.harga}
                          onChange={(e) =>
                            updateItem(idx, {
                              harga: e.target.value.replace(/[^0-9]/g, ""),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between px-1 text-xs text-muted">
                      <span>
                        {pr && pr.stok < it.jumlah
                          ? `⚠ stok tersisa ${pr.stok}`
                          : `Stok ${pr?.stok ?? 0}`}
                      </span>
                      <span>Subtotal {formatRupiah(itemHarga(it) * it.jumlah)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paket / bundle section */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Paket (gabungan produk)</Label>
              <button
                type="button"
                onClick={addPaket}
                className="text-sm font-semibold text-primary"
              >
                + Tambah paket
              </button>
            </div>

            {pakets.length === 0 && (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                Belum ada paket. Gabungkan beberapa produk jadi satu harga.
              </p>
            )}

            <div className="space-y-3">
              {pakets.map((pk, pi) => {
                return (
                  <div
                    key={pi}
                    className="rounded-xl border-2 border-primary/20 bg-primary/[0.03] p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Input
                        className="h-10 flex-1 text-sm"
                        placeholder="Nama paket (cth: Paket Duo)"
                        value={pk.nama}
                        onChange={(e) => updatePaket(pi, { nama: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removePaket(pi)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        Hapus paket
                      </button>
                    </div>

                    <div className="space-y-2">
                      {pk.komponen.map((k, ki) => {
                        const pr = produkMap.get(k.produkId);
                        return (
                          <div key={ki} className="flex items-center gap-2">
                            <Combobox
                              className="h-9 flex-1 text-sm"
                              options={produkOptions}
                              value={k.produkId}
                              onChange={(v) =>
                                updateKomp(pi, ki, { produkId: v })
                              }
                              placeholder="Pilih produk"
                              searchPlaceholder="Cari produk…"
                              emptyText="Produk tidak ditemukan."
                            />
                            <Input
                              className="h-9 w-14 text-center text-sm"
                              inputMode="numeric"
                              value={k.pcs}
                              onChange={(e) =>
                                updateKomp(pi, ki, {
                                  pcs: Math.max(
                                    1,
                                    Math.floor(Number(e.target.value) || 1)
                                  ),
                                })
                              }
                            />
                            <span className="w-8 shrink-0 text-[11px] text-muted">
                              pcs
                            </span>
                            <button
                              type="button"
                              onClick={() => removeKomp(pi, ki)}
                              disabled={pk.komponen.length === 1}
                              className="px-1 text-destructive disabled:opacity-30"
                              aria-label="Hapus komponen"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => addKomp(pi)}
                      className="mt-2 text-sm font-semibold text-primary"
                    >
                      + Tambah produk ke paket
                    </button>

                    <div className="mt-3 flex items-center gap-2 border-t border-primary/10 pt-2">
                      <span className="text-sm font-medium text-ink">
                        Harga paket
                      </span>
                      <Input
                        className="h-10 flex-1"
                        inputMode="numeric"
                        placeholder="cth: 55000"
                        value={pk.harga}
                        onChange={(e) =>
                          updatePaket(pi, {
                            harga: e.target.value.replace(/[^0-9]/g, ""),
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
            <span className="font-semibold text-ink">Total</span>
            <span className="text-lg font-black text-primary">
              {formatRupiah(total)}
            </span>
          </div>

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
      )}
    </Modal>
  );
}

function CustomerCombobox({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOpt[];
  value: string;
  onChange: (nama: string, noHp?: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.nama.toLowerCase().includes(q));
  }, [customers, search]);

  const exactMatch = customers.some(
    (c) => c.nama.toLowerCase() === search.trim().toLowerCase()
  );

  function close() {
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          id="namaCustomer"
          placeholder="Nama pembeli"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            onChange(v);
            setOpen(true);
          }}
          onBlur={() => {
            // Let a click on the popover content (e.g. selecting an item)
            // register before we close.
            setTimeout(close, 150);
          }}
          autoComplete="off"
          required
        />
      </PopoverAnchor>
      <PopoverContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-0"
      >
        <Command>
          <CommandList>
            <CommandEmpty>
              {search.trim() ? "Pelanggan baru akan dibuat." : "Ketik nama pelanggan."}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.nama}
                  onSelect={() => {
                    onChange(c.nama, c.noHp);
                    setSearch(c.nama);
                    setOpen(false);
                  }}
                >
                  <span className="line-clamp-1">{c.nama}</span>
                  {c.noHp && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {c.noHp}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {search.trim() && !exactMatch && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => {
                  onChange(search.trim());
                  setSearch(search.trim());
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium text-primary hover:bg-primary/10"
              >
                Pakai &quot;{search.trim()}&quot; (baru)
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function PaymentModal({
  row,
  akun,
  onClose,
  onChanged,
}: {
  row: PesananRow | null;
  akun: AkunOpt[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const total = row ? totalPesanan(row) : 0;
  const dibayar = row ? row.pembayaran.reduce((s, b) => s + b.jumlah, 0) : 0;
  const sisa = Math.max(0, total - dibayar);

  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [akunId, setAkunId] = useState(akun[0]?.id ?? "");
  const [jumlah, setJumlah] = useState(() => String(sisa || ""));
  const [error, setError] = useState<string>();

  function addPayment() {
    if (!row) return;
    setError(undefined);
    const amount = Math.floor(Number(jumlah));
    if (!akunId) return setError("Pilih akun tujuan pembayaran.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Jumlah harus lebih dari 0.");

    const jenis = row.pembayaran.length === 0 && amount >= sisa ? "bayar" : "cicilan";
    const fd = new FormData();
    fd.set("pesananId", row.id);
    fd.set("tanggal", tanggal);
    fd.set("akunId", akunId);
    fd.set("jumlah", String(amount));
    fd.set("jenis", jenis);
    startTransition(async () => {
      const res = await tambahPembayaran(fd);
      if (res.ok) {
        setJumlah("");
        onChanged();
      } else setError(res.error);
    });
  }

  function removePayment(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await hapusPembayaran(fd);
      if (res.ok) onChanged();
      else alert(res.error);
    });
  }

  function forceLunas() {
    if (!row) return;
    const modal = modalPesanan(row);
    const untung = dibayar - modal;
    if (untung < 0) {
      const ok = confirm(
        `Pembayaran (${formatRupiah(dibayar)}) belum menutup modal (${formatRupiah(
          modal
        )}). Menandai lunas akan mencatat kerugian ${formatRupiah(-untung)}. Lanjutkan?`
      );
      if (!ok) return;
    }
    const fd = new FormData();
    fd.set("pesananId", row.id);
    startTransition(async () => {
      const res = await tandaiLunas(fd);
      if (res.ok) onChanged();
      else alert(res.error);
    });
  }

  return (
    <Modal
      key={row?.id}
      open={!!row}
      onClose={onClose}
      title={row ? `Pembayaran — ${row.namaCustomer}` : "Pembayaran"}
    >
      {row && (
        <div className="space-y-3">
          <div className="flex justify-between rounded-xl bg-secondary px-3 py-2 text-sm">
            <span>Total {formatRupiah(total)}</span>
            <span>Dibayar {formatRupiah(dibayar)}</span>
            <span>Sisa {formatRupiah(sisa)}</span>
          </div>

          {row.pembayaran.length > 0 && (
            <ul className="space-y-1.5">
              {row.pembayaran.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-ink">
                      {formatRupiah(b.jumlah)} · {b.akunNama}
                    </p>
                    <p className="text-xs text-muted">
                      {b.tanggalLabel} · {b.jenis === "cicilan" ? "Cicilan" : "Bayar penuh"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePayment(b.id)}
                    disabled={pending}
                    className="shrink-0 px-1 text-destructive"
                    aria-label="Hapus pembayaran"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {sisa > 0 && akun.length === 0 && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              Belum ada akun uang. Tambahkan akun dulu di Uang → Akun.
            </p>
          )}

          {sisa > 0 && akun.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border p-3">
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
                  <Label className="text-xs">Akun</Label>
                  <Select value={akunId} onValueChange={setAkunId}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Pilih akun" />
                    </SelectTrigger>
                    <SelectContent>
                      {akun.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Jumlah</Label>
                <Input
                  className="h-10"
                  inputMode="numeric"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={pending}
                onClick={addPayment}
              >
                {pending ? "Menyimpan…" : "Tambah Pembayaran"}
              </Button>
            </div>
          )}

          {row.status !== "lunas" && row.pembayaran.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={pending}
              onClick={forceLunas}
            >
              Tandai Lunas
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

function DeleteModal({
  row,
  onClose,
  onDone,
}: {
  row: PesananRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!row) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      const res = await deletePesanan(fd);
      if (res.ok) onDone();
      else alert(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus pesanan?">
      <p className="text-sm text-muted">
        Yakin ingin menghapus pesanan{" "}
        <span className="font-semibold text-ink">{row?.namaCustomer}</span>? Jika
        stok sudah dipotong, stok akan dikembalikan.
      </p>
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
