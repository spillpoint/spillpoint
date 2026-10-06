// Prints the cap table after each of a case's events, as the engine builds it.
// A dev tool for checking the engine by hand; it reads case files, so it isn't
// part of the package.
//
//   pnpm rounds <case>
//
// Each event shows what it worked out (a round's price, new shares and pool
// top-up) and the cap table after it, fully diluted, with whether it matches
// the case's expected.json. An event the engine doesn't build yet stops the
// list with the engine's own refusal.

import type { Decimal } from "decimal.js";

import { UnsupportedTermError, buildCapTables, parseExact } from "../src/index.ts";
import type { CapTableAfterEvent } from "../src/index.ts";
import { D } from "../src/decimal.ts";
import { readCaseFile } from "../test/support/cases.ts";

const caseName = process.argv[2];
if (!caseName) {
  console.error("usage: pnpm rounds <case>");
  process.exit(2);
}

interface Inputs {
  events: { id: string }[];
}
interface Expected {
  cap_tables?: { after_event: string; details: Record<string, unknown>; cap_table: { positions: { holder: string; security: string; shares: number }[]; unissued_pool: number } }[];
}

const inputs = readCaseFile(caseName, "inputs.json") as Inputs;
if (!inputs.events) {
  console.error(`${caseName} has no events: it's an exit case. Try pnpm payouts ${caseName} <exit value>.`);
  process.exit(2);
}
const expected = (readCaseFile(caseName, "expected.json") as Expected).cap_tables ?? [];

const grouped = (n: Decimal) => {
  const [whole, frac] = n.toFixed(2).split(".") as [string, string];
  const w = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac === "00" ? w : `${w}.${frac}`;
};
const pad = (rows: string[][]) => {
  const widths = rows[0]!.map((_, c) => Math.max(...rows.map((r) => r[c]!.length)));
  return rows.map((r) => r.map((cell, c) => (c >= 2 ? cell.padStart(widths[c]!) : cell.padEnd(widths[c]!))).join("   ")).join("\n");
};

/** The built table's positions and pool against expected.json's. */
function matches(t: CapTableAfterEvent): string {
  const e = expected.find((x) => x.after_event === t.event);
  if (!e) return "no expected cap table to compare";
  const same =
    JSON.stringify(t.capTable.positions.map((p) => [p.holder, p.security, p.shares.toNumber()])) ===
      JSON.stringify(e.cap_table.positions.map((p) => [p.holder, p.security, p.shares])) && t.capTable.unissuedPool.toNumber() === e.cap_table.unissued_pool;
  let price = "";
  if (t.details.kind === "priced_round") {
    const ep = parseExact(e.details.price_per_share, "price");
    price = t.details.price.minus(ep).abs().lte(new D("1e-30")) ? ", price matches" : `, price DIFFERS (expected ${String(e.details.price_per_share)})`;
  }
  return same ? `matches expected.json${price}` : `DIFFERS from expected.json${price}`;
}

function show(t: CapTableAfterEvent): void {
  console.log(`\n== ${t.event}${t.date ? ` (${t.date})` : ""}`);
  const d = t.details;
  if (d.kind === "issue_percent") console.log(`Issued ${grouped(d.sharesIssued)} shares (basis ${grouped(d.basisShares)}).`);
  if (d.kind === "create_pool") console.log(`Pool created: ${grouped(d.poolCreated)} shares (basis ${grouped(d.basisShares)}).`);
  if (d.kind === "priced_round") {
    console.log(`Price: $${d.price.toFixed(10)}   post-money valuation $${grouped(d.postMoneyValuation)}`);
    console.log(`Post-money fully diluted: ${grouped(d.postMoneyFullyDilutedSolved)} solved, ${grouped(d.postMoneyFullyDilutedActual)} as issued`);
    console.log(`New shares: ${d.newShares.map((n) => `${n.holder} ${grouped(n.shares)}`).join(", ")}   pool top-up ${grouped(d.poolTopUp)}`);
  }
  const ct = t.capTable;
  const name = (id: string) => ct.holders.find((h) => h.id === id)?.name ?? id;
  const security = (id: string) => ct.securities.find((s) => s.id === id)!;
  const asConverted = (p: (typeof ct.positions)[number]) => {
    const s = security(p.security);
    return s.kind === "preferred" ? p.shares.times(s.conversionRatio) : p.shares;
  };
  const total = ct.positions.reduce((sum, p) => sum.plus(asConverted(p)), ct.unissuedPool);
  const rows = [["Holder", "Security", "Shares", "Fully diluted"]];
  for (const p of ct.positions) {
    rows.push([name(p.holder), security(p.security).name, grouped(p.shares), `${asConverted(p).div(total).times(100).toFixed(2)}%`]);
  }
  if (!ct.unissuedPool.isZero()) rows.push(["Unissued pool", "", grouped(ct.unissuedPool), `${ct.unissuedPool.div(total).times(100).toFixed(2)}%`]);
  console.log(pad(rows));
  if (t.unconvertedSafes.length) console.log(`SAFEs outstanding: ${t.unconvertedSafes.map((f) => `${f.id} $${grouped(f.purchaseAmount)}`).join(", ")}`);
  if (t.unconvertedNotes.length) console.log(`Notes outstanding: ${t.unconvertedNotes.map((n) => `${n.id} $${grouped(n.principal)}`).join(", ")}`);
  console.log(matches(t));
}

for (let k = 1; k <= inputs.events.length; k++) {
  let built: CapTableAfterEvent[];
  try {
    built = buildCapTables({ ...inputs, events: inputs.events.slice(0, k) });
  } catch (e) {
    console.log(`\n== ${inputs.events[k - 1]!.id}`);
    console.log(e instanceof UnsupportedTermError ? `Not built yet: ${e.message}` : `Refused: ${(e as Error).message}`);
    process.exit(0);
  }
  show(built.at(-1)!);
}
