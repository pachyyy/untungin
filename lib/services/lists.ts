import { prisma } from "@/lib/prisma";
import { formatTanggal } from "@/lib/format";
import { toDateOnlyJakarta } from "@/lib/date";

const RIWAYAT_RESTOCK_LIMIT = 5;

/** Shape consumed by PesananManager — unchanged from the pre-extraction
 * app/(app)/pesanan/page.tsx. */
export async function getPesananListView() {
  const [pesanan, produk, customers] = await Promise.all([
    prisma.pesanan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: {
            produk: { select: { nama: true } },
          },
        },
        pakets: {
          orderBy: { id: "asc" },
          include: {
            komponen: {
              include: { produk: { select: { nama: true } } },
            },
          },
        },
        pembayaran: {
          orderBy: { tanggal: "asc" },
        },
      },
    }),
    prisma.produk.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, stok: true },
    }),
    prisma.customer.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, noHp: true },
    }),
  ]);

  return {
    pesanan: pesanan.map((p) => ({
      id: p.id,
      nomor: p.nomor,
      namaCustomer: p.namaCustomer,
      noHp: p.noHp,
      status: p.status,
      tanggal: formatTanggal(p.createdAt),
      createdAtIso: p.createdAt.toISOString(),
      items: p.items.map((it) => ({
        id: it.id,
        produkId: it.produkId,
        nama: it.produk?.nama ?? it.namaManual ?? "",
        jumlah: it.jumlah,
        hargaSaat: it.hargaSaat,
        modalSaat: it.modalSaat,
        keterangan: it.keterangan,
      })),
      pakets: p.pakets.map((pk) => ({
        id: pk.id,
        nama: pk.nama,
        harga: pk.harga,
        keterangan: pk.keterangan,
        komponen: pk.komponen.map((k) => ({
          id: k.id,
          produkId: k.produkId,
          nama: k.produk.nama,
          pcs: k.pcs,
          modalSaat: k.modalSaat,
        })),
      })),
      pembayaran: p.pembayaran.map((b) => ({
        id: b.id,
        tanggal: toDateOnlyJakarta(b.tanggal),
        tanggalLabel: formatTanggal(b.tanggal),
        metode: b.metode,
        jumlah: b.jumlah,
        jenis: b.jenis,
      })),
    })),
    produk,
    customers,
  };
}

/** Shape consumed by ProdukManager — unchanged from the pre-extraction
 * app/(app)/produk/page.tsx. */
export async function getProdukListView() {
  const [produk, suppliers] = await Promise.all([
    prisma.produk.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { nama: true } },
        restock: {
          orderBy: { tanggal: "desc" },
          take: RIWAYAT_RESTOCK_LIMIT,
        },
      },
    }),
    prisma.supplier.findMany({ orderBy: { nama: "asc" } }),
  ]);

  return {
    produk: produk.map((p) => ({
      id: p.id,
      nama: p.nama,
      hargaModal: p.hargaModal,
      stok: p.stok,
      supplierId: p.supplierId,
      supplierNama: p.supplier.nama,
      riwayatRestock: p.restock.map((r) => ({
        id: r.id,
        qty: r.qty,
        hargaBeli: r.hargaBeli,
        tanggalLabel: formatTanggal(r.tanggal),
      })),
    })),
    suppliers,
  };
}

/** Shape consumed by SupplierManager — unchanged from the pre-extraction
 * app/(app)/supplier/page.tsx. */
export async function getSupplierListView() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { nama: "asc" },
    include: {
      produk: {
        orderBy: { nama: "asc" },
        select: { id: true, nama: true, stok: true, hargaModal: true },
      },
    },
  });

  return {
    suppliers: suppliers.map((s) => ({
      id: s.id,
      nama: s.nama,
      kontak: s.kontak,
      jumlahProduk: s.produk.length,
      produk: s.produk,
    })),
  };
}

/** Shape consumed by PelangganManager — unchanged from the pre-extraction
 * app/(app)/pelanggan/page.tsx. */
export async function getPelangganListView() {
  const customers = await prisma.customer.findMany({
    orderBy: { nama: "asc" },
    include: {
      pesanan: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { produk: { select: { nama: true } } },
          },
          pakets: {
            include: {
              komponen: {
                include: { produk: { select: { nama: true } } },
              },
            },
          },
        },
      },
    },
  });

  return {
    customers: customers.map((c) => ({
      id: c.id,
      nama: c.nama,
      noHp: c.noHp,
      catatan: c.catatan,
      pesanan: c.pesanan.map((p) => ({
        id: p.id,
        status: p.status,
        tanggal: formatTanggal(p.createdAt),
        noHp: p.noHp,
        items: p.items.map((it) => ({
          id: it.id,
          produkId: it.produkId,
          nama: it.produk?.nama ?? it.namaManual ?? "",
          jumlah: it.jumlah,
          hargaSaat: it.hargaSaat,
          modalSaat: it.modalSaat,
        })),
        pakets: p.pakets.map((pk) => ({
          id: pk.id,
          nama: pk.nama,
          harga: pk.harga,
          komponen: pk.komponen.map((k) => ({
            id: k.id,
            produkId: k.produkId,
            nama: k.produk.nama,
            pcs: k.pcs,
            modalSaat: k.modalSaat,
          })),
        })),
      })),
    })),
  };
}
