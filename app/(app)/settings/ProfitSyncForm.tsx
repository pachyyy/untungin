"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { Button } from "@/components/ui/Button";
import { updateProfitSync, sinkronUlangSemua } from "@/lib/actions/pengaturan";

type Opt = { id: string; nama: string };

export function ProfitSyncForm({
  akun,
  kategori,
  akunSumberId,
  akunTujuanId,
  kategoriId,
}: {
  akun: Opt[];
  kategori: Opt[];
  akunSumberId: string;
  akunTujuanId: string;
  kategoriId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [syncing, startSync] = useTransition();
  const [sumber, setSumber] = useState(akunSumberId);
  const [tujuan, setTujuan] = useState(akunTujuanId);
  const [kategoriSel, setKategoriSel] = useState(kategoriId);
  const [msg, setMsg] = useState<string>();

  const akunOptions = akun.map((a) => ({ value: a.id, label: a.nama }));
  const kategoriOptions = kategori.map((k) => ({ value: k.id, label: k.nama }));

  function save() {
    setMsg(undefined);
    const fd = new FormData();
    fd.set("akunSumberId", sumber);
    fd.set("akunTujuanId", tujuan);
    fd.set("kategoriId", kategoriSel);
    startTransition(async () => {
      const res = await updateProfitSync(fd);
      setMsg(res.ok ? "Tersimpan." : res.error);
    });
  }

  function resync() {
    setMsg(undefined);
    startSync(async () => {
      const res = await sinkronUlangSemua();
      setMsg(res.ok ? `${res.jumlah ?? 0} pesanan disinkronkan.` : res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Akun sumber keuntungan</Label>
        <Combobox
          options={akunOptions}
          value={sumber}
          onChange={setSumber}
          placeholder="cth: BCA / Blu / Seabank"
        />
      </div>
      <div>
        <Label className="text-xs">Akun tujuan keuntungan</Label>
        <Combobox
          options={akunOptions}
          value={tujuan}
          onChange={setTujuan}
          placeholder="cth: Keuntungan Jualan"
        />
      </div>
      <div>
        <Label className="text-xs">Kategori penjualan</Label>
        <Combobox
          options={kategoriOptions}
          value={kategoriSel}
          onChange={setKategoriSel}
          placeholder="cth: Penjualan"
        />
      </div>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={pending}
          onClick={save}
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={syncing}
          onClick={resync}
        >
          {syncing ? "Menyinkron…" : "Sinkron ulang semua"}
        </Button>
      </div>
    </div>
  );
}
