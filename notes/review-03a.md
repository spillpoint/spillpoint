# Review: 03a (0.3.0 cases, part 1)

Branch `03a-cases`. The first of the 0.3.0 PRs: four new cases, each worked out by hand in its `DERIVATION.md`. The reference calculator produced each `expected.json` and agrees with the hand working to the cent.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label: CI's `cases-locked` check fails any PR that touches `cases/` without it

## The four cases

### 11b: an earnout with a negative take (X8)

Case 6b's company, with a $29M closing and a $2M earnout. The figures are the ones you checked: at $29M the Seeds keep their preferences, and at the cumulative $31M the group converts.

| Holder | Closing ($29M) | Earnout ($2M) |
|---|---:|---:|
| Founder A | $18,750,000 | **−$150,000** |
| Founder B | $6,250,000 | **−$50,000** |
| Investor X (Seed-1) | $1,000,000 | +$2,100,000 |
| Investor Y (Seed-2) | $3,000,000 | +$100,000 |

The engine already pays it, so 11b runs in the engine's exit tests from now on.

### 24: a carve-out as a term of the sale (C6, your decision 1)

A company built from two events:
- **Founding:** Founder A 6,000,000 common and Founder B 2,000,000.
- **Seed:** a $3M round at a $12M pre-money valuation: 2,000,000 shares at $1.50.

It's sold with a **10% carve-out given on the exit**, all to Manager M, who holds no shares, paid before the preferences.

| Exit | Manager M | Investor X | Founder A | Founder B |
|---:|---:|---:|---:|---:|
| $10M | 1,000,000 | 3,000,000 | 4,500,000 | 1,500,000 |
| $20M | 2,000,000 | 3,600,000 | 10,800,000 | 3,600,000 |

The breakpoints:
- **$3,333,333.33:** the Seed's $3M is paid in full out of the 90% left.
- **$16,666,666.67:** the Seed converts.

### 12i and 13h: discount-only, with capped participating preferred (X9, X12, your decision 6)

Case 4's company: the Seed is 2,000,000 shares at $1.50, participating, capped at 3x ($9M in all). Investor Z adds:
- **in 12i,** a $1M SAFE with no cap and a 20% discount
- **in 13h,** a $1M note at 6%, with no cap and a 20% discount, at a sale two years on: $1,120,000 owed

**The take is exactly the amount ÷ (1 − discount) wherever it converts**, as decision 6 requires:
- **12i:** $1,250,000 at every listed exit value from $10M up.
- **13h:** $1,400,000 at every listed exit value from $10M up.

Each derivation shows why. Converting, it takes that fixed amount out of the residual first. Then the Seed and common share the rest at one price, the Seed stopping at its cap. So the payouts stay straight lines between breakpoints, and nothing new needs a ruling.

**12i's breakpoints:**

| Exit value | Why |
|---:|---|
| $4,000,000 | The Seed's tier is paid in full: its $3M preference and the SAFE's $1M Cash-Out Amount. |
| $4,250,000 | Payouts jump. Conversion first becomes possible here (reading (a), as in 12c): common falls from $200,000, and the SAFE rises to $1,250,000. |
| $34,250,000 | The Seed reaches its $9M cap. |
| $46,250,000 | The Seed converts, at $4.50 a share. |

**13h's breakpoints** are the same, shifted by the note's terms:
- **$1,120,000:** repaid in full.
- **$4,120,000:** the Seed's preference is paid in full.
- **$4,400,000:** the jump.
- **$34,400,000:** the cap binds.
- **$46,400,000:** the Seed converts.

## The reference calculator

- **A carve-out on the exit:** it reads `exit.carve_out` onto whichever cap table the exit runs on, and refuses an input with one on both the cap table and the exit.
- **Discount-only alongside capped participating preferred:**
  - **The refusal is lifted.** The converting SAFE or note now takes its fixed worth before the capped sharing.
  - **No other answer changes:** without a cap it's the same answer as before, and all 61 existing cases still match exactly.
- **Three new hand-checkable unit tests:**
  - a small discount-only SAFE beside a capped series, with its four breakpoints
  - a carve-out on the exit of a company built from rounds
  - the refusal when it's in both places

## Keeping the engine's and the page's tests honest until 03e

The engine reads these cases from 03e. Until then:
- **Exit carve-out:** the engine refuses `exit.carve_out` by name, as `carve_out_on_the_exit`, "later". Before, it would have called it an unknown field. That's the one engine source change here: a refusal, no behavior.
- **The engine's tests:** they list 12i, 13h and 24 as refused, with their terms. They count 30 cases built from events, with 24.
- **The page's tests:** they check that 12i and 13h are refused with the engine's own message, rather than opened.

## What changed

- **`cases/`:** the four new cases, each with `inputs.json`, `expected.json` and `DERIVATION.md`. No existing case changed.
- **`reference/`:** `case.py`, `waterfall.py`, three unit tests (50), and the README's method.
- **`docs/ASSUMPTIONS.md`:**
  - **X8:** 11b.
  - **X9, X12:** the discount-only rule with capped participating preferred, and the engine's refusal until 03e. Their "still refused" lists no longer name it.
  - **C6:** a carve-out on the exit, refused in both places.
  - **Owed before release:** 11b removed; the discount-only item now names its cases.
- **`docs/SPEC.md`:** 11b, 12i, 13h and 24 in the list of edge cases.
- **Engine:** the refusal above, and the test lists.
- **Page:** tests only.

## Checks

- **Engine:** 1,348 tests pass, 44 more: 11b's exit tests, the three refusals and 24's cap tables.
- **Dashboard:** 292 tests pass.
- **Reference:** 50 unit tests pass, and all 65 cases match.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** X8, X9, X12 and C6 updated, as above.

## Open questions

None. Next is 03b, case 8b: the warrant on the curve. I'm stopping here.
