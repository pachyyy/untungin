/**
 * Pure mapping from raw .mmbak (Realbyte Money Manager SQLite) rows to the
 * Uang schema's shape. No I/O here — both the CLI importer (better-sqlite3)
 * and a future in-app importer (sql.js) run a `SELECT *` against the same
 * tables and get plain objects with these exact column names, so this module
 * is shared between them and the mapping rules can't drift.
 *
 * Everything below is keyed to id-independent `sumberUid` strings (the
 * .mmbak row's own uid) — the caller resolves those to real cuids after
 * upserting, since e.g. an Akun needs its GrupAkun's *database* id, not the
 * backup's uid.
 */

export type RawAssetGroup = {
  uid: string;
  ACC_GROUP_NAME: string;
  TYPE: number;
  ORDERSEQ: number;
  IS_DEL: number;
};

export type RawAsset = {
  uid: string;
  NIC_NAME: string;
  groupUid: string;
  ORDERSEQ: number;
  ZDATA1: string | null;
};

export type RawCategory = {
  uid: string;
  NAME: string;
  TYPE: number; // 0 = income (masuk), 1 = expense (keluar)
  ORDERSEQ: number;
  pUid: string | null;
  C_IS_DEL: number | null;
};

export type RawInOutcome = {
  uid: string;
  DO_TYPE: string; // "0" masuk, "1" keluar, "3"/"4" transfer legs, "7" penyesuaian
  ZDATE: string; // epoch ms
  ZMONEY: string; // always positive
  ZCONTENT: string | null;
  assetUid: string | null;
  toAssetUid: string | null;
  ctgUid: string | null;
  txUidTrans: string | null;
  IS_DEL: number;
};

export type MappedGrupAkun = {
  sumberUid: string;
  nama: string;
  tipe: number;
  urutan: number;
  aktif: boolean;
};

export type MappedAkun = {
  sumberUid: string;
  nama: string;
  grupSumberUid: string;
  urutan: number;
  catatan: string | null;
};

export type MappedKategori = {
  sumberUid: string;
  nama: string;
  jenis: "masuk" | "keluar";
  urutan: number;
  aktif: boolean;
  parentSumberUid: string | null;
};

export type MappedTransaksi =
  | {
      kind: "masuk" | "keluar" | "penyesuaian";
      sumberUid: string;
      tanggal: Date;
      jumlah: number;
      catatan: string | null;
      akunSumberUid: string;
      kategoriSumberUid: string | null;
    }
  | {
      kind: "transfer";
      sumberUid: string; // txUidTrans
      tanggal: Date;
      jumlah: number;
      catatan: string | null;
      akunSumberUid: string;
      akunTujuanSumberUid: string;
    };

export function mapGrupAkun(row: RawAssetGroup): MappedGrupAkun {
  return {
    sumberUid: row.uid,
    nama: row.ACC_GROUP_NAME,
    tipe: row.TYPE,
    urutan: row.ORDERSEQ,
    aktif: row.IS_DEL !== 1,
  };
}

export function mapAkun(row: RawAsset): MappedAkun {
  return {
    sumberUid: row.uid,
    nama: row.NIC_NAME,
    grupSumberUid: row.groupUid,
    urutan: row.ORDERSEQ,
    catatan: row.ZDATA1 && row.ZDATA1.trim() ? row.ZDATA1.trim() : null,
  };
}

export function mapKategori(row: RawCategory): MappedKategori {
  return {
    sumberUid: row.uid,
    nama: row.NAME,
    jenis: row.TYPE === 0 ? "masuk" : "keluar",
    urutan: row.ORDERSEQ,
    aktif: row.C_IS_DEL !== 1,
    parentSumberUid: row.pUid && row.pUid.trim() ? row.pUid.trim() : null,
  };
}

/** Returns null for DO_TYPE 4 (the mirror leg of a transfer — skip it). */
export function mapInOutcome(row: RawInOutcome): MappedTransaksi | null {
  const tanggal = new Date(Number(row.ZDATE));
  const jumlah = Math.round(Number(row.ZMONEY));
  const catatan = row.ZCONTENT && row.ZCONTENT.trim() ? row.ZCONTENT.trim() : null;

  switch (row.DO_TYPE) {
    case "0":
      return {
        kind: "masuk",
        sumberUid: row.uid,
        tanggal,
        jumlah,
        catatan,
        akunSumberUid: row.assetUid!,
        kategoriSumberUid: row.ctgUid,
      };
    case "1":
      return {
        kind: "keluar",
        sumberUid: row.uid,
        tanggal,
        jumlah,
        catatan,
        akunSumberUid: row.assetUid!,
        kategoriSumberUid: row.ctgUid,
      };
    case "7":
      return {
        kind: "penyesuaian",
        sumberUid: row.uid,
        tanggal,
        jumlah,
        catatan,
        akunSumberUid: row.assetUid!,
        kategoriSumberUid: null,
      };
    case "3":
      return {
        kind: "transfer",
        sumberUid: row.txUidTrans!,
        tanggal,
        jumlah,
        catatan,
        akunSumberUid: row.assetUid!,
        akunTujuanSumberUid: row.toAssetUid!,
      };
    case "4":
      return null; // mirror leg of the transfer above — collapsed into one row
    default:
      return null;
  }
}
