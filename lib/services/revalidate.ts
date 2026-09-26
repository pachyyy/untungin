import { revalidatePath } from "next/cache";

/**
 * Path sets to revalidate after each kind of mutation, one function per
 * call site as it existed in the pre-refactor `lib/actions/*.ts` files (not
 * one function per resource — several resources revalidate a *smaller* set
 * on delete than on create/update, which looks like it may be an oversight
 * upstream, e.g. deleting a produk doesn't revalidate `/supplier` even though
 * the supplier list shows a per-supplier produk count. Preserved as-is here
 * rather than "fixed" as part of what should be a behavior-neutral
 * extraction — worth a follow-up look, not a Phase 1 change).
 *
 * `revalidatePath` works the same in Server Actions and Route Handlers, so
 * both `lib/actions/*.ts` (web) and the future `app/api/v1/*` handlers
 * (mobile) call these after a successful service call — a mobile write must
 * still bust the cache for anyone looking at the web app.
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

/** deleteProduk — deliberately narrower than revalidateProdukWrite, see
 * module comment. */
export function revalidateProdukDelete() {
  revalidatePath("/produk");
  revalidatePath("/dashboard");
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

/** deleteSupplier — deliberately narrower, see module comment. */
export function revalidateSupplierDelete() {
  revalidatePath("/supplier");
}

/** createCustomer / updateCustomer. (resolveCustomerId, used inside
 * createPesanan/updatePesanan, does not revalidate anything itself —
 * revalidatePesananPaths already covers /pelanggan for that path.) */
export function revalidateCustomerWrite() {
  revalidatePath("/pelanggan");
  revalidatePath("/pesanan");
}

/** deleteCustomer — deliberately narrower, see module comment. */
export function revalidateCustomerDelete() {
  revalidatePath("/pelanggan");
}

/** updateStrukSetting — /pesanan reads the setting for its Cetak Struk modal
 * and nota-number labels. */
export function revalidateStrukWrite() {
  revalidatePath("/settings");
  revalidatePath("/settings/struk");
  revalidatePath("/pesanan");
}
