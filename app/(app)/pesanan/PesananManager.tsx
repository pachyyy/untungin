"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRupiah } from "@/lib/format";
import {
  STATUS_LIST,
  STATUS_LABEL,
  totalPesanan,
  untungPesanan,
  type Status,
} from "@/lib/calc";
import {
  createPesanan,
  updateStatus,
  deletePesanan,
} from "@/lib/actions/pesanan";

type ItemRow = {
  id: string;
  nama: string;
  jumlah: number;
  hargaSaat: number;
  produk: { hargaModal: number };
};
type PaketKomponenRow = {
  id: string;
  nama: string;
  pcs: number;
  produk: { hargaModal: number };
};
type PaketRow = {
  id: string;
  nama: string;
  harga: number;
  komponen: PaketKomponenRow[];
};
type PesananRow = {
  id: string;
  namaCustomer: string;
  noHp: string | null;
  status: string;
  tanggal: string;
  items: ItemRow[];
  pakets: PaketRow[];
};
type ProdukOpt = { id: string; nama: string; stok: number };

const FILTERS = ["semua", ...STATUS_LIST] as const;

export function PesananManager({
  pesanan,
  produk,
  openNew,
}: {
  pesanan: PesananRow[];
  produk: ProdukOpt[];
  openNew: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("semua");
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<PesananRow | null>(null);

  useEffect(() => {
    if (openNew) setFormOpen(true);
  }, [openNew]);

  const shown = useMemo(
    () => (filter === "semua" ? pesanan : pesanan.filter((p) => p.status === filter)),
    [filter, pesanan]
  );

  return (
    <div className="p-4">
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
          Tidak ada pesanan{filter !== "semua" ? " dengan status ini" : ""}.
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => (
            <PesananCard
              key={p.id}
              p={p}
              onDelete={() => setConfirmDel(p)}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setFormOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95"
        aria-label="Tambah pesanan"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <NewPesananModal
        key={formOpen ? "open" : "closed"}
        open={formOpen}
        produk={produk}
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

function PesananCard({
  p,
  onDelete,
  onChanged,
}: {
  p: PesananRow;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const total = totalPesanan(p);
  const untung = untungPesanan(p);

  function changeStatus(status: string) {
    const fd = new FormData();
    fd.set("id", p.id);
    fd.set("status", status);
    startTransition(async () => {
      const res = await updateStatus(fd);
      if (res.ok) onChanged();
      else alert(res.error);
    });
  }

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
        <StatusBadge status={p.status} />
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

      <div className="flex items-center gap-2">
        <Select
          className="h-9 flex-1 text-sm"
          value={p.status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value)}
        >
          {STATUS_LIST.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
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

function NewPesananModal({
  open,
  produk,
  onClose,
  onDone,
}: {
  open: boolean;
  produk: ProdukOpt[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [pakets, setPakets] = useState<DraftPaket[]>([]);

  const produkMap = useMemo(
    () => new Map(produk.map((p) => [p.id, p])),
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
    startTransition(async () => {
      const res = await createPesanan(formData);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Pesanan Baru">
      {produk.length === 0 ? (
        <p className="text-sm text-muted">
          Belum ada produk. Tambahkan produk dulu sebelum membuat pesanan.
        </p>
      ) : (
        <form action={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="namaCustomer">Nama customer</Label>
            <Input
              id="namaCustomer"
              name="namaCustomer"
              placeholder="Nama pembeli"
              required
            />
          </div>
          <div>
            <Label htmlFor="noHp">No. HP (opsional)</Label>
            <Input
              id="noHp"
              name="noHp"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
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
                      <Select
                        className="h-10 flex-1 text-sm"
                        value={it.produkId}
                        onChange={(e) =>
                          updateItem(idx, { produkId: e.target.value })
                        }
                      >
                        {produk.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama}
                          </option>
                        ))}
                      </Select>
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
                            <Select
                              className="h-9 flex-1 text-sm"
                              value={k.produkId}
                              onChange={(e) =>
                                updateKomp(pi, ki, { produkId: e.target.value })
                              }
                            >
                              {produk.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nama}
                                </option>
                              ))}
                            </Select>
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
