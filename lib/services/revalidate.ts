import { revalidatePath } from "next/cache";

/**
 * Path sets to revalidate after each kind of mutation. Each set covers every
 * page that displays the affected data — e.g. a produk delete also touches
 * /supplier (per-supplier produk count), a customer delete also touches
 * /pesanan (its customer picker).
 *
 * `revalidatePath` works the same in Server Actions and Route Handlers, so
 * both `lib/actions/*.ts` (web) and the `app/api/v1/*` handlers (mobile)
 * call these after a successful service call — a mobile write must still
 * bust the cache for anyone looking at the web app.
 */

export function revalidatePesananPaths() {
  revalidatePath("/pesanan");
  revalidatePath("/dashboard");
  revalidatePath("/produk");
  revalidatePath("/laporan");
  revalidatePath("/pelanggan");
}

export function revalidatePembayaranPaths() {
  revalidatePath("/pesanan");
  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  revalidatePath("/pelanggan");
}

/** createProduk / updateProduk. */
export function revalidateProdukWrite() {
  revalidatePath("/produk");
  revalidatePath("/dashboard");
  revalidatePath("/supplier");
}

/** deleteProduk. */
export function revalidateProdukDelete() {
  revalidatePath("/produk");
  revalidatePath("/dashboard");
  revalidatePath("/supplier");
}

/** restockProduk. */
export function revalidateRestockPaths() {
  revalidatePath("/produk");
  revalidatePath("/dashboard");
}

/** createSupplier / updateSupplier. */
export function revalidateSupplierWrite() {
  revalidatePath("/supplier");
  revalidatePath("/produk");
}

/** deleteSupplier. */
export function revalidateSupplierDelete() {
  revalidatePath("/supplier");
  revalidatePath("/produk");
}

/** createCustomer / updateCustomer. (resolveCustomerId, used inside
 * createPesanan/updatePesanan, does not revalidate anything itself —
 * revalidatePesananPaths already covers /pelanggan for that path.) */
export function revalidateCustomerWrite() {
  revalidatePath("/pelanggan");
  revalidatePath("/pesanan");
}

/** deleteCustomer. */
export function revalidateCustomerDelete() {
  revalidatePath("/pelanggan");
  revalidatePath("/pesanan");
}

/** updateStrukSetting — /pesanan reads the setting for its Cetak Struk modal
 * and nota-number labels. */
export function revalidateStrukWrite() {
  revalidatePath("/settings");
  revalidatePath("/settings/struk");
  revalidatePath("/pesanan");
}
