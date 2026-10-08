# spillpoint

Who gets what when a company is sold. Give spillpoint a cap table and an exit value, and it pays out the waterfall: preferences, cumulative dividends, participation, caps, conversions, options, warrants, management carve-outs, and SAFEs and convertible notes still outstanding at the sale. It also finds every **breakpoint** where the payout curve bends or jumps, and explains each one in plain English.

It can also build the cap table from the company's history: shares issued, the option pool, SAFEs and convertible notes, and priced rounds with their pool top-ups, pro-rata, anti-dilution and pay-to-play.

It runs entirely on your machine. There is no network access and no I/O; your cap table never leaves the process.

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
      // The SAFE converts into "Series A Preferred (from SAFEs)", id series_a_shadow.
      seniority: [["series_a", "series_a_shadow"]],
    },
  ],
};

// The cap table after each event.
for (const { event, capTable, unconvertedSafes, details } of buildCapTables(company)) {
  console.log(`After ${event}:`);
  if (details.kind === "priced_round") {
    console.log(`  priced at $${details.price.toFixed(6)}; the pool tops up by ${details.poolTopUp}`);
    for (const c of details.safeConversions) {
      console.log(`  ${c.safe} converts at its ${c.method}, $${c.conversionPrice.toFixed(6)}, into ${c.shares} shares`);
    }
  }
  for (const p of capTable.positions) console.log(`  ${p.holder} on ${p.security}: ${p.shares}`);
  console.log(`  unissued pool: ${capTable.unissuedPool}`);
  for (const f of unconvertedSafes) console.log(`  ${f.id} outstanding: $${toCents(f.purchaseAmount)}`);
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
  seed on series_a_shadow: 1111111
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

## What it covers

Items marked *(0.2.0)* or *(0.3.0)* are new in that version.

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
  - **The Conversion Amount:** a post-money SAFE converts at its cap ÷ one Liquidity Capitalization for the company, which counts every SAFE that converts and leaves out series keeping their preference. A pre-money SAFE's count leaves out the pool, the SAFEs and the notes. A discount applies only with no cap, at the sale's common price less the discount, where that price exists.
  - **With no cap, converting is worth exactly** its purchase amount ÷ (1 − discount), taken out of what is left after the preferences first. That holds beside capped participating preferred too, which stops at its cap in what remains *(0.3.0)*.
  - **Several SAFEs** share a shortfall pro rata. A SAFE takes its Conversion Amount only when that strictly pays more.
- **Convertible notes still outstanding at the sale** *(0.2.0)*, each taking the greater of repayment and conversion:
  - **Repayment,** a multiple of principal plus simple interest to the exit date, is debt, paid ahead of all equity. Several notes share a shortfall pro rata.
  - **Conversion:** principal plus interest converts at the pre-money cap ÷ the share count just before the sale (with the pool, without it, or common only), leaving out the notes. With no cap it converts at the sale's common price less its discount, where that price exists, worth exactly principal plus interest ÷ (1 − discount), beside capped participating preferred too *(0.3.0)*. A note with neither is only repaid.
  - **A note converts only when that strictly pays more.**
- **Escrow and earnouts** *(0.2.0)*: proceeds paid over time. `paySchedule` pays each payment's take on cumulative proceeds, as if everything so far had been paid at closing, with every decision re-made at each step.
  - **A take is negative** when a later payment lowers a holder's running total, as when it tips a series into converting. It is reported as is, and `lowered` names the holders it falls for.
- **Management carve-outs** *(0.2.0)*: a percentage of the exit value, in marginal tiers like tax brackets, paid to listed people under the security `"carve_out"`.
  - **Before the preferences,** the default.
  - **Alongside them,** sharing the most senior tier pro rata by claim. While that tier isn't paid in full, payouts curve. A breakpoint on a curve is where the formula changes, and the breakpoints either side of a curved stretch say so (`curveBelow`, `curveAbove`). That includes where a warrant for a series in that tier comes into the money, a kink on the curve *(0.3.0)*; any other decision changing on a curve stops the breakpoint finder with a `NoAnswerError`.
  - **A term of the sale** *(0.3.0)*: the exit input can carry it, so a company built from its rounds can have one. It may still be on the cap table instead, but not on both.
- **Options at any number of strikes,** exercised once they're in the money. The strike money joins the proceeds, and option payouts are reported net of strike.
- **Warrants** *(0.2.0)*, for common or for a preferred series:
  - **Each warrant decides for itself** whether to exercise: once what it buys is worth more than the strike.
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
  - payouts jumping when a group's vote flips

**Building a cap table from a company's events,** each event giving the cap table after it:
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
- **Pay-to-play:**
  - **Each holder's requirement** is its share of the named series × the amount offered.
  - **A holder that doesn't buy it** converts to common, all of its preferred or, under a toggle, the fraction it didn't buy.
  - **Several series** may be named, each with its own ratio.
  - **The price:** the round is priced after the conversion, or before it under a toggle.
  - **SAFEs and notes converting in the round** *(0.3.0)*: a SAFE's Company Capitalization and a note's base count the cap table the round is priced on.

Each round reports what it worked out: the price, each SAFE's and note's conversion, the pro-rata entitlements, each anti-dilution adjustment, and each pay-to-play holder's outcome.

## What it refuses

**Nothing is ever ignored.** A term the engine doesn't model is refused with an `UnsupportedTermError`, which names the term. Don't assume anything below is supported.

**Not settled yet** (milestone `"later"`). No worked test case settles these yet, so they're refused until one does. The first is common in real rounds, and is on the project's list to support:
- **SAFEs or notes converting in a round that triggers anti-dilution.**
- More than one group of series that must convert together.
- Notes with compound interest, or with a post-money cap.
- Cumulative dividends added to what converts, rather than paid in cash on conversion.
- At a sale *(0.2.0)*: more than one SAFE unless each has a post-money cap; a pre-money SAFE alongside preferred stock; more than one note unless each has a cap; and a note alongside a SAFE or a carve-out.
- Cumulative dividends on a series issued by an `issue` event, rather than a priced round.

**Refused by design,** with an `InputError`:
- a pro-rata investment above the investor's entitlement (the message gives the amount to mark pro-rata, and says to enter the rest as an ordinary investment)
- a pro-rata investment in a round where a SAFE or note stays outstanding
- a pro-rata investment in a pay-to-play round, where the pay-to-play requirement takes the place of pro-rata (enter it as an ordinary investment)

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
| `issue` | `security`, and `issues`: `holder` and `shares` |
| `issue_percent` | `security`, `holder`, and `percent` of the company after the issue |
| `create_pool` | `percent` of fully diluted shares after it |
| `grant_options` | `grants`: `holder`, `shares` and `strike` |
| `issue_warrants` *(0.2.0)* | `warrants`: `holder`, `shares`, `strike` and `underlying`, `"common"` or a preferred series already issued |
| `safes` | `safes`: `id`, `holder`, `purchase_amount`, `post_money_cap` or `pre_money_cap`, and `discount` |
| `notes` | `notes`: `id`, `holder`, `principal`, `interest_rate`, `issue_date`, `valuation_cap`, `conversion_base`, `discount` and `repayment_multiple` |
| `priced_round` | `series` (which may have a `cumulative_dividend` with no `accrual_start`, *0.2.0*), `pre_money`, `investments` (`holder`, `amount`, and `pro_rata`), `pool_target_unissued_percent_post` and `seniority`. The seniority may leave out the series the round's SAFEs and notes convert into; they then rank alongside its new series. Optional: `convert_safes`, `convert_notes`, `pay_to_play`, and the pro-rata and anti-dilution toggles |

`readInputs` takes `holders`, `events` and an `exit` with `cap_table_after_event` naming the event whose cap table the exit runs on. The project's [`cases`](https://github.com/spillpoint/spillpoint/tree/main/cases) folder has a worked input for each term, with its expected results.

**Exact numbers are strings:** `"1.5"`, or `"2867562476/1309104599"` for a value whose decimal repeats. Share counts may be plain integers. Floats are refused, because they may already have lost the exact value.

`readExit`, `readCapTable`, `readInputs` and `buildCapTables` check everything. A malformed input throws an `InputError` naming the field. Unknown fields are errors too, so a misspelt term can't be silently ignored.

Every modeling choice the engine makes is written down, with its default, in the project's [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/ASSUMPTIONS.md). The rules themselves are in [`docs/SPEC.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/SPEC.md).

## Numbers

All money and share math uses [decimal.js](https://github.com/MikeMcl/decimal.js) at 40 significant digits, never floating point. Amounts are reported as Decimals: use `toCents` to round half-up to the cent, or `new D("20000000")` to make one. The engine is checked against an independent calculator that uses exact fractions, and agrees with it to the cent.

## API

| Function | What it does |
|---|---|
| `readExit(json)`, `readCapTable(json)` | Read and check an input. |
| `buildCapTables(company)` | Build the cap table after each event. Each comes with the SAFEs and notes still outstanding and what the event worked out. |
| `readInputs(json)` | Read `holders`, `events` and an `exit` on the cap table after one of the events. SAFEs and notes still outstanding there are paid *(0.2.0)*. |
| `prepare(capTable, exitDate)` | Work out the fixed quantities once: shares, preference amounts with any dividends accrued to the exit date, caps, and each note's interest, repayment and conversion. `exitDate` is needed only for dividends and notes. |
| `solve(table, exitValue)` | Decide who converts and who exercises, and pay out. Returns the stable answer, with its decisions and payout lines, holder totals and class totals. |
| `payout(table, exitValue, decisions)` | Pay out with decisions you choose. |
| `paySchedule(table, schedule)` *(0.2.0)* | Each payment's take: `cumulative`, the `decisions` there, the take per holder × security in `lines`, holder and class totals, and `lowered`, the holders whose running total falls. |
| `findBreakpoints(table, [low, high])` | Every breakpoint strictly inside the range. Each has `exitValue`, `jumps`, `curveBelow` and `curveAbove` *(0.2.0)*, and `reasons`, where each reason has a `code`, a `subject` and its `text`. |
| `D`, `parseExact`, `toCents` | Make and format the engine's Decimals. |

**Errors:**
- `InputError`: the input is malformed.
- `UnsupportedTermError`: the input uses a term that isn't modeled yet. It carries the `term`, and the `milestone`: `"later"`, for a term that waits until a case settles it. *(0.2.0: nothing is refused as `"M5"` any more, though the type keeps the value. Milestone names are deprecated and will be removed at 1.0, where a refusal will describe what's unsupported instead.)*
- `NoAnswerError`: the engine stopped rather than guess, for example if no set of decisions is stable.

## License

Apache-2.0.
