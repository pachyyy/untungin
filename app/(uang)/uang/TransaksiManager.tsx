"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRightLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { formatRupiah, formatTanggal, formatBulanKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  createTransaksi,
  updateTransaksi,
  deleteTransaksi,
} from "@/lib/actions/transaksi";

type TxRow = {
  id: string;
  jenis: string;
  tanggal: string;
  jumlah: number;
  akunId: string;
  akunNama: string;
  akunTujuanId: string | null;
  akunTujuanNama: string | null;
  kategoriId: string | null;
  kategoriNama: string | null;
  catatan: string | null;
  terkaitPesanan: boolean;
};
type AkunOpt = { id: string; nama: string };
type KategoriOpt = { id: string; nama: string; jenis: string };

function shiftBulan(bulan: string, delta: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function TransaksiManager({
  bulan,
  transaksi,
  akun,
  kategori,
}: {
  bulan: string;
  transaksi: TxRow[];
  akun: AkunOpt[];
  kategori: KategoriOpt[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TxRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<TxRow | null>(null);

  const totals = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    for (const t of transaksi) {
      if (t.jenis === "masuk") masuk += t.jumlah;
      else if (t.jenis === "keluar") keluar += t.jumlah;
    }
    return { masuk, keluar, selisih: masuk - keluar };
  }, [transaksi]);

  const groups = useMemo(() => {
    const map = new Map<string, TxRow[]>();
    for (const t of transaksi) {
      const arr = map.get(t.tanggal) ?? [];
      arr.push(t);
      map.set(t.tanggal, arr);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transaksi]);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={`/uang?bulan=${shiftBulan(bulan, -1)}`}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="font-bold text-foreground">{formatBulanKey(bulan)}</span>
        <Link
          href={`/uang?bulan=${shiftBulan(bulan, 1)}`}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Masuk</p>
          <p className="mt-1 text-sm font-bold text-success">{formatRupiah(totals.masuk)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Keluar</p>
          <p className="mt-1 text-sm font-bold text-destructive">{formatRupiah(totals.keluar)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Selisih</p>
          <p className="mt-1 text-sm font-bold text-foreground">{formatRupiah(totals.selisih)}</p>
        </Card>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          Belum ada transaksi bulan ini.
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(([tanggal, rows]) => (
            <div key={tanggal}>
              <p className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">
                {formatTanggal(new Date(tanggal + "T00:00:00"))}
              </p>
              <div className="space-y-1.5">
                {rows.map((t) => (
                  <TxCard
                    key={t.id}
                    t={t}
                    onEdit={() => {
                      setEditing(t);
                      setFormOpen(true);
                    }}
                    onDelete={() => setConfirmDel(t)}
                  />
                ))}
              </div>
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
        aria-label="Tambah transaksi"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <TxFormModal
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        editing={editing}
        akun={akun}
        kategori={kategori}
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

function TxCard({
  t,
  onEdit,
  onDelete,
}: {
  t: TxRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color =
    t.jenis === "masuk"
      ? "text-success"
      : t.jenis === "keluar"
        ? "text-destructive"
        : "text-primary";
  const sign = t.jenis === "masuk" ? "+" : t.jenis === "keluar" ? "-" : "";

  return (
    <Card
      className="flex items-center justify-between gap-2 p-3"
      onClick={!t.terkaitPesanan ? onEdit : undefined}
      role={!t.terkaitPesanan ? "button" : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {t.jenis === "transfer" ? (
            <span className="inline-flex items-center gap-1">
              <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
              {t.akunNama} → {t.akunTujuanNama}
            </span>
          ) : (
            t.kategoriNama ?? "Tanpa kategori"
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {t.jenis !== "transfer" ? `${t.akunNama} · ` : ""}
          {t.catatan || (t.terkaitPesanan ? "Dari Pesanan" : "—")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn("font-semibold", color)}>
          {sign}
          {formatRupiah(t.jumlah)}
        </span>
        {!t.terkaitPesanan && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-1 text-destructive"
            aria-label="Hapus transaksi"
          >
            ✕
          </button>
        )}
      </div>
    </Card>
  );
}

function TxFormModal({
  open,
  editing,
  akun,
  kategori,
  onClose,
  onDone,
}: {
  open: boolean;
  editing: TxRow | null;
  akun: AkunOpt[];
  kategori: KategoriOpt[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [jenis, setJenis] = useState<"masuk" | "keluar" | "transfer">(
    (editing?.jenis as "masuk" | "keluar" | "transfer") ?? "keluar"
  );
  const [tanggal, setTanggal] = useState(editing?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [jumlah, setJumlah] = useState(editing ? String(editing.jumlah) : "");
  const [akunId, setAkunId] = useState(editing?.akunId ?? akun[0]?.id ?? "");
  const [akunTujuanId, setAkunTujuanId] = useState(editing?.akunTujuanId ?? "");
  const [kategoriId, setKategoriId] = useState(editing?.kategoriId ?? "");
  const [catatan, setCatatan] = useState(editing?.catatan ?? "");
  const [error, setError] = useState<string>();

  const akunOptions = akun.map((a) => ({ value: a.id, label: a.nama }));
  const kategoriOptions = kategori
    .filter((k) => k.jenis === (jenis === "masuk" ? "masuk" : "keluar"))
    .map((k) => ({ value: k.id, label: k.nama }));

  function submit() {
    setError(undefined);
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("jenis", jenis);
    fd.set("tanggal", tanggal);
    fd.set("jumlah", jumlah);
    fd.set("akunId", akunId);
    fd.set("akunTujuanId", akunTujuanId);
    fd.set("kategoriId", kategoriId);
    fd.set("catatan", catatan);
    startTransition(async () => {
      const res = editing ? await updateTransaksi(fd) : await createTransaksi(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Transaksi" : "Transaksi Baru"}>
      {akun.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada akun. Tambahkan akun dulu di halaman Akun.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1">
            {(["masuk", "keluar", "transfer"] as const).map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setJenis(j)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold capitalize transition",
                  jenis === j ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {j}
              </button>
            ))}
          </div>

          <div>
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" className="h-10" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
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
          <div>
            <Label className="text-xs">{jenis === "transfer" ? "Dari akun" : "Akun"}</Label>
            <Combobox options={akunOptions} value={akunId} onChange={setAkunId} placeholder="Pilih akun" />
          </div>

          {jenis === "transfer" ? (
            <div>
              <Label className="text-xs">Ke akun</Label>
              <Combobox
                options={akunOptions}
                value={akunTujuanId}
                onChange={setAkunTujuanId}
                placeholder="Pilih akun tujuan"
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs">Kategori</Label>
              <Combobox
                options={kategoriOptions}
                value={kategoriId}
                onChange={setKategoriId}
                placeholder="Pilih kategori"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Catatan (opsional)</Label>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>

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
  row: TxRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!row) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      const res = await deleteTransaksi(fd);
      if (res.ok) onDone();
      else alert(res.error);
    });
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Hapus transaksi?">
      <p className="text-sm text-muted-foreground">
        Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa dibatalkan.
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
