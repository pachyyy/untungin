/**
 * Turns Prisma rows into JSON DTOs for the mobile API. Dates become ISO
 * strings; totals/profit are computed server-side via lib/calc.ts rather
 * than trusting the client to derive them from the raw lines.
 *
 * Row types here are structural ("Row" types), matching lib/calc.ts's own
 * *Like types rather than Prisma's generated payload types — a service's
 * query can add or reorder `include`d fields without this file needing to
 * change in lockstep, and calc.ts's functions already accept exactly this
 * shape.
 *
 * Cost/profit fields (modalSaat, hargaModal, untung, modal) are present
 * only for `role: "owner"`. This is the actual enforcement point — staff
 * DTOs never contain these fields, not "hidden in the UI" and trusted not
 * to be read from the response.
 */
import {
  totalPesanan,
  totalDibayar,
  untungPesanan,
  untungRealisasi,
  modalPesanan,
} from "@/lib/calc";
import type { DeviceRole } from "@/lib/api/auth";
import type { DashboardData } from "@/lib/services/dashboard";
import type { LaporanData } from "@/lib/services/laporan";
import type { DeviceListItem } from "@/lib/services/devices";

// ---------------------------------------------------------------- Pesanan

type ItemRow = {
  id: string;
  produkId: string | null;
  produk: { nama: string } | null;
  namaManual: string | null;
  jumlah: number;
  hargaSaat: number;
  modalSaat: number;
  keterangan: string | null;
};

type PaketKomponenRow = {
  id: string;
  produkId: string;
  produk: { nama: string };
  pcs: number;
  modalSaat: number;
};

type PaketRow = {
  id: string;
  nama: string;
  harga: number;
  keterangan: string | null;
  komponen: PaketKomponenRow[];
};

type PembayaranRow = {
  id: string;
  tanggal: Date;
  metode: string | null;
  jumlah: number;
  jenis: string;
};

export type PesananRow = {
  id: string;
  nomor: number;
  namaCustomer: string;
  noHp: string | null;
  customerId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  items: ItemRow[];
  pakets: PaketRow[];
  pembayaran: PembayaranRow[];
};

function serializeItem(it: ItemRow, includeCost: boolean) {
  return {
    id: it.id,
    produkId: it.produkId,
    nama: it.produk?.nama ?? it.namaManual ?? "",
    jumlah: it.jumlah,
    hargaSaat: it.hargaSaat,
    keterangan: it.keterangan,
    ...(includeCost ? { modalSaat: it.modalSaat } : {}),
  };
}

function serializePaket(pk: PaketRow, includeCost: boolean) {
  return {
    id: pk.id,
    nama: pk.nama,
    harga: pk.harga,
    keterangan: pk.keterangan,
    komponen: pk.komponen.map((k) => ({
      id: k.id,
      produkId: k.produkId,
      nama: k.produk.nama,
      pcs: k.pcs,
      ...(includeCost ? { modalSaat: k.modalSaat } : {}),
    })),
  };
}

export function serializePembayaran(b: PembayaranRow) {
  return {
    id: b.id,
    tanggal: b.tanggal.toISOString(),
    metode: b.metode,
    jumlah: b.jumlah,
    jenis: b.jenis,
  };
}

export function serializePesanan(p: PesananRow, role: DeviceRole) {
  const includeCost = role === "owner";
  const total = totalPesanan(p);
  const dibayar = totalDibayar(p);

  const base = {
    id: p.id,
    nomor: p.nomor,
    namaCustomer: p.namaCustomer,
    noHp: p.noHp,
    customerId: p.customerId,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    items: p.items.map((it) => serializeItem(it, includeCost)),
    pakets: p.pakets.map((pk) => serializePaket(pk, includeCost)),
    pembayaran: p.pembayaran.map(serializePembayaran),
    total,
    dibayar,
    sisa: total - dibayar,
  };

  if (!includeCost) return base;
  return {
    ...base,
    modal: modalPesanan(p),
    // Asking-price estimate vs. what was actually realized — see lib/calc.ts;
    // they diverge for a discounted/forced-lunas (tandaiLunas) or overpaid order.
    untung: untungPesanan(p),
    untungRealisasi: untungRealisasi(p),
  };
}

// ----------------------------------------------------------------- Produk

type ProdukRow = {
  id: string;
  nama: string;
  stok: number;
  hargaModal: number;
  supplierId: string;
  supplier?: { nama: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeProduk(p: ProdukRow, role: DeviceRole) {
  const base = {
    id: p.id,
    nama: p.nama,
    stok: p.stok,
    supplierId: p.supplierId,
    supplierNama: p.supplier?.nama,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
  if (role !== "owner") return base;
  return { ...base, hargaModal: p.hargaModal };
}

type RestockRow = { id: string; qty: number; hargaBeli: number; tanggal: Date };

export function serializeRestock(r: RestockRow) {
  return { id: r.id, qty: r.qty, hargaBeli: r.hargaBeli, tanggal: r.tanggal.toISOString() };
}

// -------------------------------------------------------------- Pelanggan

type CustomerRow = {
  id: string;
  nama: string;
  noHp: string | null;
  catatan: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeCustomer(c: CustomerRow) {
  return {
    id: c.id,
    nama: c.nama,
    noHp: c.noHp,
    catatan: c.catatan,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// --------------------------------------------------------------- Supplier

type SupplierRow = { id: string; nama: string; kontak: string | null };

export function serializeSupplier(s: SupplierRow, jumlahProduk?: number) {
  return {
    id: s.id,
    nama: s.nama,
    kontak: s.kontak,
    ...(jumlahProduk !== undefined ? { jumlahProduk } : {}),
  };
}

// -------------------------------------------------------------- Dashboard

export function serializeDashboard(d: DashboardData, role: DeviceRole) {
  const base = {
    pendingCount: d.pendingCount,
    pendingOmzet: d.pendingOmzet,
    stokMenipis: d.stokMenipis,
  };
  if (role !== "owner") return base;
  return { ...base, untung: d.untung, omzet: d.omzet, nilaiStok: d.nilaiStok };
}

// --------------------------------------------------------------- Laporan

// Owner-only route (see the API route table in CLAUDE.md), so no staff
// variant — this wrapper exists mainly so a future field addition to
// LaporanData doesn't leak into the response by accident.
export function serializeLaporan(d: LaporanData) {
  return {
    chartData: d.chartData,
    totOmzet: d.totOmzet,
    totModal: d.totModal,
    totUntung: d.totUntung,
    topProduk: d.topProduk,
  };
}

// ----------------------------------------------------------------- Device

export function serializeDevice(d: DeviceListItem) {
  return {
    id: d.id,
    nama: d.nama,
    role: d.role,
    lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
    revokedAt: d.revokedAt ? d.revokedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  };
}
