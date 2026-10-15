# Review: 10e (short amounts that never read "$1000K")

Branch `10e-short-amounts`, from main at `c67984d` (10d). A page change only: nothing under `packages/`, `cases/` or `reference/` changed, and nothing is imported from `apps/fund`. One commit.

## 1. What changed

**The bug:** `shortDollars` in `apps/dashboard/src/format.ts` picked the unit before rounding. So $999,999.99, which is at least $1,000, became 999.99999K, and rounding that to three significant digits made "$1000K". Under $1,000, $999.50 rounded to whole dollars read "$1000".

**The fix:** it now rounds first, then picks the unit from the rounded amount.
- **Rounding:** from $1,000 up, three significant digits, with 10d's `halfUpSignificant`. Under $1,000, whole dollars, with `halfUp`.
- **The unit:** B, M or K, the first the rounded amount reaches.

That's the idea of the fund page's `short()`, written here with 10d's helpers, so an amount a hair under rounds as its exact value. The sign is still taken from the amount.

**ASSUMPTIONS P2** now says a short amount is rounded before its unit is picked.

## 2. Tests

`test/format.test.ts`'s new test "rounds first, then picks the unit, so it never reads $1000K or $1000" has your eight:

| Amount | Main | Now |
|---|---|---|
| $999,999.99 | $1000K | $1M |
| $999.50 | $1000 | $1K |
| $999,499 | $999K | $999K |
| $999,500 | $1000K | $1M |
| $999,500,000 | $1000M | $1B |
| $9,750,000 | $9.75M | $9.75M |
| $812 | $812 | $812 |
| -$999,999.99 | -$1000K | -$1M |

**The "Main" column:** I worked it out with main's rule, and ran the new test against main's `format.ts`: it fails on the first amount, "$1000K".

**Three more checks in the same test,** at a unit's edge:
- **$999.49** reads "$999".
- **$999,499.99** reads "$999K".
- **$999,500 less 10⁻³⁰** reads "$1M", as its exact amount does (10d).

**The existing headline test is unchanged and passes:** $9.75M, $39.4M, $100M, $20M, $450K, $1.5B and $812.

## 3. The chart's axes and the slider's ends

I served the built page in the browser pane.

**Millrace as it opens, $0 to $300M:**
- **The slider's ends:** "$300K" and "$300M". Its value reads "$100M".
- **The x-axis:** "$0, $100M, $200M, $300M".
- **The y-axis:** "$0, $20M, $40M, $60M, $80M".
- **The headline:** "At $100M you get $9.75M".

All as before.

**Millrace with its range set to $0 to $999,999.99,** on the Cap table tab:
- **The slider's ends:** "$1K" and "$1M". Main's rule gives "$1000K" for the top.
- **The slider's value and the headline:** "$1M", in "At $1M you get $0".
- **The x-axis:** "$0, $200K, $400K, $600K, $800K".
- **The y-axis:** up to "$1M".
- **The exit value's marker on the chart:** "$1M".

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **Page:** 680 tests, 679 before plus this one.
   - **Engine:** 3,177 tests, unchanged.
   - **Fund:** 324 tests, and its page's 211.
   - **The reference:** 73 unit tests, and all 83 cases matching it.
   - **The fund reference:** 23 unit tests, and its 16 cases.
2. **On the page,** with `pnpm dev`: on the Cap table tab, set the exit values to explore to 0 and 999999.99, then open Payouts. The slider's right end, its value and the headline read "$1M", and the chart's axes read "$0 … $800K" and up to "$1M". On main the slider's right end reads "$1000K".
3. **Nothing else changed:** `git diff --stat main -- packages cases reference apps/fund` prints nothing.

## Decisions for you to check

1. **Under $1,000, whole dollars, half-up,** as before. $999.50 rounds to $1,000 and so reads "$1K", as you listed.
2. **The sign comes from the amount, not the rounded amount,** as the fund's `short()` does. So -$0.40 would read "-$0", as it did before. No negative amount near zero is shown in short form on the page today.

## Assumptions added or changed

- **P2:** a short amount is rounded before its unit is picked.
- **No modeling choice changed.**

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **`.claude/launch.json` was edited temporarily,** and is restored byte for byte. It's another session's file, kept out of git. I added one entry, to serve the built page for the check above, and removed it afterwards.
- **Nothing ran outside the sandbox.**

## Open questions

None.

## Next

I'm stopping here.
