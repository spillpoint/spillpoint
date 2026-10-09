# Review: 04c (the ledger case, and the tighter ratio check)

Branch `04c-ocf-ledger`, two commits.
1. **The ratio check**, as you set it in the 04b2 review, with the new fixture.
2. **The ledger case:** Quillfern Labs, a fictional company, as an OCF package of 34 transactions (`cases/ocf-12-ledger`), worked by hand into a cap table. That table is a new exit case, edge case 25 (`cases/edge-25-ocf-ledger`), paid by the reference.

**Before it merges, it needs:**
- your tally of the ledger and re-derivation of edge case 25
- the cases label

## 1. The ratio check (O4)

- **Prices** are exact as written, unless written to OCF's full 10 places, which get half a unit in the tenth place.
- **The ratio's** numerator and denominator each get half a unit in their own last place; whole numbers are exact.
- **The class passes** if price ÷ conversion price can equal the ratio within those allowances. Otherwise `conversion_ratio_mismatch`.

What it does to the cases:
- **Millrace** still passes: all its numbers are written to 10 places.
- **Case 03's 2 for 1** is still refused.
- **The new fixture in case 03,** `conversion-ratio-loose`: price and conversion price $1.50, ratio 1.04. Refused.
- **O4's example:** the 4-place example is replaced with one that shows what the ratio's allowance is for. A $1.00 price converting at $0.75 is a ratio of 1.3333…; an export writing 1.3333 is read, with the report line.
- **The one-line mentions** in cases 01 and 03 now say why: prices written to fewer than 10 places, and ratios in whole numbers, are exact.

## 2. The ledger case

**What the ledger covers,** everything 04c was planned for:
- **Transfers:** a founder to a trust, with a balance security; an investor to another, without one.
- **A partial cancellation** of an option grant, returned to the pool, and a whole one.
- **A repurchase,** without a balance security.
- **A retraction.**
- **A 2-for-1 split,** without a reissuance.
- **A conversion ratio adjustment:** the Seed from $1.20 to $1.00, 6 for 5, in a down round.
- **Option exercises,** two.
- **A repricing,** from $0.40 to $0.25.
- **Pool increases,** two.
- **A converted SAFE.**

Where case 01 already used one form, this case uses the other: no reissuance after the split, and a transfer and a repurchase without a balance security.

**Unlike case 01, every term is settled,** so the import can be paid:
- each preferred class has a participation cap
- no SAFE or note is left outstanding

## How to check it

1. **Tally the ledger.** `cases/ocf-12-ledger/DERIVATION.md` walks the 34 transactions in date order, then what each holder has on Dec 31, 2025. The totals:
   - common 10,750,000
   - Seed 2,760,416
   - Series A 3,500,000
   - options: 200,000 at $0.10 and 700,000 at $0.25
   - the pool: 3,000,000 − 900,000 outstanding − 150,000 exercised = **1,950,000**
   - Employee F, whose only grant was cancelled, left out
2. **Edge case 25's breakpoints by hand.** `cases/edge-25-ocf-ledger/DERIVATION.md` gives each with its arithmetic:

   | Breakpoint | Why |
   |---:|---|
   | $3,500,000 | Series A's preference paid |
   | $6,812,499.20 | the Seed's preference paid |
   | $8,237,499.20 | the $0.10 options come into the money |
   | $10,404,999.20 | the $0.25 options come into the money |
   | $21,767,499.20 | the Seed converts, at $1.00 a common share |
   | $30,998,748.80 | Series A reaches its 2.5x cap, at $1.50 |
   | $45,961,248.00 | Series A converts, at $2.50 |

   Its payout table has four rows worked by hand: $2M, $5M, $40M and $60M.
3. **Run `pnpm test`.**
   - The engine already pays edge case 25 exactly as the reference does: the same decisions, payouts within the cent, and the same seven breakpoints with the same reasons. The importer arrives in 04d.
   - The check from 04b confirms the hand-worked import equals edge case 25's cap table.

## Decisions for you to check

1. **The new fixture writes its prices as 1.5, not 1.50.** Under the 04b2 rule, "1.50" got ±0.005. That puts $1.50 ÷ $1.50 between 0.993 and 1.007, which already refused a ratio of 1.04. Written "1.5", the prices got ±0.05: anything from 0.935 to 1.069, which let 1.04 through. So with "1.5" the fixture catches the looser rule. With "1.50" it would pass under either rule. It's the same $1.50 either way, and the new rule refuses it.
2. **The ledger's payouts come through a new exit case,** edge case 25, not an `inputs.json` inside the OCF folder. This keeps C16 as it is: an OCF folder has no `inputs.json`, and one that writes a case names it with `locked_case`. C16 now says a package can come first.
3. **Angel S's Seed shares keep the Seed's $1.20 preference** in edge case 25, though they were issued at $0.96 when the SAFE converted. That's how the import reads them (O5), with the report line and the page's message. Edge case 25 pays the table the import gives, not one edited afterwards.

## Assumptions added or changed

- **O4:** the ratio check, rewritten as above, and its example.
- **C16:** a package can come first, as case 12 does, with its exit case written from it.
- **`docs/SPEC.md`:** edge case 25 and OCF case 7, the ledger; case 03's count is now 22 unsupported and 14 malformed.

## Checks

- **Engine:** 1,673 tests pass, 50 more: edge case 25 through the waterfall, decisions and breakpoints, and the new case files.
- **Dashboard:** 322 tests pass.
- **Reference:** 55 unit tests pass, and all 76 cases match.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Open questions

The three decisions above. Next is 04d, the engine reading a package. I'm stopping here.
