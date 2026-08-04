/**
 * One-time (re-runnable) import of a Realbyte Money Manager .mmbak backup
 * into the Uang schema. The .mmbak is a plain, unencrypted SQLite 3 database
 * — read directly with better-sqlite3, no unzip step needed.
 *
 * Idempotent: every row is upserted on `sumberUid` (the backup's own uid),
 * so re-running with a fresher backup only adds what's new. Safe to run
 * repeatedly while the Android app stays in use in parallel.
 *
 * Usage: npx tsx scripts/import-mmbak.ts "<path to .mmbak>"
 */
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import {
  mapGrupAkun,
  mapAkun,
  mapKategori,
  mapInOutcome,
  type RawAssetGroup,
  type RawAsset,
  type RawCategory,
  type RawInOutcome,
} from "../lib/mmbak/transform";

const prisma = new PrismaClient();
const CHUNK = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/import-mmbak.ts <path-to-.mmbak>");
    process.exit(1);
  }

  const db = new Database(filePath, { readonly: true, fileMustExist: true });

  // 1. GrupAkun
  const grupRows = db
    .prepare("SELECT uid, ACC_GROUP_NAME, TYPE, ORDERSEQ, IS_DEL FROM ASSETGROUP")
    .all() as RawAssetGroup[];
  const grupIdBySumber = new Map<string, string>();
  for (const row of grupRows) {
    const m = mapGrupAkun(row);
    const rec = await prisma.grupAkun.upsert({
      where: { sumberUid: m.sumberUid },
      create: {
        sumberUid: m.sumberUid,
        nama: m.nama,
        tipe: m.tipe,
        urutan: m.urutan,
        aktif: m.aktif,
      },
      update: { nama: m.nama, tipe: m.tipe, urutan: m.urutan, aktif: m.aktif },
    });
    grupIdBySumber.set(m.sumberUid, rec.id);
  }
  console.log(`GrupAkun: ${grupRows.length} upserted.`);

  // 2. Akun
  const assetRows = db
    .prepare("SELECT uid, NIC_NAME, groupUid, ORDERSEQ, ZDATA1 FROM ASSETS")
    .all() as RawAsset[];
  const akunIdBySumber = new Map<string, string>();
  for (const row of assetRows) {
    const m = mapAkun(row);
    const grupId = grupIdBySumber.get(m.grupSumberUid);
    if (!grupId) {
      console.warn(`  ! Lewati akun "${m.nama}": grup tidak ditemukan.`);
      continue;
    }
    const rec = await prisma.akun.upsert({
      where: { sumberUid: m.sumberUid },
      create: {
        sumberUid: m.sumberUid,
        nama: m.nama,
        grupId,
        urutan: m.urutan,
        catatan: m.catatan,
      },
      update: { nama: m.nama, grupId, urutan: m.urutan, catatan: m.catatan },
    });
    akunIdBySumber.set(m.sumberUid, rec.id);
  }
  console.log(`Akun: ${akunIdBySumber.size} upserted.`);

  // 3. Kategori — two passes: create flat, then link parents (parentId
  // references another Kategori's cuid, not the backup's uid).
  const catRows = db
    .prepare("SELECT uid, NAME, TYPE, ORDERSEQ, pUid, C_IS_DEL FROM ZCATEGORY")
    .all() as RawCategory[];
  const katIdBySumber = new Map<string, string>();
  for (const row of catRows) {
    const m = mapKategori(row);
    const rec = await prisma.kategori.upsert({
      where: { sumberUid: m.sumberUid },
      create: {
        sumberUid: m.sumberUid,
        nama: m.nama,
        jenis: m.jenis,
        urutan: m.urutan,
        aktif: m.aktif,
      },
      update: { nama: m.nama, jenis: m.jenis, urutan: m.urutan, aktif: m.aktif },
    });
    katIdBySumber.set(m.sumberUid, rec.id);
  }
  let linked = 0;
  for (const row of catRows) {
    const m = mapKategori(row);
    if (!m.parentSumberUid) continue;
    const parentId = katIdBySumber.get(m.parentSumberUid);
    const selfId = katIdBySumber.get(m.sumberUid);
    if (parentId && selfId) {
      await prisma.kategori.update({ where: { id: selfId }, data: { parentId } });
      linked++;
    }
  }
  console.log(`Kategori: ${katIdBySumber.size} upserted (${linked} sub-kategori ditautkan).`);

  // Fallback categories for the 27 orphan ctgUid references in the source data.
  const lainnyaMasuk = await prisma.kategori.upsert({
    where: { sumberUid: "__lainnya_masuk__" },
    create: { sumberUid: "__lainnya_masuk__", nama: "Lainnya", jenis: "masuk", urutan: 9999 },
    update: {},
  });
  const lainnyaKeluar = await prisma.kategori.upsert({
    where: { sumberUid: "__lainnya_keluar__" },
    create: { sumberUid: "__lainnya_keluar__", nama: "Lainnya", jenis: "keluar", urutan: 9999 },
    update: {},
  });

  // 4. Transaksi
  const txRows = db
    .prepare(
      "SELECT uid, DO_TYPE, ZDATE, ZMONEY, ZCONTENT, assetUid, toAssetUid, ctgUid, txUidTrans, IS_DEL FROM INOUTCOME WHERE IS_DEL = 0"
    )
    .all() as RawInOutcome[];

  type Op = { sumberUid: string; data: Parameters<typeof prisma.transaksi.upsert>[0] };
  const ops: Op[] = [];
  let skippedMirror = 0;
  let skippedMissingAkun = 0;

  for (const row of txRows) {
    const m = mapInOutcome(row);
    if (!m) {
      skippedMirror++;
      continue;
    }
    const akunId = akunIdBySumber.get(m.akunSumberUid);
    if (!akunId) {
      skippedMissingAkun++;
      continue;
    }

    if (m.kind === "transfer") {
      const akunTujuanId = akunIdBySumber.get(m.akunTujuanSumberUid);
      if (!akunTujuanId) {
        skippedMissingAkun++;
        continue;
      }
      ops.push({
        sumberUid: m.sumberUid,
        data: {
          where: { sumberUid: m.sumberUid },
          create: {
            sumberUid: m.sumberUid,
            jenis: "transfer",
            tanggal: m.tanggal,
            jumlah: m.jumlah,
            catatan: m.catatan,
            akunId,
            akunTujuanId,
          },
          update: { tanggal: m.tanggal, jumlah: m.jumlah, catatan: m.catatan, akunId, akunTujuanId },
        },
      });
    } else {
      let kategoriId: string | null = null;
      if (m.kind !== "penyesuaian") {
        kategoriId = (m.kategoriSumberUid && katIdBySumber.get(m.kategoriSumberUid)) || null;
        if (!kategoriId) kategoriId = m.kind === "masuk" ? lainnyaMasuk.id : lainnyaKeluar.id;
      }
      ops.push({
        sumberUid: m.sumberUid,
        data: {
          where: { sumberUid: m.sumberUid },
          create: {
            sumberUid: m.sumberUid,
            jenis: m.kind,
            tanggal: m.tanggal,
            jumlah: m.jumlah,
            catatan: m.catatan,
            akunId,
            kategoriId,
          },
          update: { tanggal: m.tanggal, jumlah: m.jumlah, catatan: m.catatan, akunId, kategoriId },
        },
      });
    }
  }

  const batches = chunk(ops, CHUNK);
  let done = 0;
  for (const batch of batches) {
    await prisma.$transaction(batch.map((op) => prisma.transaksi.upsert(op.data)));
    done += batch.length;
    process.stdout.write(`\r  Transaksi: ${done}/${ops.length}`);
  }
  console.log(
    `\nTransaksi: ${ops.length} upserted (skipped ${skippedMirror} mirror legs, ${skippedMissingAkun} missing-akun rows).`
  );

  // Balance report — masuk/penyesuaian add, keluar subtracts, transfer moves
  // between accounts. No stored balance column, matching the source .mmbak.
  const saldoRows = await prisma.transaksi.findMany({
    select: { jenis: true, jumlah: true, akunId: true, akunTujuanId: true },
  });
  const saldo = new Map<string, number>();
  const add = (id: string, delta: number) => saldo.set(id, (saldo.get(id) ?? 0) + delta);
  for (const t of saldoRows) {
    if (t.jenis === "masuk" || t.jenis === "penyesuaian") add(t.akunId, t.jumlah);
    else if (t.jenis === "keluar") add(t.akunId, -t.jumlah);
    else if (t.jenis === "transfer") {
      add(t.akunId, -t.jumlah);
      if (t.akunTujuanId) add(t.akunTujuanId, t.jumlah);
    }
  }
  const akunList = await prisma.akun.findMany({ select: { id: true, nama: true } });
  console.log("\nSaldo per akun:");
  for (const a of akunList.sort((x, y) => (saldo.get(y.id) ?? 0) - (saldo.get(x.id) ?? 0))) {
    console.log(`  ${a.nama.padEnd(28)} ${(saldo.get(a.id) ?? 0).toLocaleString("id-ID").padStart(14)}`);
  }

  db.close();
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
