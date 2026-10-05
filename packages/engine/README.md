# spillpoint

Who gets what when a company is sold. Give spillpoint a cap table and an exit value, and it pays out the waterfall: preferences, participation, caps, conversions and options. It also finds every **breakpoint** where the payout curve bends or jumps, and explains each one in plain English.

It runs entirely on your machine. There is no network access and no I/O; your cap table never leaves the process.

> **The charter and the signed documents govern, not this tool.** spillpoint models common terms with documented defaults. Your documents may differ, and where they do, they win.

## Install

```bash
npm install spillpoint
```

It needs Node 22 or later.

## A worked example

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

const table = prepare(exit.capTable);

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

## What it covers (0.0.1)

The exit waterfall on an existing cap table:
- **Seniority tiers.** Series in the same tier are paid pari passu, and a shortfall is shared by preference amount.
- **Preferences** of any multiple.
- **Participation:** non-participating, participating, and participating with a cap.
- **Conversion:** each series converts when that pays it more. Series that must convert together decide by a class vote.
- **Options at any number of strikes,** exercised once they're in the money. The strike money joins the proceeds, and option payouts are reported net of strike.
- **Breakpoints with plain-English reasons:**
  - a tier paid in full
  - a cap reached
  - options coming into the money
  - a series or a group converting
  - payouts jumping when a group's vote flips

Terms that aren't modeled yet are **refused with an error that names the project milestone that adds them**. They are never ignored:
- **Building a cap table from priced rounds** is planned.
- **Also planned:** warrants, cumulative dividends, management carve-outs, earnouts and escrow, and SAFEs and convertible notes still outstanding at exit.

## Inputs

An exit input is plain JSON:
- `cap_table`, with:
  - `holders`
  - `securities` (`common`, `option` with a `strike`, and `preferred` with its terms)
  - `seniority`: the preference tiers, most senior first
  - optional `conversion_groups`
  - `positions`: shares held, per holder and security
  - optional `unissued_pool`
- `range`: the exit values to analyse
- `exit_values`: the points to report

**Exact numbers are strings:** `"1.5"`, or `"2867562476/1309104599"` for a value whose decimal repeats. Share counts may be plain integers. Floats are refused, because they may already have lost the exact value.

`readExit` and `readCapTable` check everything. A malformed input throws an `InputError` naming the field. Unknown fields are errors too, so a misspelt term can't be silently ignored.

Every modeling choice the engine makes is written down, with its default, in the project's [`docs/ASSUMPTIONS.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/ASSUMPTIONS.md). The rules themselves are in [`docs/SPEC.md`](https://github.com/spillpoint/spillpoint/blob/main/docs/SPEC.md).

## Numbers

All money and share math uses [decimal.js](https://github.com/MikeMcl/decimal.js) at 40 significant digits, never floating point. Amounts are reported as Decimals: use `toCents` to round half-up to the cent, or `new D("20000000")` to make one. The engine is checked against an independent calculator that uses exact fractions, and agrees with it to the cent.

## API

| Function | What it does |
|---|---|
| `readExit(json)`, `readCapTable(json)` | Read and check an input. |
| `prepare(capTable)` | Work out the fixed quantities once: shares, preference amounts, caps. |
| `solve(table, exitValue)` | Decide who converts and who exercises, and pay out. Returns the stable answer, with its decisions and payout lines, holder totals and class totals. |
| `payout(table, exitValue, decisions)` | Pay out with decisions you choose. |
| `findBreakpoints(table, [low, high])` | Every breakpoint strictly inside the range. Each has `exitValue`, `jumps`, and `reasons`, where each reason has a `code`, a `subject` and its `text`. |
| `D`, `parseExact`, `toCents` | Make and format the engine's Decimals. |

**Errors:**
- `InputError`: the input is malformed.
- `UnsupportedTermError`: the input uses a term that isn't modeled yet. It carries the `term` and the `milestone` that adds it.
- `NoAnswerError`: the engine stopped rather than guess, for example if no set of decisions is stable.

## License

Apache-2.0.
