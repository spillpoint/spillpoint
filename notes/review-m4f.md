# Review: M4f (pay-to-play)

Branch `m4f-pay-to-play`, M4's fourth engine PR. The engine now builds a round with pay-to-play (R17–R22):
- **each holder's requirement:** its share of the named series × the amount offered to them (R17, R22)
- **who keeps and who converts**, from what each holder invests (R18, R22)
- **partial buyers:** convert everything by default, or under the toggle only the fraction they didn't buy (R20)
- **two series in one round,** each with its own ratio (R22)
- **pricing after the conversion** by default, or before it under the toggle (R19)
- **anti-dilution in the same round** for the preferred that remains (R21)

Cases 17a–17h now build in full.

**Still refused,** naming the term:
- converting notes (M4g)
- a post-money SAFE converting alongside notes or pre-money SAFEs (owed before release)
- SAFEs or notes converting in a down round (owed before release, added here as you agreed)
- new: a pay-to-play round that also converts SAFEs or notes, or has a pro-rata investment (open question 2)

## Run it

```bash
pnpm install && pnpm rounds edge-17a-pay-to-play-priced-after
```

## What to check by behavior

Each case's Series B says "matches expected.json, price matches". Run `pnpm rounds <case>` for each.

### 1. One holder pays, one doesn't (17a, 17b)

```
Pay-to-play on series_a: $1,000,000 offered; converts at series_a 0.1 common per share; a partial buyer converts everything; priced after the conversion
  investor_x: 60.000000%, must buy $600,000, invests $600,000: keeps 1,200,000 series_a
  investor_w: 40.000000%, must buy $400,000, invests $0: keeps 0 series_a, converts 800,000 into 80,000 common
```

- **Priced after the conversion (17a):** $1.2931034483 a share. The round is priced on the 9,280,000 shares outstanding after the conversion.
- **Priced before it (17b):** $1.20, on the 10,000,000 shares before it.

### 2. A holder that pays half (17c, 17d)

Investor W must buy $400,000 and invests $200,000.
- **By default it converts everything (17c):** 80,000 common.
- **Under the toggle (17d):** it keeps 400,000 Series A and converts the other 400,000 into 40,000 common.

### 3. Pay-to-play in a down round (17e, 17f)

Series A has broad-based anti-dilution:
- **Investor W's 800,000** become 80,000 common, with no adjustment.
- **Investor X's 1,200,000** are adjusted.
- **A is 7,780,000** in both cases: 6,000,000 common + 500,000 options + W's 80,000 new common + X's 1,200,000 Series A.

| Case | Priced | Price | Series A's $2.50 becomes |
|---|---|---|---|
| 17e | after the conversion | $1.2718818381 | $2.2142858702 |
| 17f | before it | $1.1788139430 | $2.1743487818 |

### 4. Two series in one round (17g, 17h)

$1,200,000 is offered across the Seed and Series A. Investor X holds two-thirds of the two series combined, so it must buy $800,000, and invests $400,000.
- **By default (17g):** both its series convert: 1,000,000 Seed into 200,000 common, and 1,000,000 Series A into 100,000.
- **Under the toggle (17h):** it keeps half of each series and converts the rest into 100,000 + 50,000 common.

## How the engine handles it

**Pay-to-play adds no new loop.** Who converts depends only on what each holder invests, not on the price, so the engine settles it before pricing the round.

**It works out the table after the conversion once.** Then:
- **The round is priced** on that table, or under R19's toggle on the table before it.
- **Anti-dilution always uses the table after it (R21).** A counts what remains, and only the remaining preferred is adjusted.
- **Under the toggle, the conversion itself** still happens at closing. The new common appears after the Series B shares in the cap table, as in 17b's locked table.

## What the tests check

- **All 26 round cases,** field by field, before each case's stop. 17a–17h now build in full. For each holder of the named series, the comparison gains:
  - its as-converted shares and share
  - its requirement and investment
  - the fraction it bought, and whether it participates
  - for each series, its shares, what it keeps, what converts and the common it gets
- **New tests:**
  - **each 17 case's price,** who converts, what they keep and get, and A where Series A is adjusted
  - **a holder that buys exactly its requirement** keeps its preferred, and one a cent short converts everything (R20, R22)
  - **the two refusals,** below
  - **five malformed terms:**
    - a series that doesn't exist
    - a series named twice
    - a ratio for a series the pay-to-play doesn't name
    - an unknown partial-participation rule
    - an unknown field

**614 engine tests in all,** 8 more than M4e: 16 new, less the 8 "refuses …" tests for 17a–17h, which now build in full.

## What changed

- **`packages/engine/src/rounds.ts`:**
  - pay-to-play: the plan, the conversion and its place in the round
  - each round's details now include `payToPlay`
- **Type exports:** `PayToPlay`, `PayToPlayHolder` and `PayToPlaySeries`, types only.
- **`pnpm rounds`** prints each holder's requirement and outcome.
- **`docs/ASSUMPTIONS.md`:**
  - **R25 and R26:** confirmed.
  - **"Owed before release"** gains SAFEs or notes converting in a down round.
  - **R27** is new (below).

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **No changes** to `cases/`.

## Assumptions added (please confirm)

- **R27 (New): the pool top-up in a pay-to-play round.**
  - **The rule:** the pool's target, and R16's test of whether it's already met, use the post-money count the round is priced on. So they follow R19: after the conversion by default, before it under the toggle.
  - **Priced before the conversion,** the pool ends a little above its target share of the actual post-money count, since the converting preferred becomes fewer common shares.
  - **No case covers this.** No 17 case tops up the pool. The reference calculator does the same.

## Decisions I made, for you to check

1. **Meeting the requirement exactly:** an investment within one part in 10³⁰ of the requirement counts as meeting it (E14's tie). A cent short does not.
2. **The proportional toggle's kept shares** round down with E19's guard, so an exactly whole count isn't lost to the 40th digit.
3. **A pay-to-play needs exactly one common class** to convert into (R22's "the company's one common class"). Otherwise the round is refused with an input error.

## Open questions

1. **Confirm R27.**
2. **Two combinations no case settles are refused,** with milestone "later":
   - **A pay-to-play round that also converts SAFEs or notes.** Does a SAFE's Company Capitalization count the cap table before or after the conversion? The SAFE defines it "immediately prior to" the financing, which needn't follow R19's pricing choice.
   - **A pro-rata investment (R6) in a pay-to-play round.** Does the base count the table before or after the conversion? And does a holder that converts keep its pro-rata right? R18 strips "every other preferred right".

   **I'd add the first to "Owed before release":** insiders often bridge with notes or SAFEs before a recapitalization with pay-to-play. **I'd leave the second refused:** in a pay-to-play round the offered amount stands in for pro-rata rights. Do you agree?

Next is M4g: notes converting in a round. I'm stopping here.
