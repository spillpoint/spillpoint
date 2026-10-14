# spillpoint

Who gets what when a company is sold. Give spillpoint a cap table and an exit value, and it pays out the waterfall: preferences, cumulative dividends, participation, caps, conversions, options, warrants, management carve-outs, and SAFEs and convertible notes still outstanding at the sale. It also finds every **breakpoint** where the payout curve bends or jumps, and explains each one in plain English.

It can also build the cap table from the company's history: shares issued, the option pool, SAFEs and convertible notes, and priced rounds with their pool top-ups, pro-rata, anti-dilution and pay-to-play. Or it can read one from an Open Cap Format export *(0.4.0)* or an OCX workbook *(0.6.0)*, and build the next round on a cap table you already have *(0.5.0)*.

It runs entirely on your machine. There is no network access and no I/O; your cap table never leaves the process.

**The API is settled** *(0.7.0)*. 0.7.0 was the last release that could break code written for an earlier one, and 1.0 has the same API. One behavior changes in 1.0, a fix: `prepare` works on its own frozen copy of the cap table (see [the 1.0 release notes](https://github.com/spillpoint/spillpoint/blob/main/notes/release-1.0.md)). The names code can match on are listed, each with what it means, under [Stable from 1.0](#stable-from-10).

> **The charter and the signed documents govern, not this tool.** spillpoint models common terms with documented defaults. Your documents may differ, and where they do, they win.

## Install

```bash
npm install spillpoint
```

It needs Node 22 or later.

## A worked example: an exit

A founder holds 8,000,000 common. A seed fund holds 2,000,000 Seed Preferred bought at $1.50, which carries a $3,000,000, 1x non-participating preference.

```js
import { findBreakpoints, prepare, readExit, solve, toCents } from "spillpoint";

const exit = readExit({
  cap_table: {
    holders: [
      { id: "ana", name: "Ana (founder)" },
      { id: "fund", name: "Seed Fund" },
    ],
    securities: [
      { id: "common", name: "Common Stock", kind: "common" },
      {
        id: "seed",
        name: "Seed Preferred",
        kind: "preferred",
        original_issue_price: "1.5",
        preference_multiple: "1",
        participation: "non_participating",
      },
    ],
    seniority: [["seed"]],
    positions: [
      { holder: "ana", security: "common", shares: 8000000 },
      { holder: "fund", security: "seed", shares: 2000000 },
    ],
  },
  range: ["0", "60000000"],
  exit_values: ["10000000", "20000000"],
});

const table = prepare(exit.capTable, exit.exitDate);

// Who gets what at each exit value. The engine decides who converts.
for (const value of exit.exitValues) {
  const [answer] = solve(table, value).answers;
  const converts = [...answer.decisions.converted].join(", ") || "nobody";
  console.log(`At $${toCents(value)} (converts: ${converts}):`);
  for (const line of answer.payout.lines) {
    console.log(`  ${line.holder} on ${line.security}: $${toCents(line.amount)}`);
  }
}

// Every breakpoint, with its reasons.
for (const b of findBreakpoints(table, exit.range)) {
  console.log(`Breakpoint at $${toCents(b.exitValue)}:`);
  for (const r of b.reasons) console.log(`  ${r.text}`);
}
```

Output:

```
At $10000000.00 (converts: nobody):
  ana on common: $7000000.00
  fund on seed: $3000000.00
At $20000000.00 (converts: seed):
  ana on common: $16000000.00
  fund on seed: $4000000.00
Breakpoint at $3000000.00:
  Seed Preferred's preference is paid in full here: $3,000,000. Above this exit value, the next dollar goes to Common Stock.
Breakpoint at $15000000.00:
  Seed Preferred converts to common here. Its 2,000,000 as-converted shares are worth $3,000,000 at $1.50 each, the same as its 1x preference of $3,000,000. Below this exit value keeping its preference pays more; above it, converting does.
```

- **At $10M:** the fund takes its $3M preference, and the founder gets the rest.
- **At $20M:** the fund does better converting. It holds 20% as common, which is worth $4M.
- **The switch happens at $15M,** where 20% of the exit equals the $3M preference.

## A worked example: from rounds to an exit

A founder holds 9,000,000 common. The company creates a 10% option pool, then sells a $1,000,000 post-money SAFE capped at $10,000,000. A $5,000,000 Series A at a $20,000,000 pre-money valuation converts the SAFE and tops the pool up to 10%. Then the company is sold.

```js
import { buildCapTables, findBreakpoints, prepare, readInputs, solve, toCents } from "spillpoint";

const company = {
  holders: [
    { id: "ana", name: "Ana (founder)" },
    { id: "seed", name: "Seed Fund" },
    { id: "lead", name: "Series A Fund" },
  ],
  events: [
    {
      id: "founding",
      date: "2023-01-10",
      type: "issue",
      security: { id: "common", name: "Common Stock", kind: "common" },
      issues: [{ holder: "ana", shares: 9000000 }],
    },
    { id: "pool", date: "2023-01-10", type: "create_pool", percent: "10" },
    {
      id: "safe",
      date: "2023-06-01",
      type: "safes",
      safes: [{ id: "seed_safe", holder: "seed", purchase_amount: "1000000", post_money_cap: "10000000" }],
    },
    {
      id: "series_a",
      date: "2024-09-30",
      type: "priced_round",
      series: {
        id: "series_a",
        name: "Series A Preferred",
        kind: "preferred",
        preference_multiple: "1",
        participation: "non_participating",
        anti_dilution: "broad_based",
      },
      pre_money: "20000000",
      investments: [{ holder: "lead", amount: "5000000" }],
      pool_target_unissued_percent_post: "10",
      // The SAFE converts into "Series A Preferred (from SAFEs)", id series_a_safes.
      seniority: [["series_a", "series_a_safes"]],
    },
  ],
};

// The cap table after each event.
for (const { event, capTable, details } of buildCapTables(company)) {
  console.log(`After ${event}:`);
  if (details.kind === "priced_round") {
    console.log(`  priced at $${details.price.toFixed(6)}; the pool tops up by ${details.poolTopUp}`);
    for (const c of details.safeConversions) {
      console.log(`  ${c.safe} converts at its ${c.method}, $${c.conversionPrice.toFixed(6)}, into ${c.shares} shares`);
    }
  }
  for (const p of capTable.positions) console.log(`  ${p.holder} on ${p.security}: ${p.shares}`);
  console.log(`  unissued pool: ${capTable.unissuedPool}`);
  for (const f of capTable.unconvertedSafes ?? []) console.log(`  ${f.id} outstanding: $${toCents(f.purchaseAmount)}`);
}

// An exit on the cap table after the Series A.
const exit = readInputs({
  ...company,
  exit: { cap_table_after_event: "series_a", range: ["0", "100000000"], exit_values: ["20000000", "60000000"] },
});
const table = prepare(exit.capTable, exit.exitDate);
for (const value of exit.exitValues) {
  const [answer] = solve(table, value).answers;
  console.log(`At $${toCents(value)}:`);
  for (const [holder, amount] of answer.payout.holderTotals) console.log(`  ${holder}: $${toCents(amount)}`);
}
for (const b of findBreakpoints(table, exit.range)) {
  console.log(`Breakpoint at $${toCents(b.exitValue)}:`);
  for (const r of b.reasons) console.log(`  ${r.text}`);
}
```

Output:

```
After founding:
  ana on common: 9000000
  unissued pool: 0
After pool:
  ana on common: 9000000
  unissued pool: 1000000
After safe:
  ana on common: 9000000
  unissued pool: 1000000
  seed_safe outstanding: $1000000.00
After series_a:
  priced at $1.730769; the pool tops up by 444444
  seed_safe converts at its cap, $0.900000, into 1111111 shares
  ana on common: 9000000
  seed on series_a_safes: 1111111
  lead on series_a: 2888888
  unissued pool: 1444444
At $20000000.00:
  ana: $13351649.87
  seed: $1648351.67
  lead: $4999998.46
At $60000000.00:
  ana: $41538464.73
  seed: $5128205.01
  lead: $13333330.26
Breakpoint at $5999998.36:
  The preferences of Series A Preferred and Series A Preferred (from SAFEs) are paid in full here: $5,999,998.36. Above this exit value, the next dollar goes to Common Stock.
Breakpoint at $14099998.36:
  Series A Preferred (from SAFEs) converts to common here. Its 1,111,111 as-converted shares are worth $999,999.90 at $0.90 each, the same as its 1x preference of $999,999.90. Below this exit value keeping its preference pays more; above it, converting does.
Breakpoint at $22499998.27:
  Series A Preferred converts to common here. Its 2,888,888 as-converted shares are worth $4,999,998.46 at $1.730769 each, the same as its 1x preference of $4,999,998.46. Below this exit value keeping its preference pays more; above it, converting does.
```

- **The pool** is 10% of the 10,000,000 fully diluted shares after it: 1,000,000.
- **The SAFE converts at its cap.** Its Company Capitalization counts the stock, the pool as it stood before the round, and the SAFE itself: 11,111,111.11 shares. $10,000,000 ÷ 11,111,111.11 is $0.90 a share, so its $1,000,000 buys 1,111,111 shares of "Series A Preferred (from SAFEs)", with the Series A's rights.
- **The SAFE and the pool top-up sit in the pre-money.** So the Series A Fund's $5,000,000 buys a fifth of the company as the round prices it ($5M of $25M post-money): 2,888,888 shares at $1.730769. The founder bears the dilution.
- **At $20M** the SAFE's series has converted to common, and the Series A still takes its preference. **At $60M** both have converted.
- **SAFEs and notes still outstanding** come with the cap table after their event, as `capTable.unconvertedSafes` and `capTable.unconvertedNotes` *(0.2.0)*, and an exit on it pays them.

## A worked example: an earnout

The same company is sold for $10,000,000 at closing, with a $10,000,000 earnout to follow. The waterfall runs on cumulative proceeds, so each payment goes where it would have gone had it all been paid at closing, and every decision is re-made at each step.

```js
import { paySchedule, prepare, readExit, toCents } from "spillpoint";

const exit = readExit({
  cap_table: {
    holders: [
      { id: "ana", name: "Ana (founder)" },
      { id: "fund", name: "Seed Fund" },
    ],
    securities: [
      { id: "common", name: "Common Stock", kind: "common" },
      {
        id: "seed",
        name: "Seed Preferred",
        kind: "preferred",
        original_issue_price: "1.5",
        preference_multiple: "1",
        participation: "non_participating",
      },
    ],
    seniority: [["seed"]],
    positions: [
      { holder: "ana", security: "common", shares: 8000000 },
      { holder: "fund", security: "seed", shares: 2000000 },
    ],
  },
  range: ["0", "60000000"],
  exit_values: [],
  payment_schedules: [
    {
      id: "deal",
      description: "$10M at closing, then a $10M earnout",
      payments: [
        { label: "closing", amount: "10000000" },
        { label: "earnout", amount: "10000000" },
      ],
    },
  ],
});

const table = prepare(exit.capTable, exit.exitDate);

// Each payment's take: the cumulative payout after it, less before it.
for (const take of paySchedule(table, exit.paymentSchedules[0])) {
  const converts = [...take.decisions.converted].join(", ") || "nobody";
  console.log(`${take.label}: $${toCents(take.amount)}, $${toCents(take.cumulative)} so far (converts: ${converts})`);
  for (const line of take.lines) console.log(`  ${line.holder} on ${line.security}: $${toCents(line.amount)}`);
  if (take.lowered.length > 0) console.log(`  running total falls for: ${take.lowered.join(", ")}`);
}
```

Output:

```
closing: $10000000.00, $10000000.00 so far (converts: nobody)
  ana on common: $7000000.00
  fund on seed: $3000000.00
earnout: $10000000.00, $20000000.00 so far (converts: seed)
  ana on common: $9000000.00
  fund on seed: $1000000.00
```

- **The closing** pays the fund its $3M preference, and the founder the rest.
- **The earnout** brings the total to $20M, past the $15M where the fund does better converting. At $20M the fund's 20% as common is worth $4M, so the earnout adds $1M for the fund and $9M for the founder.
- **A take can be negative.** If a later payment tips a series into converting and that takes from someone what an earlier payment gave them, their take is negative. It is reported as is, and `lowered` names them.

## Reading an Open Cap Format export *(0.4.0)*

Open Cap Format (OCF) is developed by the Open Cap Table Coalition: https://open-cap-table-coalition.github.io/Open-Cap-Format-OCF/. spillpoint reads files in that format.

`readOcf(files)` reads an OCF package, versions 1.0 to 1.2, and gives the cap table as of its date. OCF records a ledger of what was issued and what happened to it, not how a round was priced, so an import builds no rounds. You pass the package's files, each already parsed from JSON; opening a .zip is up to you.

```js
import { D, prepare, readCapTable, readOcf, solve, toCents } from "spillpoint";

const usd = (amount) => ({ amount, currency: "USD" });
const ratio = { numerator: "1", denominator: "1" };
const files = [
  {
    name: "Manifest.ocf.json",
    content: {
      file_type: "OCF_MANIFEST_FILE",
      ocf_version: "1.2.0",
      as_of: "2025-06-30",
      issuer: { object_type: "ISSUER", id: "example", legal_name: "Example, Inc." },
      stakeholders_files: [{ filepath: "Stakeholders.ocf.json" }],
      stock_classes_files: [{ filepath: "StockClasses.ocf.json" }],
      transactions_files: [{ filepath: "Transactions.ocf.json" }],
    },
  },
  {
    name: "Stakeholders.ocf.json",
    content: {
      file_type: "OCF_STAKEHOLDERS_FILE",
      items: [
        { object_type: "STAKEHOLDER", id: "ana", name: { legal_name: "Ana (founder)" }, stakeholder_type: "INDIVIDUAL" },
        { object_type: "STAKEHOLDER", id: "fund", name: { legal_name: "Seed Fund" }, stakeholder_type: "INSTITUTION" },
      ],
    },
  },
  {
    name: "StockClasses.ocf.json",
    content: {
      file_type: "OCF_STOCK_CLASSES_FILE",
      items: [
        {
          object_type: "STOCK_CLASS", id: "common", name: "Common Stock", class_type: "COMMON",
          default_id_prefix: "CS-", initial_shares_authorized: "20000000", votes_per_share: "1", seniority: "1",
        },
        {
          object_type: "STOCK_CLASS", id: "seed", name: "Seed Preferred", class_type: "PREFERRED",
          default_id_prefix: "PS-", initial_shares_authorized: "2000000", votes_per_share: "1", seniority: "2",
          price_per_share: usd("1.50"), liquidation_preference_multiple: "1",
          conversion_rights: [
            {
              type: "STOCK_CLASS_CONVERSION_RIGHT",
              converts_to_stock_class_id: "common",
              conversion_mechanism: { type: "RATIO_CONVERSION", conversion_price: usd("1.50"), ratio, rounding_type: "NORMAL" },
            },
          ],
        },
      ],
    },
  },
  {
    name: "Transactions.ocf.json",
    content: {
      file_type: "OCF_TRANSACTIONS_FILE",
      items: [
        {
          object_type: "TX_STOCK_ISSUANCE", id: "tx-1", date: "2022-01-10", security_id: "cs-1", custom_id: "CS-1",
          stakeholder_id: "ana", stock_class_id: "common", share_price: usd("0.0001"), quantity: "8000000", security_law_exemptions: [],
        },
        {
          object_type: "TX_STOCK_ISSUANCE", id: "tx-2", date: "2023-05-01", security_id: "ps-1", custom_id: "PS-1",
          stakeholder_id: "fund", stock_class_id: "seed", share_price: usd("1.50"), quantity: "2000000", security_law_exemptions: [],
        },
      ],
    },
  },
];

const imported = readOcf(files);
console.log(`as of ${imported.as_of}`);
for (const note of imported.report.notes) console.log(`report: ${note.code}${note.subject ? ` (${note.subject})` : ""}`);
for (const blank of imported.to_fill) console.log(`to fill in: ${blank.security}'s ${blank.field}`);

// OCF has no participation flag, and Seed gives no cap, so you say which it is.
imported.cap_table.securities.find((s) => s.id === "seed").participation = "non_participating";
const { answers } = solve(prepare(readCapTable(imported.cap_table)), new D("20000000"));
for (const line of answers[0].payout.lines) console.log(`${line.holder} on ${line.security}: $${toCents(line.amount)}`);
```

Output:

```
as of 2025-06-30
report: conversion_rounding_not_modeled (seed)
report: no_anti_dilution_field (seed)
report: no_dividend_field
report: no_conversion_group_field
report: no_carve_out_field
report: no_sale_date_field
to fill in: seed's participation
ana on common: $16000000.00
fund on seed: $4000000.00
```

- **The report** says what OCF couldn't carry, so the import read it a set way: the engine converts without rounding, and Seed has no anti-dilution. And OCF has no field at all for dividends, series that must convert together, a carve-out or the sale's date.
- **Seed's participation is blank.** OCF gives Seed no participation cap, which could mean non-participating or participating without a cap. Once you say which, the cap table reads like any other.
- **At $20M the fund converts:** its 20% as common is $4M, more than its $3M preference.

**What an import gives,** a `CapTableImport` *(0.6.0: the name both imports share; 0.7.0: its old name, `OcfImport`, is gone)*:
- `as_of`: the package's date.
- `cap_table`: the cap table in the input format below, with `null` wherever OCF doesn't settle a term. OCF has no participation flag, no anti-dilution, no cumulative dividends and no conversion groups, so those are left blank or noted.
- `issue_order` *(0.5.0)*: its preferred series, SAFEs and notes, earliest issued first, ready to pass as a `start` event's `issue_order` when you build a round on the import. A series is dated by its first issuance, and a SAFE or note by its own, or by the one it came from by a transfer. One dated the same day as a series counts as issued after it.
- `to_fill`: each blank, for you to fill in before `readCapTable`.
- `report`: what was read, by object type; what was read and set aside, because it doesn't change payouts (`not_needed`), such as vesting, valuations and legends; and a `notes` line, by code, for each choice the import made.

**Anything it won't read is refused** with an `ImportRefusal` *(0.6.0; 0.7.0: before, `readOcf` threw an `OcfRefusal`, a subclass, which is gone)*, carrying:
- its `format`: `"ocf"`
- its `kind`: `"unsupported"` for valid OCF that spillpoint doesn't model, or `"malformed"` for files that disagree with each other or with OCF
- a `term` naming the problem
- the `subject` it's about

Nothing is skipped. The rules, each with its default, are O1 to O14 in [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/ASSUMPTIONS.md).

## Reading an OCX workbook *(0.6.0)*

OCX is developed by the Open Cap Table Coalition: https://github.com/Open-Cap-Table-Coalition/ocx. spillpoint reads files in that format.

`readOcx(workbook)` reads an OCX workbook, the Coalition's spreadsheet layout of a cap table, and gives the cap table as of its as-of date. It reads two layouts, told apart by their tabs and headers, not by the version written in the workbook:
- **0.4/0.5,** the Coalition's reference workbooks: `Summary Snapshot`, `Stakeholder Snapshot` and `Context`, with each series' terms in Context's Financing History.
- **0.7,** as one real export lays it out, from a cap table app other than Carta: `Summary View`, `Stakeholder View`, a ledger for each class and plan, and a `Warrants Ledger` and `SAFEs Ledger`. That export had no preferred stock, so 0.7's preferred is read by the same rules as its common, and no real export has shown it yet.

**No Carta export has been tested yet.** Carta says it exports OCX, but no Carta workbook has been through `readOcx`, so which layout Carta writes, and whether it reads, isn't known.

The engine never opens a spreadsheet. You pass each tab's cells as the .xlsx stored them, as an `OcxWorkbook`: the date system, and each tab's name and cells, each with its address, its kind, its text exactly as stored and whether it holds a formula. A number is the text the spreadsheet stored, never a JavaScript number. Opening the .xlsx is up to you; the page's reader is in the repository, [`apps/dashboard/src/xlsx.ts`](https://github.com/spillpoint/spillpoint/blob/main/apps/dashboard/src/xlsx.ts), not in the package.

```js
import { D, prepare, readCapTable, readOcx, solve, toCents } from "spillpoint";

// A tab as rows of cells, each cell's text as the spreadsheet stored it.
const tab = (name, rows) => ({
  name,
  cells: rows.flatMap((row, r) =>
    row.flatMap((text, c) =>
      text === "" ? [] : [{ address: `${"ABCDEFGHI"[c]}${r + 1}`, kind: /^\d+(\.\d+)?$/.test(text) ? "number" : "text", text, formula: false }],
    ),
  ),
});

const workbook = {
  dateSystem: 1900,
  sheets: [
    tab("Summary Snapshot", [
      ["As of 2025.06.30"],
      ["Share Class", "Outstanding Shares", "Liquidation Preference", "Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap"],
      ["Common Stock"],
      ["Common Stock", "8000000", "N/A"],
      ["Preferred Stock"],
      ["Seed Preferred", "2000000", "3000000"],
    ]),
    tab("Stakeholder Snapshot", [
      ["As of 2025.06.30"],
      ["Stakeholder", "Stakeholder Group", "Common Stock", "Seed Preferred (outstanding) (1.0000)", "Total Stock (outstanding)"],
      ["Ana (founder)", "", "8000000", "0", "8000000"],
      ["Seed Fund", "", "0", "2000000", "2000000"],
    ]),
    tab("Context", [
      ["Financing History"],
      ["Round", "Initial Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio", "Liquidation Multiple", "Participating (Y/N)", "Participation Cap"],
      ["Seed", "2023.05.01", "1.5", "1.5", "1", "1", "N", "N/A"],
      [],
      ["Stock Plan Details"],
      ["Plan Name", "Outstanding RSUs", "Shares Available for Grant"],
    ]),
  ],
};

const imported = readOcx(workbook);
console.log(`as of ${imported.as_of}`);
for (const note of imported.report.notes) console.log(`report: ${note.code}${note.subject ? ` (${note.subject})` : ""}`);
for (const blank of imported.to_fill) console.log(`to fill in: ${blank.security ?? "the cap table"}'s ${blank.field}`);

// OCX has no seniority, so you give the order the preferred is paid in.
imported.cap_table.seniority = [["seed_preferred"]];
const { answers } = solve(prepare(readCapTable(imported.cap_table)), new D("20000000"));
for (const line of answers[0].payout.lines) console.log(`${line.holder} on ${line.security}: $${toCents(line.amount)}`);
```

Output:

```
as of 2025-06-30
report: no_dividend_field
report: no_conversion_group_field
report: no_carve_out_field
report: no_sale_date_field
report: no_seniority_field
report: no_anti_dilution_field (seed_preferred)
to fill in: the cap table's seniority
ana_founder on common_stock: $16000000.00
seed_fund on seed_preferred: $4000000.00
```

- **The workbook** is the OCF example's company, in 0.4/0.5's layout, cut to the tabs and headers the reader needs. Seed's terms come from its Financing History row.
- **Seniority is always blank** where there's preferred stock, since no OCX layout has it. Once you give it, the cap table reads like any other.
- **Ids** are made from names, since OCX has none: "Ana (founder)" is `ana_founder`.

**What an import gives** is a `CapTableImport`, as `readOcf` gives (above): `as_of`, `cap_table` with `null` wherever the workbook doesn't settle a term, `issue_order`, `to_fill` and `report`. Nothing is guessed. Besides seniority, what a workbook can leave blank:
- **In either layout:** a convertible note's interest rate, issue date, base and repayment multiple, since a note comes from the summary's convertibles table, which gives only its amount, cap and discount.
- **In 0.4/0.5:** each option, award and warrant column's strike, since the layout heads a column by plan or class, never by strike. One strike can't be right for a column whose grants have several, so the project's page asks whether they share one, and stops if they don't.
- **In 0.7:** a SAFE's kind of cap, where its ledger doesn't say "Post Money" or "Pre Money". And without Financing History, a series' conversion price, multiple and participation, and its issue price too, unless its certificates all have the same one.

**SAFEs:** in 0.7, each SAFE with its holder, from the `SAFEs Ledger`. In 0.4/0.5, each row of the summary's convertibles table is one SAFE for the row's total, held by a holder made for it and named for it ("Post-money SAFEs, $12,000,000 cap (2)"), since the table gives no holders. For a row of identical SAFEs, a reference test shows this pays the row what its SAFEs would get one by one, post-money or pre-money.

**Numbers** are read to 15 significant digits, a spreadsheet's precision, from the text it stored, so 0.20000000000000001 is 0.2. **Dates** may be day counts, in the 1900 or 1904 date system, or text: `YYYY-MM-DD`, `YYYY.MM.DD`, or 0.7's "As of Fri, 31 Oct 2025". **A total that's a formula with no saved value,** as some exports write, isn't checked, and the report says so (`formula_totals_skipped`).

**Anything it won't read is refused** with an `ImportRefusal`, its `format` `"ocx"`, its `kind` `"unsupported"` or `"malformed"`, and a `term`. Its `subject` is the workbook's own text, since OCX has no ids: a holder's or class's name, a row's certificate number, a tab, or a tab and header, "Common Stock Ledger: No. Shares Outstanding". The rules, each with its default, are OX1 to OX14 in [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/ASSUMPTIONS.md).

## What it covers

Items marked *(0.2.0)*, *(0.3.0)*, *(0.4.0)*, *(0.5.0)*, *(0.6.0)*, *(0.7.0)* or *(1.0)* are new in that version.

**The exit waterfall** on an existing cap table:
- **Seniority tiers.** Series in the same tier are paid pari passu, and a shortfall is shared by preference amount.
- **Preferences** of any multiple.
- **Participation:** non-participating, participating, and participating with a cap.
- **Conversion:** each series converts when that pays it more. Series that must convert together decide by a class vote.
- **Cumulative dividends** *(0.2.0)*, added to the preference at 1x, on top of its multiple:
  - **Simple,** Actual/365 on the original issue price, or **compounding** annually on the accrual start's anniversaries, with the part-year after the last one simple.
  - **On conversion** they are forfeited, or, under a toggle, paid in cash in the series' own tier.
  - **The exit needs an `exit_date`,** the day they accrue to.
- **SAFEs still outstanding at the sale** *(0.2.0)*, each taking the greater of its Cash-Out Amount and its Conversion Amount (YC):
  - **The Cash-Out Amount,** its purchase amount, is paid ahead of common. Alongside preferred it ranks with the most junior tier, or with the series it names (`cash_out_ranks_with`).
  - **The Conversion Amount:** a post-money SAFE converts at its cap ÷ one Liquidity Capitalization for the company, which counts every SAFE that converts and leaves out series keeping their preference, with any warrant shares exercised into one *(0.5.0)*. A pre-money SAFE's count leaves out the pool, the SAFEs and the notes. A discount applies only with no cap, at the sale's common price less the discount, where that price exists.
  - **With no cap, converting is worth exactly** its purchase amount ÷ (1 − discount), taken out of what is left after the preferences first. That holds beside capped participating preferred too, which stops at its cap in what remains *(0.3.0)*.
  - **Several SAFEs** share a shortfall pro rata. A SAFE takes its Conversion Amount only when that strictly pays more.
  - **The SAFEs decide last** *(0.5.0)*: the series, warrants and notes decide first, each weighing its choice with the SAFEs then paid as their terms pay them, and the SAFEs take the greater of their two amounts after. Where several SAFEs could each convert only because the others do, they convert: a post-money SAFE is promised a fixed share once they all do. Before 0.5.0, a non-participating series near its conversion beside post-money SAFEs could stop the breakpoint search with "went round in a circle", and two equal SAFEs could have two answers over a range of exit values.
- **Convertible notes still outstanding at the sale** *(0.2.0)*, each taking the greater of repayment and conversion:
  - **Repayment,** a multiple of principal plus simple interest to the exit date, is debt, paid ahead of all equity. Several notes share a shortfall pro rata.
  - **Conversion:** principal plus interest converts at the pre-money cap ÷ the share count just before the sale (with the pool, without it, or common only), leaving out the notes. With no cap it converts at the sale's common price less its discount, where that price exists, worth exactly principal plus interest ÷ (1 − discount), beside capped participating preferred too *(0.3.0)*. A note with neither is only repaid.
  - **A note converts only when that strictly pays more.**
  - **Beside SAFEs** *(0.5.0)*: a note with a cap beside SAFEs with post-money caps. Its repayment is paid first, and once it converts, its shares count in the SAFEs' Liquidity Capitalization; its own base counts no SAFE.
- **Escrow and earnouts** *(0.2.0)*: proceeds paid over time. `paySchedule` pays each payment's take on cumulative proceeds, as if everything so far had been paid at closing, with every decision re-made at each step.
  - **A take is negative** when a later payment lowers a holder's running total, as when it tips a series into converting. It is reported as is, and `lowered` names the holders it falls for.
- **Management carve-outs** *(0.2.0)*: a percentage of the exit value, in marginal tiers like tax brackets, paid to listed people under the security `"carve_out"`.
  - **Before the preferences,** the default.
  - **Alongside them,** sharing the most senior tier pro rata by claim. While that tier isn't paid in full, payouts curve. A breakpoint on a curve is where the formula changes, and the breakpoints either side of a curved stretch say so (`curveBelow`, `curveAbove`). That includes where a warrant for a series in that tier comes into the money, a kink on the curve *(0.3.0)*; any other decision changing on a curve stops the breakpoint finder with a `NoAnswerError`.
  - **A term of the sale** *(0.3.0)*: the exit input can carry it, so a company built from its rounds can have one. It may still be on the cap table instead, but not on both.
- **Options at any number of strikes,** exercised once they're in the money. The strike money joins the proceeds, and option payouts are reported net of strike.
- **Warrants** *(0.2.0)*, for common or for a preferred series:
  - **Each warrant decides for itself** whether to exercise: once what it buys is worth more than the strike. Where exercising pays it nothing more, it isn't exercised, even where that changes what the SAFEs get *(0.5.0)*.
  - **A warrant for a series** adds its shares to the series, with the series' preference per share, participation, cap and conversion.
  - **The strike money joins the proceeds,** and warrant payouts are reported net of strike.
- **Breakpoints with plain-English reasons:**
  - a tier paid in full
  - a cap reached
  - options or a warrant coming into the money
  - a carve-out's tier ending *(0.2.0)*
  - a SAFE's Cash-Out Amount paid in full, or the SAFE switching to its Conversion Amount *(0.2.0)*
  - a note repaid in full, or switching to conversion *(0.2.0)*
  - a series or a group converting
  - payouts jumping when a group's vote flips, or when a series or note converting moves the SAFEs *(0.5.0)*
- **A faster breakpoint search** *(0.5.0)*: with the decisions fixed, every amount moves in a straight line until the formula changes, so the search reuses its work from one exit value to the next. A table with many SAFEs no longer takes minutes.

**Building a cap table from a company's events,** each event giving the cap table after it:
- **A starting cap table** *(0.5.0)*: the first event may be the cap table the company stands at, entered or imported, and the events after it build on it. Beside it goes the order its series, SAFEs and notes were issued in, which decides whether a SAFE or note converting in a down round counts against a series. With none given, its SAFEs and notes count as issued after its series.
- **Shares issued,** including a percentage of the company after the issue.
- **The option pool:** created at a percentage of fully diluted shares. Grants come out of it, one option class per strike.
- **Cumulative dividends on a priced round's series** *(0.2.0)*: they accrue from the round's date. The series its SAFEs and notes convert into carry the same terms, on their own issue price.
- **Warrants issued** *(0.2.0)*: counted like options everywhere a count includes issued options. That covers a round's price and pool top-up, a SAFE's Company Capitalization, a note's base, the pro-rata base and broad-based anti-dilution. They aren't drawn from the pool, and issuing them never triggers anti-dilution.
- **Priced rounds:**
  - **The price** is solved exactly, with the pool topped up to its target in the pre-money. Only the shares actually issued are rounded down.
  - **One issuance per holder** in a round, however many investment lines it has.
- **SAFEs:**
  - **Post-money (YC):** its cap divides by a Company Capitalization that counts the pool before the round and the SAFEs themselves. It also counts the notes and other SAFEs converting beside it, at their exact conversion shares, solved together with the round's price *(0.3.0)*.
  - **Pre-money:** its Company Capitalization counts the pool's increase and no SAFE or note.
  - **Either kind** converts at the lower of its cap price and its discount price, into "… (from SAFEs)".
- **Convertible notes:**
  - **What converts:** principal plus simple interest, Actual/365, to the round's date.
  - **The price:** the lower of the cap price and the discount price.
  - **The base** the cap divides by: with the pool, without it, or common only.
  - **They convert into** "… (from notes)".
- **Pro-rata entitlements** (NVCA): converting SAFEs and notes count in the base at their whole shares. An investment above the entitlement is refused, with the amount to mark pro-rata and the rest to enter as an ordinary investment.
- **Anti-dilution in a down round:**
  - **Methods:** broad-based weighted average, narrow-based weighted average, and full ratchet.
  - **Toggles:** the unissued pool in A, the adjustment shares in the round's price, and rounding the new conversion price to $0.0001 or $0.01.
  - **With SAFEs and notes converting** *(0.3.0)*: each conversion is a piece of the round of its own, tested at the price it converts at, as the new money is at the round's price. A series is adjusted when any piece is priced below its conversion price, and only those pieces count in B and C: what was paid (a SAFE's purchase amount, a note's principal plus interest) and their shares. Each adjustment reports its `pieces`, each with its `kind` (`"new_money"`, `"safe"` or `"note"`), its `id` (null for the new money), its `price`, whether it was `counted`, and its shares `inA` where it counted there instead *(0.7.0: before, a `piece` field, "new money" or an id)*.
  - **A conversion that doesn't count against a series** goes into its A at the shares it receives: when the round exempts conversions (`anti_dilution_exempts_conversions`, a charter carve-out or a waiver), or when the SAFE or note was issued before the series *(0.3.0)*.
- **Pay-to-play:**
  - **Each holder's requirement** is its share of the named series × the amount offered.
  - **A holder that doesn't buy it** converts to common, all of its preferred or, under a toggle, the fraction it didn't buy.
  - **Several series** may be named, each with its own ratio.
  - **The price:** the round is priced after the conversion, or before it under a toggle.
  - **SAFEs and notes converting in the round** *(0.3.0)*: a SAFE's Company Capitalization and a note's base count the cap table the round is priced on.

Each round reports what it worked out: the price, each SAFE's and note's conversion, the pro-rata entitlements, each anti-dilution adjustment, and each pay-to-play holder's outcome.

**An Open Cap Format export** *(0.4.0)*, read into a cap table: stakeholders, stock classes, the share ledger, plans and the unissued pool, options and RSUs, warrants, and SAFEs and notes still outstanding. See [Reading an Open Cap Format export](#reading-an-open-cap-format-export-040).

**An OCX workbook** *(0.6.0)*, in its 0.4/0.5 or 0.7 layout, read into a cap table: holders, classes with their terms, holdings, options, warrants, the unissued pool, and SAFEs and notes still outstanding. See [Reading an OCX workbook](#reading-an-ocx-workbook-060).

## What it refuses

**Nothing is ever ignored.** A term the engine doesn't model is refused with an `UnsupportedTermError`, which names the term. Don't assume anything below is supported. An import refuses with an `ImportRefusal` instead *(0.4.0 for OCF, 0.6.0 for OCX; the name since 0.6.0)*: see [Reading an Open Cap Format export](#reading-an-open-cap-format-export-040) and [Reading an OCX workbook](#reading-an-ocx-workbook-060).

**Not settled yet.** No worked test case settles these, so they're refused:
- **Full-ratchet or narrow-based anti-dilution in a round that converts SAFEs or notes** *(0.3.0: before, any anti-dilution there)*.
- **A SAFE or note converting at its discount and counted in a series' anti-dilution A,** because the round exempts conversions or it was issued before the series, in a round that adjusts that series with the adjustment shares in its price. The price would be the root of a quadratic, not exact. Where nothing adjusts the series, it builds.
- More than one group of series that must convert together.
- Notes with compound interest, or with a post-money cap.
- Cumulative dividends added to what converts, rather than paid in cash on conversion.
- At a sale *(0.2.0)*: more than one SAFE unless each has a post-money cap; a pre-money SAFE alongside preferred stock; more than one note unless each has a cap; a note alongside a carve-out; and a note alongside a SAFE, unless the note has a cap and every SAFE a post-money cap *(0.5.0: before, any note alongside a SAFE)*. Since 0.5.0 `readInputs` refuses these on a cap table built from rounds too; before, it didn't check one.
- Cumulative dividends on a series issued by an `issue` event, rather than a priced round.

**Refused by design,** with an `InputError`:
- a pro-rata investment above the investor's entitlement (the message gives the amount to mark pro-rata, and says to enter the rest as an ordinary investment)
- a pro-rata investment in a round where a SAFE or note stays outstanding
- a pro-rata investment in a pay-to-play round, where the pay-to-play requirement takes the place of pro-rata (enter it as an ordinary investment)

**Stopped rather than guessed,** with a `NoAnswerError` *(0.5.0)*:
- **More than one stable answer** that pays holders differently, such as two non-participating series at the same price beside post-money SAFEs. spillpoint doesn't pick one. Reporting both is planned.
- **More than 12 SAFEs at a sale** whose answer doesn't settle from "every SAFE converts": there are too many to weigh every combination.

**Where a second answer could go unseen** *(0.5.0)*:
- **With more than 12 series, warrants and notes deciding,** not every combination is checked. Where solving from both ends reaches the same answer, that one is given.
- **Where payouts curve,** with a carve-out alongside the preferences, the breakpoint search checks for a second answer only at the exit values it reads.

## Inputs

**An exit input** is plain JSON:
- `cap_table`, with:
  - `holders`
  - `securities` (`common`, `option` with a `strike`, `warrant` with a `strike` and an `underlying`, `"common"` or a preferred series, and `preferred` with its terms, including an optional `cumulative_dividend`: `rate`, `method` (`simple` or `compounding`), `accrual_start` and `on_conversion` (`forfeited` or `paid`))
  - `seniority`: the preference tiers, most senior first
  - optional `conversion_groups`
  - `positions`: shares held, per holder and security
  - optional `unissued_pool`
  - optional `unconverted_safes` *(0.2.0)*: SAFEs still outstanding, each with an `id`, `holder`, `purchase_amount`, `post_money_cap` or `pre_money_cap`, `discount`, and optionally `cash_out_ranks_with`
  - optional `unconverted_notes` *(0.2.0)*: notes still outstanding, with the fields of the `notes` event below; the exit then needs an `exit_date`
  - optional `carve_out` *(0.2.0)*: `timing` (`before_preferences` or `alongside_preferences`), `tiers` (`from`, `to`, `percent`) and `allocation` (`holder`, `percent`)
- `range`: the exit values to analyse
- `exit_values`: the points to report
- `exit_date`, as `YYYY-MM-DD`: needed when a series has cumulative dividends or a note is outstanding *(0.2.0)*
- optional `payment_schedules` *(0.2.0)*: each with an `id`, a `description`, and `payments`, each a `label` and an `amount`
- optional `carve_out` *(0.3.0)*: a carve-out as a term of the sale, in the same fields as the cap table's, which then must not have one. It works on a cap table built from rounds (`cap_table_after_event`).

**A company built from its rounds** (`buildCapTables`, `readInputs`) is `holders` and `events`, each event with an `id`, a `date` and a `type`:

| `type` | Fields |
|---|---|
| `start` *(0.5.0)* | The first event only. `cap_table`, in the exit input's format above, with no `carve_out`, since a carve-out is a term of the sale. Its holders must be in `holders`, by the same names. The at-a-sale limits on SAFEs and notes don't apply to it, since a round after it may convert them. Optional: `issue_order`, each preferred series, SAFE and note in it once, earliest issued first |
| `issue` | `security`, and `issues`: `holder` and `shares` |
| `issue_percent` | `security`, `holder`, and `percent` of the company after the issue |
| `create_pool` | `percent` of fully diluted shares after it |
| `grant_options` | `grants`: `holder`, `shares` and `strike` |
| `issue_warrants` *(0.2.0)* | `warrants`: `holder`, `shares`, `strike` and `underlying`, `"common"` or a preferred series already issued |
| `safes` | `safes`: `id`, `holder`, `purchase_amount`, `post_money_cap` or `pre_money_cap`, and `discount` |
| `notes` | `notes`: `id`, `holder`, `principal`, `interest_rate`, `issue_date`, `valuation_cap`, `conversion_base`, `discount` and `repayment_multiple` |
| `priced_round` | `series` (which may have a `cumulative_dividend` with no `accrual_start`, *0.2.0*), `pre_money`, `investments` (`holder`, `amount`, and `pro_rata`), `pool_target_unissued_percent_post` and `seniority`. The seniority may leave out the series the round's SAFEs and notes convert into; they then rank alongside its new series. Optional: `convert_safes`, `convert_notes`, `pay_to_play`, and the pro-rata and anti-dilution toggles, `anti_dilution_exempts_conversions` among them *(0.3.0)* |

`readInputs` takes `holders`, `events` and an `exit` with `cap_table_after_event` naming the event whose cap table the exit runs on. The project's [`cases`](https://github.com/spillpoint/spillpoint/tree/main/cases) folder has a worked input for each term, with its expected results.

**Exact numbers are strings:** `"1.5"`, or `"2867562476/1309104599"` for a value whose decimal repeats. Share counts may be plain integers. Floats are refused, because they may already have lost the exact value.

`readExit`, `readCapTable`, `readInputs` and `buildCapTables` check everything. A malformed input throws an `InputError` naming the field. Unknown fields are errors too, so a misspelt term can't be silently ignored.

Every modeling choice the engine makes is written down, with its default, in the project's [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/ASSUMPTIONS.md). The rules themselves are in [`docs/SPEC.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/SPEC.md).

## Numbers

All money and share math uses [decimal.js](https://github.com/MikeMcl/decimal.js) at 40 significant digits, never floating point. Amounts are reported as Decimals: use `toCents` to round half-up to the cent, or `new D("20000000")` to make one. The engine is checked against an independent calculator that uses exact fractions, and agrees with it to the cent.

**`D` is decimal.js's `Decimal`,** at 40 significant digits with half-up rounding *(0.7.0: said here)*. Every amount, price and share count the API takes or returns is one, so it's part of the API: a major decimal.js release that changes `Decimal` would be a major spillpoint release. spillpoint stays on decimal.js 10 (`^10.6.0`), and moves to a new major only with a new major of its own.

## API

| Function | What it does |
|---|---|
| `readExit(json)`, `readCapTable(json)` | Read and check an input. |
| `buildCapTables(company)` | Build the cap table after each event, with what the event worked out. The SAFEs and notes still outstanding are on its `capTable` *(0.7.0: no longer also beside it)*. |
| `readInputs(json)` | Read `holders`, `events` and an `exit` on the cap table after one of the events. SAFEs and notes still outstanding there are paid *(0.2.0)*. |
| `readOcf(files)` *(0.4.0)* | Read an Open Cap Format package: the cap table as of its date, the terms to fill in, and a report. |
| `readOcx(workbook)` *(0.6.0)* | Read an OCX workbook, given as its tabs' cells: the cap table as of its as-of date, the terms to fill in, and a report. |
| `prepare(capTable, exitDate)` | Prepare a cap table for exit values, to pass to `solve`, `payout`, `findBreakpoints` and `paySchedule`. The engine works out the fixed quantities once, and keeps them inside: what you get back shows `capTable` and `exitDate` *(0.7.0: before, 13 working quantities besides)*. Each series' preference, accrued dividends, cap and as-converted shares are on a payout's `series`. `exitDate` is needed only for dividends and notes. It works on its own frozen copy of the cap table *(1.0)*: changing your table afterwards changes nothing it gives, and assigning to anything in what it returns throws a `TypeError`. To change a table, edit yours and prepare it again. A table you write yourself, `{ capTable, exitDate }`, works too, worked out afresh on each call. |
| `solve(table, exitValue)` | Decide who converts and who exercises, and pay out. Returns `{ exitValue, answers }`, where `answers` holds the one stable answer: its `decisions` and its `payout`, with its lines, holder totals and class totals. Where a second stable answer pays holders differently, it stops with a `NoAnswerError` instead. *(0.7.0: no `complete` field, and no third argument.)* |
| `payout(table, exitValue, decisions)` | Pay out with decisions you choose. A payout has its `lines`, `holderTotals` and `classTotals`, each series as it stands (`series`), each SAFE and note, the tiers, and what's held at a cap. *(0.7.0: no `bySecurity`, which `classTotals` gives to the cent, and none of the breakpoint finder's workings: `structure`, `capRoom`, and a SAFE's or note's `room`.)* |
| `paySchedule(table, schedule)` *(0.2.0)* | Each payment's take: `cumulative`, the `decisions` there, the take per holder × security in `lines`, holder and class totals, and `lowered`, the holders whose running total falls. |
| `findBreakpoints(table, [low, high])` | Every breakpoint strictly inside the range. Each has `exitValue`, `jumps`, `curveBelow` and `curveAbove` *(0.2.0)*, and `reasons`, where each reason has a `code` (listed under [Stable from 1.0](#stable-from-10)), a `subject`, whether it `starts` (converts, comes into the money) or stops, and its `text`. |
| `D`, `parseExact(value, where?)`, `toCents` | Make and format the engine's Decimals. `parseExact` reads an exact number as the input format writes it, an integer, a decimal or "a/b"; `where` is the path its error names *(0.7.0: optional)*. |

**What the API hands back has exactly the fields its type lists** *(0.7.0)*, and nothing else: `console.log` and `JSON.stringify` show only those, and only they are part of the API.

**Names:** what reads an input (`readExit`, `readInputs`, `readCapTable`, `buildCapTables`) returns the engine's own objects, in camelCase. `readOcf` and `readOcx` return case-file JSON, in the input format's snake_case, since what they give is input: to save, to fill in and read with `readCapTable`, or to pass on as a `start` event's fields.

**Errors:**
- `InputError`: the input is malformed.
- `UnsupportedTermError`: the input uses a term that isn't modeled. It carries the `term`, one of those listed under [Stable from 1.0](#stable-from-10), and the `path` to it in the input, and its message says what isn't modeled. *(0.6.0: the `milestone` field and the `Milestone` type are gone, as 0.2.0's deprecation note said they would be by 1.0, and the message no longer says when a term might be supported.)*
- `NoAnswerError`: the engine stopped rather than guess, for example if no set of decisions is stable. *(0.5.0)* Also where more than one is stable and they pay holders differently, as two non-participating series at the same price can be beside post-money SAFEs: its message names them, says either could convert and the documents don't say which, and that spillpoint doesn't pick one. Both `solve` and `findBreakpoints` stop there; the search follows which answers are stable between the exit values it reads, so it can't step past a second one.
- `ImportRefusal` *(0.6.0)*: an import won't read an export. It carries the `format`, `"ocf"` or `"ocx"`, the `kind`, `"unsupported"` or `"malformed"`, the `term`, listed under [Stable from 1.0](#stable-from-10), and the `subject`. `readOcf` and `readOcx` both throw it. *(0.7.0: `OcfRefusal`, which `readOcf` threw from 0.4.0 to 0.6.0, is gone, and so are the type names `OcfImport`, `OcfReport`, `OcfToFill` and `OcfNote`: use `ImportRefusal`, `CapTableImport`, `ImportReport`, `ImportBlank` and `ImportNote`, which 0.6.0 added beside them.)*

**Types for the OCX import** *(0.6.0)*: `OcxWorkbook`, `OcxSheet` and `OcxCell`, what `readOcx` takes: the date system, and each tab's cells with their kind, their text as stored and whether each holds a formula. See [Reading an OCX workbook](#reading-an-ocx-workbook-060).

## Stable from 1.0

Code can match on these names, as the project's page and check script do: the terms the engine and the imports refuse with, the codes an import's report notes, and the reasons a breakpoint gives. From 1.0 a name is never renamed or reused for something else. A new one can be added, and one stops being raised when spillpoint comes to model what it refuses; it stays here, marked as no longer raised. A test fails if the engine can raise a name this list doesn't have. The rules behind each are in [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/ASSUMPTIONS.md).

### `UnsupportedTermError`'s terms

What the engine doesn't model in an input it reads:
- `anti_dilution_with_conversions`: full-ratchet or narrow-based anti-dilution in a round that converts SAFEs or notes (R25).
- `conversion_groups`: more than one group of series that must convert together (E17).
- `cumulative_dividend_in_rounds`: cumulative dividends on a series issued by an `issue` event, not a priced round.
- `discounted_conversion_in_anti_dilution_a`: a SAFE or note converting at its discount and counted in a series' anti-dilution A, in a round that adjusts that series with the adjustment shares in its price (R25).
- `dividends_added_to_conversion`: accrued dividends added to what converts, rather than forfeited or paid (X5).
- `note_compounding_interest`: a note with interest other than simple (R23).
- `note_post_money_cap`: a note with a post-money cap (R23).
- `note_with_safe_or_carve_out`: at a sale, a note beside a carve-out, or beside a SAFE unless the note has a cap and every SAFE a post-money cap (X12, X18).
- `pre_money_safe_with_preferred`: at a sale, a pre-money SAFE beside preferred stock (X14).
- `several_notes`: at a sale, more than one note, unless each has a cap (X15).
- `several_safes`: at a sale, more than one SAFE, unless each has a post-money cap (X13, X14).

### `ImportRefusal`'s terms for OCF

An Open Cap Format package `readOcf` won't read, its `format` `"ocf"`, with each term's `kind`:
- `after_as_of` *(malformed)*: a transaction dated after the package's as-of date.
- `ambiguous_file` *(malformed)*: two files of one name, so which the manifest means can't be told.
- `bad_value` *(malformed)*: a value OCF doesn't allow there, such as a class type other than COMMON or PREFERRED.
- `cancellation_behavior_missing` *(unsupported)*: a plan with shares cancelled or expired that gives no cancellation behavior, so whether they return to the pool would be a guess.
- `cap_below_preference` *(unsupported)*: a participation cap below the class's preference multiple, which makes sense only as a cap that leaves the preference out.
- `class_conversion_mechanism` *(unsupported)*: a class that converts by a mechanism other than a ratio.
- `closed_security` *(malformed)*: a transaction naming a security after it was closed.
- `common_conversion_right` *(unsupported)*: a common class with a conversion right.
- `compensation_type` *(unsupported)*: a grant other than an option or an RSU.
- `conversion_into_preferred` *(unsupported)*: a class that converts into another preferred class.
- `conversion_ratio_mismatch` *(malformed)*: a class's conversion ratio that doesn't agree with its issue price ÷ conversion price, even allowing for how the numbers are written.
- `convertible_mechanism_mismatch` *(malformed)*: a SAFE or note without its kind's conversion mechanism on every trigger.
- `convertible_security` *(unsupported)*: a convertible of OCF's general kind, neither a SAFE nor a note.
- `convertible_seniority` *(unsupported)*: outstanding convertibles at different seniorities.
- `convertible_triggers_differ` *(unsupported)*: a convertible that converts on different terms at different triggers.
- `currency` *(unsupported)*: an amount in a currency other than US dollars.
- `duplicate_id` *(malformed)*: two objects with one id.
- `duplicate_security` *(malformed)*: two issuances of one security.
- `fractional_shares` *(unsupported)*: a share count that isn't whole.
- `grant_of_preferred` *(unsupported)*: options over a preferred class.
- `missing_field` *(malformed)*: a field OCF requires, missing.
- `missing_file` *(malformed)*: a file the manifest lists that isn't in the package.
- `no_manifest` *(malformed)*: a package with no manifest.
- `not_an_ocf_file` *(malformed)*: a file with no `file_type`.
- `note_accrual_period` *(unsupported)*: a note whose interest accrues other than daily.
- `note_base_counts_other_convertibles` *(unsupported)*: a note whose cap counts other converting securities, with another SAFE or note outstanding beside it.
- `note_cash_interest` *(unsupported)*: a note that pays its interest in cash, rather than deferring it.
- `note_compounding` *(unsupported)*: a note with compounding interest.
- `note_day_count` *(unsupported)*: a note whose interest counts days other than Actual/365.
- `note_mfn` *(unsupported)*: a most-favored-nation note.
- `note_rate_periods` *(unsupported)*: a note with more than one interest rate, or a rate for a set period.
- `ocf_version` *(unsupported)*: an OCF version other than 1.0 to 1.2; the subject is the version.
- `pool_overdrawn` *(malformed)*: a plan whose grants and deliveries come to more than it reserves.
- `quantities_dont_reconcile` *(malformed)*: a transaction whose quantities don't add up for the security it acts on.
- `return_to_pool_conflict` *(unsupported)*: a return to a pool whose plan's own rule already decides what returns.
- `safe_exit_multiple` *(unsupported)*: a SAFE with an exit multiple other than 1.
- `several_conversion_rights` *(unsupported)*: a class with more than one conversion right.
- `several_manifests` *(malformed)*: a package with more than one manifest.
- `split_of_preferred` *(unsupported)*: a split of a preferred class, since OCF doesn't record how its terms adjust.
- `split_with_derivatives` *(unsupported)*: a split of a class while something that converts into it or is exercised for it is outstanding.
- `stock_appreciation_right` *(unsupported)*: a stock appreciation right.
- `too_many_shares` *(unsupported)*: a share count larger than a cap table here can hold exactly.
- `unknown_file_type` *(unsupported)*: a file whose `file_type` isn't an OCF file type.
- `unknown_object_type` *(unsupported)*: an object of a type spillpoint doesn't read.
- `unknown_security` *(malformed)*: a transaction naming a security no issuance creates, or before it's issued.
- `unknown_stakeholder` *(malformed)*: an issuance to someone who isn't a stakeholder in the package.
- `unknown_stock_class` *(malformed)*: a stock class the package doesn't have.
- `unknown_stock_plan` *(malformed)*: a stock plan the package doesn't have.
- `warrant_mechanism` *(unsupported)*: an outstanding warrant whose exercise isn't one fixed-amount conversion into a stock class.
- `warrant_quantity` *(malformed)*: a warrant whose quantity and its conversion's differ.

### `ImportRefusal`'s terms for OCX

An OCX workbook `readOcx` won't read, its `format` `"ocx"`, with each term's `kind`:
- `bad_date` *(malformed)*: a date the reader doesn't read, or an as-of date whose weekday is wrong.
- `bad_number` *(malformed)*: a value the import needs that's blank or not a number, or a discount that isn't a fraction below 1.
- `cap_below_preference` *(unsupported)*: a participation cap below the preference multiple, which makes sense only as a cap that leaves the preference out.
- `class_without_round` *(malformed)*: a preferred class with no round in Financing History.
- `conversion_ratio_mismatch` *(malformed)*: a series' prices that don't give its conversion ratio, even allowing for a spreadsheet's 15 digits.
- `convertibles_mismatch` *(malformed)*: the summary's convertibles table disagreeing with the SAFEs ledger, by count or amount.
- `currency` *(unsupported)*: an amount in a currency other than US dollars.
- `duplicate_stakeholder` *(malformed)*: two holder rows with one name.
- `formula_without_value` *(malformed)*: a value the import needs that's a formula with no saved value.
- `fractional_shares` *(malformed)*: a holding that isn't a whole number of shares.
- `grant_for_unknown_class` *(malformed)*: a grant whose share class the summary doesn't list.
- `grant_of_preferred` *(unsupported)*: a grant over a preferred class.
- `holdings_mismatch` *(malformed)*: a holder's holdings disagreeing between tabs.
- `ledger_without_class` *(malformed)*: a class ledger whose tab name and title name no class the summary lists.
- `liquidation_preference_mismatch` *(malformed)*: a class's liquidation preference on the summary that isn't its outstanding shares × issue price × multiple, within a cent.
- `missing_header` *(malformed)*: a header the layout needs, missing; the subject is the tab and header.
- `missing_tab` *(malformed)*: a tab the layout needs, a class's ledger among them, missing.
- `mixed_layout` *(malformed)*: a tab of another OCX layout beside this one's.
- `non_plan_awards` *(unsupported)*: in 0.7, non-plan awards outstanding, which no ledger the reader knows holds.
- `ocx_layout` *(unsupported)*: a layout spillpoint doesn't read, 0.3's among them; the subject is the version label's version.
- `pool_mismatch` *(malformed)*: a pool row that doesn't agree with the plans' shares available for grant.
- `round_without_class` *(malformed)*: a Financing History round with no preferred class of its name.
- `rsus_not_separated` *(unsupported)*: in 0.4/0.5, a plan with RSUs outstanding, which its option columns don't tell apart from options.
- `several_notes_in_row` *(unsupported)*: a convertibles row of several notes, which can't be combined exactly.
- `status_mismatch` *(malformed)*: a grant or warrant with shares outstanding whose status isn't "Outstanding".
- `stock_appreciation_right` *(unsupported)*: a stock appreciation right.
- `total_mismatch` *(malformed)*: a total with a saved value that isn't what its rows add up to.
- `unknown_class_heading` *(unsupported)*: a class with no holdings column the reader recognizes.
- `unknown_holdings_header` *(unsupported)*: a holdings column of a kind the reader doesn't know.
- `unknown_security_type` *(unsupported)*: a convertibles row of a type OCX doesn't list.
- `unknown_stakeholder` *(malformed)*: a ledger naming a holder who isn't on the per-holder tab.
- `unknown_status` *(unsupported)*: a status, or a Y or N, the reader doesn't know.
- `warrant_for_future_series` *(unsupported)*: warrants for a series not yet issued.
- `warrant_for_unknown_class` *(unsupported)*: a warrant for a class the workbook doesn't have.

### An import's report-note codes

What an import's `report.notes` say, with the format each comes from:
- `common_named_preferred` *(OCX)*: a class under Common Stock whose name says Preferred, read as common.
- `common_preference_ignored` *(OCF)*: a preference on a common class, which changes nothing at a sale, ignored.
- `conversion_ratio_rounded` *(both)*: a conversion ratio that agrees with its prices only within how they're written; the prices are read.
- `conversion_rounding_not_modeled` *(OCF)*: a class's rounding of converted shares, which the engine doesn't model: it converts without rounding.
- `convertible_seniority_ignored` *(OCF)*: the convertibles' seniority among themselves, the same for each, isn't used; spillpoint ranks them as it ranks any SAFE or note.
- `expired_option_left_out` *(both)*: an option past its expiration date, left out.
- `expired_warrant_left_out` *(both)*: a warrant past its expiration date, left out.
- `formula_totals_skipped` *(OCX)*: a total or check that's a formula with no saved value, so not checked.
- `issue_order_default` *(OCX)*: a SAFE or note placed after every series in the issue order, the default, with no date to place it by.
- `issue_price_from_ledger` *(OCX)*: in 0.7 without Financing History, a series' issue price read from its ledger.
- `issued_at_other_price` *(OCF)*: preferred shares issued at a price other than their class's, which still carry the class's terms.
- `left_out_stakeholder` *(both)*: a holder with nothing outstanding, left out.
- `left_out_stock_class` *(OCF)*: a class with nothing outstanding, left out.
- `no_anti_dilution_field` *(both)*: a preferred series' anti-dilution, which neither format records, read as none.
- `no_carve_out_field` *(both)*: neither format has a field for a carve-out.
- `no_conversion_group_field` *(both)*: neither format has a field for series that must convert together.
- `no_dividend_field` *(both)*: neither format has a field for cumulative dividends.
- `no_financing_history` *(OCX)*: a 0.7 workbook without Financing History, so a series' conversion price, multiple and participation are blank.
- `no_sale_date_field` *(both)*: neither format has a field for the sale's date.
- `no_seniority_field` *(OCX)*: OCX has no seniority, so it's blank to fill.
- `no_strike_field` *(OCX)*: in 0.4/0.5, an option, award or warrant column with no strike, blank to fill.
- `not_in_manifest` *(OCF)*: a file the manifest doesn't list, read anyway.
- `note_base_other_convertibles_ignored` *(OCF)*: a note whose cap counts other converting securities, with none outstanding beside it, so the setting changes nothing.
- `note_cap_read_as_pre_money` *(both)*: a note's cap, whose kind neither format records, read as pre-money.
- `note_from_convertibles_row` *(OCX)*: a note read from the summary's convertibles table, its interest rate, issue date, base and repayment multiple blank.
- `participation_cap_includes_preference` *(both)*: a participation cap read as including the preference.
- `rsu_as_option` *(both)*: an RSU read as an option at a $0 strike.
- `safe_exit_multiple_read_as_1` *(OCF)*: a SAFE that gives no exit multiple, paid its purchase amount, a multiple of 1.
- `safes_combined` *(OCX)*: a convertibles row of SAFEs read as one SAFE for its total, held by a holder made for it.
- `unrecognized_field` *(both)*: a field or header the import doesn't know, set aside.
- `unrecognized_tab` *(OCX)*: a tab no layout names, not read.
- `version_label` *(OCX)*: the workbook's version label, as written, which decides nothing.
- `warrant_counts_are_maximums` *(OCX)*: the workbook's warrant counts, the most each warrant can buy.

### `ReasonCode`

What a breakpoint's reason, `reasons[i].code`, is about:
- `tier_fully_paid`: a seniority tier's preferences are paid in full.
- `cap_reached`: a capped participating series reaches its cap.
- `option_in_the_money`: an option class comes into the money and is exercised.
- `warrant_in_the_money`: a warrant comes into the money and is exercised.
- `series_converts`: a series, or a group of series, converts to common.
- `safe_cash_out_paid`: the SAFEs' Cash-Out Amounts are paid in full.
- `safe_switches`: a SAFE switches between its Cash-Out Amount and its Conversion Amount.
- `note_repayment_paid`: the notes' repayment is paid in full.
- `note_switches`: a note switches between repayment and conversion.
- `carve_out_tier`: a carve-out's tier ends.
- `payouts_jump`: payouts jump rather than bend.
- `payouts_curve`: payouts curve on one side or both, with a carve-out alongside the preferences (X17).
- `other`: a safety net, "Payout slopes change here.", where payouts bend and no specific reason is found. No case produces it.

## License

Apache-2.0.
