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
  // Ledger fixtures: products made for the kas checks, the time the run
  // started (to delete only ledger rows this run wrote), and whether the real
  // database already had balances set up (if not, this run creates the
  // KasSetting and must remove it again).
  const kasProdukIds: string[] = [];
  const smokeStart = new Date();
  let kasWasAktif = true;

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
    const staffStrukPatch = await call("PATCH", "/struk-setting", { namaToko: "__SMOKE__" }, staffToken);
    check("staff PATCH /struk-setting 403", staffStrukPatch.status === 403, staffStrukPatch);
    // An empty body must change nothing (absent keys keep their value) — so
    // this writes the real setting back unchanged instead of wiping it.
    const emptyStrukPatch = await call("PATCH", "/struk-setting", {}, ownerToken);
    check(
      "owner PATCH /struk-setting {} keeps every field",
      emptyStrukPatch.status === 200 &&
        JSON.stringify(emptyStrukPatch.json) === JSON.stringify(strukSetting.json),
      emptyStrukPatch
    );
    // namaToko is optional (blank is valid), so the validation case is the
    // length cap — a blank PATCH would succeed and wipe the real setting.
    const badStrukPatch = await call("PATCH", "/struk-setting", { namaToko: "x".repeat(101) }, ownerToken);
    check("owner PATCH /struk-setting 101-char namaToko 400", badStrukPatch.status === 400, badStrukPatch);

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

    // ------------------------------------------- batal (cancel) an order
    // Uses its own 2-pcs order so stock arithmetic is independent of the
    // order the rest of the script is still holding (stock is 4 here).
    const batalOrder = await call(
      "POST",
      "/pesanan",
      { namaCustomer: "__SMOKE_BATAL__", items: [{ produkId, jumlah: 2, hargaSaat: 2000 }], pakets: [] },
      staffToken
    );
    check("batal: create order 201", batalOrder.status === 201, batalOrder);
    const batalId = batalOrder.json.id;
    await call("POST", `/pesanan/${batalId}/pembayaran`, { jumlah: 1000, jenis: "cicilan" }, staffToken);
    const stokBeforeBatal = (await call("GET", "/produk", undefined, ownerToken)).json.find((p: any) => p.id === produkId);
    check("batal: stock 4 -> 2 after order", stokBeforeBatal?.stok === 2, stokBeforeBatal);

    const staffBatal = await call("POST", `/pesanan/${batalId}/batal`, undefined, staffToken);
    check("staff batal -> 403", staffBatal.status === 403, staffBatal);

    const ownerBatal = await call("POST", `/pesanan/${batalId}/batal`, undefined, ownerToken);
    check("owner batal 200", ownerBatal.status === 200, ownerBatal);
    const batalDetail = await call("GET", `/pesanan/${batalId}`, undefined, ownerToken);
    check("batal: status dibatalkan", batalDetail.json.status === "dibatalkan", batalDetail.json);
    check("batal: payment kept as history", batalDetail.json.pembayaran?.length === 1, batalDetail.json);
    const stokAfterBatal = (await call("GET", "/produk", undefined, ownerToken)).json.find((p: any) => p.id === produkId);
    check("batal: stock returned 2 -> 4", stokAfterBatal?.stok === 4, stokAfterBatal);

    const batalAgain = await call("POST", `/pesanan/${batalId}/batal`, undefined, ownerToken);
    check("batal twice -> 409 (stock not returned twice)", batalAgain.status === 409, batalAgain);
    const batalPay = await call("POST", `/pesanan/${batalId}/pembayaran`, { jumlah: 500, jenis: "cicilan" }, staffToken);
    check("pay a cancelled order -> 409", batalPay.status === 409, batalPay);
    const batalEdit = await call(
      "PATCH",
      `/pesanan/${batalId}`,
      { namaCustomer: "__SMOKE_BATAL__", items: [{ produkId, jumlah: 1, hargaSaat: 2000 }], pakets: [] },
      staffToken
    );
    check("edit a cancelled order -> 409", batalEdit.status === 409, batalEdit);
    const batalLunas = await call("POST", `/pesanan/${batalId}/lunas`, undefined, ownerToken);
    check("tandaiLunas on a cancelled order -> 409", batalLunas.status === 409, batalLunas);
    const batalPayDelete = await call(
      "DELETE",
      `/pesanan/${batalId}/pembayaran/${batalDetail.json.pembayaran[0].id}`,
      undefined,
      ownerToken
    );
    check("delete payment on cancelled order 200", batalPayDelete.status === 200, batalPayDelete);
    const stillBatal = await call("GET", `/pesanan/${batalId}`, undefined, ownerToken);
    check("removing its payment doesn't revive it", stillBatal.json.status === "dibatalkan", stillBatal.json);

    const batalList = await call("GET", "/pesanan?status=dibatalkan&limit=100", undefined, ownerToken);
    check(
      "list filters by dibatalkan",
      batalList.json.items?.some((x: any) => x.id === batalId),
      batalList.json
    );

    const delBatal = await call("DELETE", `/pesanan/${batalId}`, undefined, ownerToken);
    check("delete cancelled order 200", delBatal.status === 200, delBatal);
    const stokAfterDelBatal = (await call("GET", "/produk", undefined, ownerToken)).json.find((p: any) => p.id === produkId);
    check("deleting a cancelled order doesn't return stock again (4)", stokAfterDelBatal?.stok === 4, stokAfterDelBatal);

    // ------------------------------------------ delete order, stock returns
    const delPesanan = await call("DELETE", `/pesanan/${pesananId}`, undefined, ownerToken);
    check("delete pesanan 200", delPesanan.status === 200, delPesanan);
    pesananId = "";
    const stokAfterDelete = await call("GET", "/produk", undefined, ownerToken);
    const p3 = stokAfterDelete.json.find((p: any) => p.id === produkId);
    check("stock restored 4 -> 5", p3?.stok === 5, p3);

    // ----------------------------------------------- kas (modal / saldo)
    const kasGet = async () => (await call("GET", "/kas", undefined, ownerToken)).json;
    const kasDelta = async (before: any) => {
      const now = await kasGet();
      return { modal: now.modal - before.modal, saldo: now.saldo - before.saldo };
    };
    const same = (d: any, modal: number, saldo: number) => d.modal === modal && d.saldo === saldo;

    const kas0 = await kasGet();
    kasWasAktif = kas0.aktif === true;
    check("staff GET /kas -> 403", (await call("GET", "/kas", undefined, staffToken)).status === 403);
    check("staff PUT /kas -> 403", (await call("PUT", "/kas", { modal: 1, saldo: 1 }, staffToken)).status === 403);
    check("staff GET /kas/mutasi -> 403", (await call("GET", "/kas/mutasi", undefined, staffToken)).status === 403);
    check("staff tarik -> 403", (await call("POST", "/kas/tarik", { jumlah: 1 }, staffToken)).status === 403);
    check(
      "tarik with no setup -> 400 (when not set up)",
      kasWasAktif || (await call("POST", "/kas/tarik", { jumlah: 1 }, ownerToken)).status === 400
    );

    // Before the starting balances exist nothing may be recorded.
    const preProduk = await call(
      "POST",
      "/produk",
      { nama: "__SMOKE_KAS_PRE__", hargaModal: 1000, stok: 3, supplierId },
      ownerToken
    );
    kasProdukIds.push(preProduk.json.id);
    if (!kasWasAktif) {
      const hist = await call("GET", "/kas/mutasi", undefined, ownerToken);
      check("nothing recorded before setup", hist.json.items?.length === 0, hist.json);
      const setup = await call("PUT", "/kas", { modal: 100000, saldo: 50000 }, ownerToken);
      check(
        "PUT /kas first call sets starting balances",
        setup.json.aktif && setup.json.modal === 100000 && setup.json.saldo === 50000,
        setup.json
      );
    }
    const b0 = await kasGet();
    check("kas is active", b0.aktif === true, b0);

    const k2 = await call("POST", "/produk", { nama: "__SMOKE_KAS__", hargaModal: 1000, stok: 2, supplierId }, ownerToken);
    kasProdukIds.push(k2.json.id);
    check("new product stok 2 x 1000 -> modal -2000", same(await kasDelta(b0), -2000, 0), await kasDelta(b0));

    const bRestock = await kasGet();
    await call("POST", `/produk/${k2.json.id}/restock`, { qty: 8, hargaBeli: 1250 }, ownerToken);
    check("restock 8 x 1250 -> modal -10000", same(await kasDelta(bRestock), -10000, 0), await kasDelta(bRestock));

    const bEdit = await kasGet();
    await call(
      "PATCH",
      `/produk/${k2.json.id}`,
      { nama: "__SMOKE_KAS__", hargaModal: 1200, stok: 14, stokAwal: 10, supplierId },
      ownerToken
    );
    check("edit raising stok by 4 @1200 -> modal -4800", same(await kasDelta(bEdit), -4800, 0), await kasDelta(bEdit));
    const bLower = await kasGet();
    await call(
      "PATCH",
      `/produk/${k2.json.id}`,
      { nama: "__SMOKE_KAS__", hargaModal: 1200, stok: 12, stokAwal: 14, supplierId },
      ownerToken
    );
    check("edit lowering stok moves no money", same(await kasDelta(bLower), 0, 0), await kasDelta(bLower));

    // Order: price 2000, cost snapshot 1200 -> each payment splits 60/40.
    const bOrder = await kasGet();
    const ko = await call(
      "POST",
      "/pesanan",
      { namaCustomer: "__SMOKE_KAS_CUST__", items: [{ produkId: k2.json.id, jumlah: 1, hargaSaat: 2000 }], pakets: [] },
      ownerToken
    );
    check("creating an order moves no money", same(await kasDelta(bOrder), 0, 0), await kasDelta(bOrder));
    const koId = ko.json.id;

    const bPay1 = await kasGet();
    await call("POST", `/pesanan/${koId}/pembayaran`, { jumlah: 1000, jenis: "cicilan" }, ownerToken);
    check("payment 1000 -> modal +600, saldo +400", same(await kasDelta(bPay1), 600, 400), await kasDelta(bPay1));
    const bPay2 = await kasGet();
    const pay2 = await call("POST", `/pesanan/${koId}/pembayaran`, { jumlah: 1000, jenis: "cicilan" }, ownerToken);
    check("payment 2 (modal share hits the cost cap) -> +600 / +400", same(await kasDelta(bPay2), 600, 400), await kasDelta(bPay2));
    const bPay3 = await kasGet();
    await call("POST", `/pesanan/${koId}/pembayaran`, { jumlah: 500, jenis: "cicilan" }, ownerToken);
    check("overpayment 500 goes entirely to saldo", same(await kasDelta(bPay3), 0, 500), await kasDelta(bPay3));

    const bDelPay = await kasGet();
    await call("DELETE", `/pesanan/${koId}/pembayaran/${pay2.json.id}`, undefined, ownerToken);
    check("deleting a payment reverses its split", same(await kasDelta(bDelPay), -600, -400), await kasDelta(bDelPay));

    const bBatal = await kasGet();
    check("cancel an order with payments 200", (await call("POST", `/pesanan/${koId}/batal`, undefined, ownerToken)).status === 200);
    check("cancel reverses the remaining payments (-600 / -900)", same(await kasDelta(bBatal), -600, -900), await kasDelta(bBatal));
    check("order back to net zero after cancel", same(await kasDelta(bOrder), 0, 0), await kasDelta(bOrder));
    const histBatal = await call("GET", "/kas/mutasi?limit=50", undefined, ownerToken);
    check("history shows 'batal' rows", histBatal.json.items.some((m: any) => m.jenis === "batal"), histBatal.json.items.slice(0, 5));
    await call("DELETE", `/pesanan/${koId}`, undefined, ownerToken);
    check("deleting the cancelled order leaves balances unchanged", same(await kasDelta(bOrder), 0, 0), await kasDelta(bOrder));

    // Full single payment, then deleting the order reverses it entirely.
    const bFull = await kasGet();
    const kp = await call(
      "POST",
      "/pesanan",
      { namaCustomer: "__SMOKE_KAS_CUST__", items: [{ produkId: k2.json.id, jumlah: 1, hargaSaat: 2000 }], pakets: [] },
      ownerToken
    );
    await call("POST", `/pesanan/${kp.json.id}/pembayaran`, { jumlah: 2000, jenis: "bayar" }, ownerToken);
    check("full payment 2000 -> modal +1200, saldo +800", same(await kasDelta(bFull), 1200, 800), await kasDelta(bFull));
    await call("DELETE", `/pesanan/${kp.json.id}`, undefined, ownerToken);
    check("deleting a paid order reverses it", same(await kasDelta(bFull), 0, 0), await kasDelta(bFull));

    // Below-cost order: the loss shows up as negative saldo, total still adds up.
    const bLoss = await kasGet();
    const lo = await call(
      "POST",
      "/pesanan",
      { namaCustomer: "__SMOKE_KAS_CUST__", items: [{ produkId: k2.json.id, jumlah: 1, hargaSaat: 1000 }], pakets: [] },
      ownerToken
    );
    await call("POST", `/pesanan/${lo.json.id}/pembayaran`, { jumlah: 1000, jenis: "bayar" }, ownerToken);
    check("below-cost order: modal +1200, saldo -200", same(await kasDelta(bLoss), 1200, -200), await kasDelta(bLoss));
    await call("DELETE", `/pesanan/${lo.json.id}`, undefined, ownerToken);

    // Manual moves.
    const bTarik = await kasGet();
    check("tarik 0 -> 400", (await call("POST", "/kas/tarik", { jumlah: 0 }, ownerToken)).status === 400);
    check("tarik 1000 200", (await call("POST", "/kas/tarik", { jumlah: 1000, catatan: "smoke" }, ownerToken)).status === 200);
    check("tarik lowers saldo only", same(await kasDelta(bTarik), 0, -1000), await kasDelta(bTarik));
    const bXfer = await kasGet();
    check("bad transfer direction -> 400", (await call("POST", "/kas/transfer", { arah: "x", jumlah: 5 }, ownerToken)).status === 400);
    await call("POST", "/kas/transfer", { arah: "saldo_ke_modal", jumlah: 500 }, ownerToken);
    check("transfer saldo->modal 500", same(await kasDelta(bXfer), 500, -500), await kasDelta(bXfer));
    await call("POST", "/kas/transfer", { arah: "modal_ke_saldo", jumlah: 200 }, ownerToken);
    check("transfer modal->saldo 200 (net +300 / -300)", same(await kasDelta(bXfer), 300, -300), await kasDelta(bXfer));

    const bSet = await kasGet();
    const setNow = await call("PUT", "/kas", { modal: bSet.modal + 1000, saldo: bSet.saldo }, ownerToken);
    check("PUT /kas later = set current balance (adjustment)", same(await kasDelta(bSet), 1000, 0) && setNow.status === 200, setNow.json);
    const histAll = await call("GET", "/kas/mutasi?limit=2", undefined, ownerToken);
    check("history paginates", histAll.json.items.length === 2 && typeof histAll.json.nextCursor === "string", histAll.json);
    const histNext = await call("GET", `/kas/mutasi?limit=2&cursor=${histAll.json.nextCursor}`, undefined, ownerToken);
    check("history next page differs", histNext.json.items[0]?.id !== histAll.json.items[0]?.id, histNext.json);

    const dashKasOwner = await call("GET", "/dashboard", undefined, ownerToken);
    check(
      "owner dashboard has modal and saldoKeuntungan",
      typeof dashKasOwner.json.modal === "number" && typeof dashKasOwner.json.saldoKeuntungan === "number",
      dashKasOwner.json
    );
    const dashKasStaff = await call("GET", "/dashboard", undefined, staffToken);
    check(
      "staff dashboard has no modal/saldoKeuntungan",
      !("modal" in dashKasStaff.json) && !("saldoKeuntungan" in dashKasStaff.json),
      dashKasStaff.json
    );
  } finally {
    console.log("--- cleanup ---");
    if (pesananId) await call("DELETE", `/pesanan/${pesananId}`, undefined, ownerToken);
    if (produkId) await call("DELETE", `/produk/${produkId}`, undefined, ownerToken);
    if (raceProdukId) await call("DELETE", `/produk/${raceProdukId}`, undefined, ownerToken);
    for (const id of kasProdukIds) await call("DELETE", `/produk/${id}`, undefined, ownerToken);
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
      // Ledger rows written by this run (product purchases/restocks have no
      // FK to clean them up), and the KasSetting too if this run created it —
      // so real balances are exactly as they were.
      const delKas = await prisma.kasMutasi.deleteMany({ where: { createdAt: { gte: smokeStart } } });
      if (!kasWasAktif) await prisma.kasSetting.deleteMany();
      if (delKas.count) console.log(`removed ${delKas.count} ledger row(s) written by this run`);
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
