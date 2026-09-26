/**
 * Smoke test for app/api/v1/* — owner login, enroll a staff device, exercise
 * the CRUD/payment/role-boundary paths and the concurrent-stock guard, then
 * clean up every row it created.
 *
 * Run against a running dev server (`npm run dev`) and the REAL database
 * configured in .env — there is no separate test database for this project.
 * Only ever creates rows named "__SMOKE_*" or devices labeled "Smoke *", and
 * cleans all of them up in a `finally` regardless of where the run fails, so
 * re-running after a failure is always safe.
 *
 * A plain Node script (not bash+curl+jq) because jq isn't installed by
 * default on Windows, where this project is developed, while Node already
 * is (it's the runtime). `fetch` is built in since Node 18.
 *
 * Usage: npx tsx scripts/api-smoke.ts
 * (reads APP_PASSWORD from .env; override with APP_PASSWORD=... on the
 * command line, and BASE_URL=http://localhost:3000 to point elsewhere.)
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- every response body
   here is untrusted, dynamically-shaped JSON from the API under test; the
   `check()` calls are exactly what's validating its actual shape. Typing
   this file's ApiResult.json as `unknown` would just push a cast onto every
   single assertion below instead. */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000") + "/api/v1";

function readEnvPassword(): string {
  if (process.env.APP_PASSWORD) return process.env.APP_PASSWORD;
  const envFile = readFileSync(".env", "utf-8");
  const match = /^APP_PASSWORD=(.*)$/m.exec(envFile);
  if (!match) throw new Error("APP_PASSWORD not set and not found in .env");
  return match[1].trim();
}

let pass = 0;
let fail = 0;

function check(label: string, cond: boolean, actual?: unknown) {
  if (cond) {
    pass++;
    console.log(`OK   ${label}`);
  } else {
    fail++;
    console.log(`FAIL ${label} -- ${JSON.stringify(actual)}`);
  }
}

type ApiResult = { status: number; json: any };

async function call(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<ApiResult> {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // No/invalid JSON body — leave json null, callers that need it will fail
    // their own check with a clear "expected X got null" message.
  }
  return { status: res.status, json };
}

async function main() {
  const appPassword = readEnvPassword();

  let ownerToken = "";
  let supplierId = "";
  let produkId = "";
  let raceProdukId = "";
  let pesananId = "";

  try {
    // ---------------------------------------------------------------- auth
    const owner = await call("POST", "/auth/owner", {
      password: appPassword,
      nama: "Smoke Owner",
    });
    check("owner login 201", owner.status === 201, owner);
    ownerToken = owner.json.accessToken;

    const codeResp = await call("POST", "/devices/codes", { nama: "Smoke Staff" }, ownerToken);
    check("create enroll code 201", codeResp.status === 201, codeResp);
    const code = codeResp.json.code;

    const staff = await call("POST", "/auth/enroll", { code });
    check("staff enroll 201", staff.status === 201, staff);
    const staffToken = staff.json.accessToken;

    const meOwner = await call("GET", "/me", undefined, ownerToken);
    check("me (owner) role", meOwner.json.role === "owner", meOwner.json);
    const meStaff = await call("GET", "/me", undefined, staffToken);
    check("me (staff) role", meStaff.json.role === "staff", meStaff.json);

    const staffDevicesForbidden = await call("GET", "/devices", undefined, staffToken);
    check("staff GET /devices -> 403", staffDevicesForbidden.status === 403, staffDevicesForbidden);

    // ------------------------------------------------- supplier + produk
    const supplier = await call("POST", "/supplier", { nama: "__SMOKE_SUPPLIER__", kontak: "" }, ownerToken);
    check("create supplier 201", supplier.status === 201, supplier);
    supplierId = supplier.json.id;

    const staffSupplierForbidden = await call("POST", "/supplier", { nama: "x" }, staffToken);
    check("staff POST /supplier -> 403", staffSupplierForbidden.status === 403, staffSupplierForbidden);

    const produk = await call(
      "POST",
      "/produk",
      { nama: "__SMOKE_PRODUK__", hargaModal: 1000, stok: 5, supplierId },
      ownerToken
    );
    check("create produk 201", produk.status === 201, produk);
    produkId = produk.json.id;

    // -------------------------------------------------- staff-safe DTOs
    const produkListStaff = await call("GET", "/produk", undefined, staffToken);
    const smokeProdukStaff = produkListStaff.json.find((p: any) => p.id === produkId);
    check(
      "staff produk list: no hargaModal field",
      !!smokeProdukStaff && !("hargaModal" in smokeProdukStaff),
      smokeProdukStaff
    );

    const produkListOwner = await call("GET", "/produk", undefined, ownerToken);
    const smokeProdukOwner = produkListOwner.json.find((p: any) => p.id === produkId);
    check(
      "owner produk list: hargaModal = 1000",
      smokeProdukOwner?.hargaModal === 1000,
      smokeProdukOwner
    );

    // ------------------------------------------------ pesanan (staff creates)
    const pesanan = await call(
      "POST",
      "/pesanan",
      {
        namaCustomer: "__SMOKE_CUSTOMER__",
        items: [{ produkId, jumlah: 1, hargaSaat: 2000, keterangan: "  size L  " }],
        pakets: [],
      },
      staffToken
    );
    check("staff create pesanan 201", pesanan.status === 201, pesanan);
    pesananId = pesanan.json.id;

    const stokAfterOrder = await call("GET", "/produk", undefined, ownerToken);
    const p2 = stokAfterOrder.json.find((p: any) => p.id === produkId);
    check("stock decremented 5 -> 4", p2?.stok === 4, p2);

    const detailStaff = await call("GET", `/pesanan/${pesananId}`, undefined, staffToken);
    check("staff detail: no 'untung' field", !("untung" in detailStaff.json), detailStaff.json);
    check(
      "staff detail: item has no modalSaat",
      !("modalSaat" in detailStaff.json.items[0]),
      detailStaff.json.items[0]
    );

    const detailOwner = await call("GET", `/pesanan/${pesananId}`, undefined, ownerToken);
    check("owner detail: untung = 1000", detailOwner.json.untung === 1000, detailOwner.json);
    check("owner detail: total = 2000", detailOwner.json.total === 2000, detailOwner.json);
    check("detail: nomor is a number", typeof detailOwner.json.nomor === "number", detailOwner.json);
    check(
      "detail: item keterangan trimmed",
      detailOwner.json.items[0]?.keterangan === "size L",
      detailOwner.json.items[0]
    );

    // An APK built before keterangan existed never sends the key — editing
    // an order from it must not wipe the notes.
    const editNoKet = await call(
      "PATCH",
      `/pesanan/${pesananId}`,
      { namaCustomer: "__SMOKE_CUSTOMER__", items: [{ produkId, jumlah: 1, hargaSaat: 2000 }], pakets: [] },
      staffToken
    );
    check("PATCH without keterangan key 200", editNoKet.status === 200, editNoKet);
    const afterNoKet = await call("GET", `/pesanan/${pesananId}`, undefined, staffToken);
    check(
      "keterangan preserved when key absent",
      afterNoKet.json.items[0]?.keterangan === "size L",
      afterNoKet.json.items[0]
    );
    await call(
      "PATCH",
      `/pesanan/${pesananId}`,
      { namaCustomer: "__SMOKE_CUSTOMER__", items: [{ produkId, jumlah: 1, hargaSaat: 2000, keterangan: null }], pakets: [] },
      staffToken
    );
    const afterClear = await call("GET", `/pesanan/${pesananId}`, undefined, staffToken);
    check("keterangan cleared when sent null", afterClear.json.items[0]?.keterangan === null, afterClear.json.items[0]);

    const strukSetting = await call("GET", "/struk-setting", undefined, staffToken);
    check(
      "staff GET /struk-setting 200 with namaToko",
      strukSetting.status === 200 && typeof strukSetting.json?.namaToko === "string",
      strukSetting
    );

    // --------------------------------- concurrent stock guard (last unit)
    const raceProduk = await call(
      "POST",
      "/produk",
      { nama: "__SMOKE_RACE__", hargaModal: 100, stok: 1, supplierId },
      ownerToken
    );
    raceProdukId = raceProduk.json.id;
    const [raceA, raceB] = await Promise.all([
      call(
        "POST",
        "/pesanan",
        { namaCustomer: "__SMOKE_RACE_A__", items: [{ produkId: raceProdukId, jumlah: 1, hargaSaat: 500 }], pakets: [] },
        staffToken
      ),
      call(
        "POST",
        "/pesanan",
        { namaCustomer: "__SMOKE_RACE_B__", items: [{ produkId: raceProdukId, jumlah: 1, hargaSaat: 500 }], pakets: [] },
        staffToken
      ),
    ]);
    const raceStatuses = [raceA.status, raceB.status].sort();
    check(
      "concurrent last-unit order: exactly one 201 and one 409",
      JSON.stringify(raceStatuses) === JSON.stringify([201, 409]),
      { raceA, raceB }
    );
    for (const r of [raceA, raceB]) {
      if (r.status === 201) await call("DELETE", `/pesanan/${r.json.id}`, undefined, ownerToken);
    }

    // ------------------------------------------------------------ payments
    const pay1 = await call(
      "POST",
      `/pesanan/${pesananId}/pembayaran`,
      { jumlah: 2000, jenis: "bayar" },
      staffToken
    );
    check("staff add full payment 201", pay1.status === 201, pay1);

    const afterPay = await call("GET", `/pesanan/${pesananId}`, undefined, ownerToken);
    check("status now lunas", afterPay.json.status === "lunas", afterPay.json);

    const staffDeleteForbidden = await call(
      "DELETE",
      `/pesanan/${pesananId}/pembayaran/${pay1.json.id}`,
      undefined,
      staffToken
    );
    check("staff delete payment -> 403", staffDeleteForbidden.status === 403, staffDeleteForbidden);

    const ownerDelete = await call(
      "DELETE",
      `/pesanan/${pesananId}/pembayaran/${pay1.json.id}`,
      undefined,
      ownerToken
    );
    check("owner delete payment 200", ownerDelete.status === 200, ownerDelete);

    const afterDeletePay = await call("GET", `/pesanan/${pesananId}`, undefined, ownerToken);
    check("status back to belum_bayar", afterDeletePay.json.status === "belum_bayar", afterDeletePay.json);

    // -------------------------------------------------------- tandaiLunas
    await call("POST", `/pesanan/${pesananId}/pembayaran`, { jumlah: 500, jenis: "cicilan" }, staffToken);
    const staffLunasForbidden = await call("POST", `/pesanan/${pesananId}/lunas`, undefined, staffToken);
    check("staff tandaiLunas -> 403", staffLunasForbidden.status === 403, staffLunasForbidden);
    const ownerLunas = await call("POST", `/pesanan/${pesananId}/lunas`, undefined, ownerToken);
    check("owner tandaiLunas 200", ownerLunas.status === 200, ownerLunas);

    // ------------------------------------------ dashboard / laporan trimming
    const dashStaff = await call("GET", "/dashboard", undefined, staffToken);
    check("staff dashboard: no 'untung'", !("untung" in dashStaff.json), dashStaff.json);
    const dashOwner = await call("GET", "/dashboard", undefined, ownerToken);
    check("owner dashboard: has 'untung'", "untung" in dashOwner.json, dashOwner.json);

    const laporanForbidden = await call("GET", "/laporan", undefined, staffToken);
    check("staff GET /laporan -> 403", laporanForbidden.status === 403, laporanForbidden);
    const laporanOwner = await call("GET", "/laporan", undefined, ownerToken);
    check("owner GET /laporan 200", laporanOwner.status === 200, laporanOwner);

    // ------------------------------------------ delete order, stock returns
    const delPesanan = await call("DELETE", `/pesanan/${pesananId}`, undefined, ownerToken);
    check("delete pesanan 200", delPesanan.status === 200, delPesanan);
    pesananId = "";
    const stokAfterDelete = await call("GET", "/produk", undefined, ownerToken);
    const p3 = stokAfterDelete.json.find((p: any) => p.id === produkId);
    check("stock restored 4 -> 5", p3?.stok === 5, p3);
  } finally {
    console.log("--- cleanup ---");
    if (pesananId) await call("DELETE", `/pesanan/${pesananId}`, undefined, ownerToken);
    if (produkId) await call("DELETE", `/produk/${produkId}`, undefined, ownerToken);
    if (raceProdukId) await call("DELETE", `/produk/${raceProdukId}`, undefined, ownerToken);
    if (supplierId) await call("DELETE", `/supplier/${supplierId}`, undefined, ownerToken);

    if (ownerToken) {
      const customers = await call("GET", "/pelanggan", undefined, ownerToken);
      for (const c of customers.json ?? []) {
        if (typeof c.nama === "string" && c.nama.startsWith("__SMOKE_")) {
          await call("DELETE", `/pelanggan/${c.id}`, undefined, ownerToken);
        }
      }
      const devices = await call("GET", "/devices", undefined, ownerToken);
      for (const d of devices.json ?? []) {
        if (typeof d.nama === "string" && d.nama.startsWith("Smoke ")) {
          await call("DELETE", `/devices/${d.id}`, undefined, ownerToken);
        }
      }
    }

    // DELETE /devices/[id] only revokes (by design — see CLAUDE.md "Mobile
    // client": revoking a device must never touch what it created). That's
    // correct for real usage, but it means every run of this script would
    // otherwise leave a revoked "Smoke Owner"/"Smoke Staff" row behind
    // forever. Hard-delete them directly here instead — safe specifically
    // because they're this script's own fixtures, just enrolled, never used
    // to create anything (createdByDeviceId would be null-able to SetNull
    // either way, so this can't orphan real data even in principle).
    const prisma = new PrismaClient();
    try {
      const delDevices = await prisma.device.deleteMany({
        where: { nama: { startsWith: "Smoke " } },
      });
      const delCodes = await prisma.enrollCode.deleteMany({
        where: { nama: { startsWith: "Smoke " } },
      });
      if (delDevices.count || delCodes.count) {
        console.log(
          `hard-deleted ${delDevices.count} test device(s), ${delCodes.count} test enroll code(s)`
        );
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("SCRIPT ERROR", e);
  process.exit(1);
});
