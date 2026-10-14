# Review: 10d (half-up rounding that can't land a cent low)

Branch `10d-half-up-rounding`, from main at `56efe30` (10c). One commit. Nothing under `cases/`, `reference/` or `packages/fund/` changed.

**The rule,** in every half-up rounding meant for reading: round to 20 places, half-up, then to the places shown, half-up. It's spillpoint-fund's FA14, now in spillpoint too.

## 1. The engine

**`decimal.ts`:**
- **`halfUp(amount, places)`:** a new helper that does the rule. It's internal, not exported from the package, so the API is unchanged.
- **`toCents`** now uses it. Its comments give your first amount and why 20 places is safe.

**E10** now says what the rule is and why, with your first amount as the example. It also says:
- **Only true ties move:** an amount whose exact denominator is under about 10^18 can't sit within 10^-20 of a half cent without being on it.
- **No locked case's amount changes.**
- **It's spillpoint-fund's rule too** (FA14).
- **The amounts themselves stay at 40 digits,** and the page's payments round down instead (P1).

**Beyond `toCents`:** the engine had other half-up roundings for reading, and they now use the same helper (decision 1):

| Where | What it writes |
|---|---|
| `reasons.ts`, `money` | Dollars in a breakpoint's reasons |
| `reasons.ts`, `perShare` | A price per share in a breakpoint's reasons, to six places |
| `reasons.ts`, `shares` | A share count that isn't whole, in a breakpoint's reasons |
| `rounds.ts`, `usd`, `count` and the pro-rata message's percentage | Amounts, share counts and a percentage in round errors |
| `breakpoints.ts`, `decisions.ts`, `payments.ts` | The exit values in `NoAnswerError` messages. These used `x.toFixed(2)`, which is half-up straight to the cent; now `toCents(x)`. |

## 2. The page

**`format.ts`:**
- **`halfUp(amount, places)`** does the rule, as the engine's does.
- **`halfUpSignificant(amount, digits)`** is the same rule to significant digits. It's `halfUp` to 20 places, then to the digits.

**Every half-up rounding meant for reading now goes through them:**

| File | What it shows |
|---|---|
| `format.ts`, `dollars` | Whole dollars |
| `format.ts`, `dollarsAndCents` | To the cent |
| `format.ts`, `exitValueText` | Whether an exit value has cents |
| `format.ts`, `shortDollars` | "$9.75M", to three significant digits, and under $1,000 to the dollar |
| `format.ts`, `percent` | A share to one place |
| `format.ts`, `priceText` | The editor's prices to six places: a fraction, and a decimal typed longer |
| `format.ts`, `fractionValue` | A price typed as a fraction, to six significant digits |
| `paid.ts`, `leftOver` | The exit value the leftover is worked from, to the cent |
| `BreakpointList.tsx` | Which breakpoint the exit value is at, compared to the cent |
| `RoundsView.tsx`, `count` and `forYou` | Share counts, and "For you: 46.5% → 25.5%" |
| `capTable.ts`, `outstandingNames` | A SAFE's or note's amount in its name, where a holder has two: "Priya Shah's SAFE ($500,000)" |
| `ocfImport.ts`, `price` | Prices in an import's report |
| `rounds.ts`, `count` | Share counts on the Rounds tab |
| `rounds.ts`, `price` | A price per share, to the cent when that's exact, else six places |
| `rounds.ts`, `pct` | Percentages as written |
| `rounds.ts`, the anti-dilution line | The new conversion ratio, to six places |
| `rounds.ts`, `pieceLines` | Each piece's price, and whether it's "close" to the conversion price |

**Not changed, and why:**
- **The value pickers:** `App.tsx`'s `middleOf`, `scale.ts`'s `valueAt` and `PayoffChart.tsx`'s `tidy`.
  - They pick an exit value to three significant digits, for a file without a saved view, the slider and a drag across the chart.
  - The value they pick is then shown exactly.
  - They round a sum halved, an `exp()` or a chart position, never a 40-digit amount.
  - Assumption P2 says so.
- **`paid.ts`'s `paidCents`:** a payment rounds down, with its own 10^-20 hair (P1).
- **`strikeText`, and every `toFixed()` with no places:** these never round.
- **`CapTableEditor.tsx`'s "N shares" in its remove-a-row question:** it uses `toLocaleString` on a number. That's whole share counts, exact as numbers. It's no half-up rounding, so I left it.

**P2 (new)** puts the page's rule in "The page" section of ASSUMPTIONS, with what's covered and what isn't.

## 3. The engine's roundings that aren't for display (your item 3)

**Neither needs the rule.** Neither is changed.

- **`rounds.ts` line 201, `roundDownShares`:**
  - **What it does:** it rounds half-up only to find the nearest whole number. It takes that number only within 10^-20 (E19), and otherwise takes the floor.
  - **Why the rule isn't needed:** a count a hair under a half rounds to the whole number below, not the one above. Either way it's half a share away, so the floor is taken, which is what an exact half floors to.
- **`rounds.ts` line 544, `roundHalfUp`:** this is R9's toggle, a conversion price to the nearest hundredth of a cent. It already has its own guard: a price within one part in 10^30 of halfway counts as halfway (`nearlyEqual`). That's the same idea as the 20 places, relative rather than absolute. Rounding to 20 places too would change nothing.

**Also seen:**
- **`ocx-cells.ts`'s 15 significant digits** reads a spreadsheet's stored text, which is exact before any arithmetic, so it has no hair to correct.
- **`rounds.ts` line 1124 rounds down, not half-up:** a pro-rata entitlement for its error message. See open question 1.

## 4. Tests (your item 4)

**Engine, `test/decimal.test.ts`:** your four amounts, each worked out by the engine as two holders of common at that exit value.
- Each test checks three things:
  - the exact amount is the half cent: `x × a ÷ (a + b)`
  - the engine's amount is a hair under it, within 10^-30
  - half-up straight to the cent gives a cent low, and `toCents` gives the cent above
- **A test of the rule's edges:**
  - your 40-digit figure, positive and negative
  - a half cent less 10^-21, which rounds up
  - a half cent less 10^-19, which doesn't
  - a plain .674999 that rounds down

**Page, `test/format.test.ts`:**
- **The same four, through `dollarsAndCents` and `exitValueText`:** "$56,625,109.63", "$530,639,805.83", "$4,360,893.85" and "$5,946,673.43".
- **A test of the helpers through what they show,** each a hair under a half:
  - `dollars`: $1,235
  - `shortDollars`: $9.75M
  - `percent`: 12.4%
  - `halfUp` on a negative half cent

**On main:**
- **Engine:** the five new tests fail.
- **Page:** the four `dollarsAndCents` tests fail, showing "$56,625,109.62", "$530,639,805.82", "$4,360,893.84" and "$5,946,673.42". The page test of the helpers fails too, since `halfUp` isn't there.

**Two page tests changed.** Each pinned a price that's whole cents in exact arithmetic but showed six places, because 40 digits left it a hair under. Decision 2 covers both.

| Test | Was | Now |
|---|---|---|
| `acceptance.test.tsx`, the README's rounds example built by hand | "Seed Fund's SAFE converts at its cap price, $0.900000 a share" | "$0.90 a share". The price is exactly $10M ÷ (10,000,000 ÷ 0.9). |
| `names-and-prices.test.ts`, "keeps six places where the price isn't exact" | Investor X's SAFE price matched six places | "$1.95 a share", exactly ($20,000,000 − $500,000) ÷ 10,000,000 |

**`names-and-prices.test.ts` also gets a new check:** a $512,345 SAFE, ($20,000,000 − $512,345) ÷ 10,000,000 = $1.9487655. That keeps six places, "$1.948766", so the test still checks what its title says. Its comment had said the $500,000 price wasn't a whole number of cents. In exact arithmetic it is.

## 5. The locked cases (your item 5)

**Nothing changes:**
- **`generate.py --check`** passes, and all 83 cases match the reference. Nothing under `cases/` or `reference/` changed.
- **Full precision:** all 48 exit cases dump byte-identically to main. That covers their breakpoints, reasons with their text, every answer and line at each listed exit value, and every payment take.
- **To the cent:** I rounded every amount the 48 exit cases give, 9,322 of them, both ways: half-up straight to the cent, and 20 places first. They include every line, holder total, class total, breakpoint, series preference, accrued dividend and payment take. None differs.

**So no expected value would change.**

**A fuzz of two holders of common:**
- **The setup:** 30,000 random tables, 60,000 amounts, each compared with exact half-up worked in integers.
- **What it found:** 184 exact half cents. Half-up straight to the cent got 12 of them wrong; `toCents` now gets none wrong. Every other amount matches too.

**On the Rounds tab:**
- **The method:** I diffed every line the tab writes for all 41 round cases, 444 lines, between main and this branch.
- **One line changes:** edge-18c's Series A, "$3.000000 a share" on main and "$3.00 a share" here. The reference has that price as exactly 3.

## 6. The release note (your item 6)

`notes/release-1.0.md`'s "Fixed since 0.7.0" has a second entry, with your four amounts in a table.

**The READMEs:**
- **Both say two behaviors change in 1.0,** both fixes, where 10c's line said one. The engine README's "1.0 has the same API" line and the root README's "Coming next" line now name both fixes (decision 3).
- **The engine README's Numbers section** adds one sentence: `toCents` rounds to 20 places first *(1.0)*.
- **The README's rounds example** still prints the SAFE's price as `$0.900000`: its own code formats it with `toFixed(6)`. That's the README's own formatting, so I left it.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **Engine:** 3,176 tests, 3,171 before plus 5.
   - **Page:** 679 tests, 674 before plus 5.
   - **Fund:** 324 tests, and its page's 211, both unchanged.
   - **The reference:** 73 unit tests, and all 83 cases matching it.
   - **The fund reference:** 23 unit tests, and its 16 cases.
2. **Your first amount, from the command line:**

   ```bash
   node --input-type=module -e 'import { D, prepare, readCapTable, solve, toCents } from "./packages/engine/src/index.ts"; const t = readCapTable({ holders: [{ id: "a", name: "A" }, { id: "b", name: "B" }], securities: [{ id: "common", name: "Common Stock", kind: "common" }], seniority: [], positions: [{ holder: "a", security: "common", shares: 45 }, { holder: "b", security: "common", shares: 117 }], unissued_pool: "0" }); const a = solve(prepare(t), new D("203850394.65")).answers[0].payout.holderTotals.get("a"); console.log(a.toString(), toCents(a));'
   ```

   It prints `56625109.62499999999999999999999999999998 56625109.63`. On main, the second figure is `56625109.62`.
3. **On the page,** with `pnpm dev`:
   - **Start from "Your own company":** build the README's rounds example, with Ana's 9,000,000 common, a 10% pool, Seed Fund's $1,000,000 SAFE at a $10M post-money cap, and a $5M Series A at $20M pre-money. The Series A card says "Seed Fund's SAFE converts at its cap price, $0.90 a share". Main says $0.900000.
   - **Your four amounts:** enter a cap table with only common, A at 45 shares and B at 117, and set the exit value to $203,850,394.65. A's row shows $56,625,109.62 on both main and this branch, because it's a payment, rounded down (P1). The half-up figures are elsewhere: a breakpoint's exit value, the exit value's box, and what a series is owed. So the page's check for your four amounts is the `dollarsAndCents` test above.
4. **Nothing else changed:** `git diff --stat main -- cases reference packages/fund` prints nothing.

## Decisions for you to check

1. **The engine's other display roundings got the rule too:** its reason text (`money`, `perShare`, `shares`), `rounds.ts`'s message amounts, and the exit values in `NoAnswerError` messages. You named only `toCents`, but your rule was "every half-up rounding". The reasons are shown on the page and are part of the API, and none of the exit cases' reasons changes.
2. **A price exact to the cent now shows to the cent.** The Rounds tab's "to the cent when that's exact" check (05e) now applies the rule too.
   - **What changes:** a price that's whole cents in exact arithmetic but a hair under at 40 digits now shows as "$0.90", not "$0.900000". It changes one line in the 41 round cases (edge-18c's $3.00) and two page tests (section 4).
   - **Correcting 05e:** `notes/review-05e.md` said the README example's SAFE "isn't exactly 90 cents". That was wrong: it is, and the six places came from this very hair. I've left that note as it was, as history.
3. **Both READMEs now say two behaviors change in 1.0,** both fixes, where you set the wording for one in 10c.
4. **`halfUpSignificant`** sits beside `halfUp` for the two significant-digit roundings, `shortDollars` and `fractionValue`. It's `halfUp` to 20 places, then to the digits, so the 20-place step is in one place.

## Assumptions added or changed

- **E10:** the rule, as above.
- **P2 (new):** half-up for reading on the page.
- **No modeling choice changed.**

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**
- **Two temporary files:** for the Rounds tab diff, I used a scratch test file in `apps/dashboard/test/`, run once on each side, then deleted. The other scratch scripts are outside the repo.

## Open questions

1. **`rounds.ts` line 1124 rounds a pro-rata entitlement down to the cent with no hair.** In the error that refuses too large a pro-rata investment, a whole-cent entitlement a hair under would be stated a cent low: "Mark $X as pro-rata". The fix would be P1's and E19's hair, 10^-20, as `paidCents` adds. It's a round-down, not half-up, so it's not in this step. Shall I fold it into a later step?

## Next

I'm stopping here.
