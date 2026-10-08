# Review: M5k2 (warrants and cumulative dividends, on the page)

Branch `m5k2-dividends-warrants`. The page no longer refuses warrants or cumulative dividends. It shows them:
- **Cap table tab:** warrant classes, and dividends on each preferred series.
- **Payouts:** warrants counted as converted, and each series' accrued dividends.
- **Rounds tab:** a "Warrants issued" event, and dividends on a round's new series.

Dividends accrue up to the same "Date of the sale" that notes use. Of the terms the engine pays, the page now refuses only carve-outs, until M5k3, and payment schedules, until M5l.

## Your two points from M5k

1. **The dropped SAFE ranking was a page bug only.** The 0.2.0 engine keeps `cash_out_ranks_with`: `buildCapTables` copies each SAFE whole. I checked against the 0.2.0 tarball from M5j: Series A senior to Seed, then a $1M SAFE, at $5M.
   - **Ranked with Series A:** A Fund gets $4,000,000, X $1,000,000 and Seed Fund $0.
   - **By default** (the most junior tier, the Seed's): X gets $333,333.33 and Seed Fund $666,666.67.

   So there's no 0.2.1. Both sides now have that example as a test:
   - **Engine,** in `test/safes.test.ts`: `buildCapTables` keeps the ranking, and pays both figures.
   - **Page,** in `test/file.test.ts`: the ranking survives opening rounds, which the M5k fix hadn't tested.
2. **Nothing ran outside the sandbox.** I took no screenshots this time, since the screenshot script needs headless Chrome outside it. I can add them if you'd like: running `pnpm screenshots` would need your OK first. I checked the layout in the built-in browser, against a preview server running inside the sandbox.

## How to check it by behavior

1. **Case 9, typed in on the Cap table tab** (`test/editor.test.tsx`). That's two founders and Investors X and Y's 2,000,000 Seed at $1.50, with 8% simple dividends from Mar 31, 2022.
   - **Before a sale date:** the page asks for one: "Fill this in: Seed Preferred's cumulative dividends accrue up to the date of the sale."
   - **With Mar 31, 2026:** every payout matches the locked case at all nine listed exit values.
   - **Under the table:** "Seed Preferred has accrued $960,657.53 of cumulative dividends by Mar 31, 2026, the date of the sale." That's 2,000,000 × $1.50 × 8% × 1,461 ÷ 365, a leap day included, as the case reports.
2. **Case 8, typed in:** Lender L's 200,000 warrants for the Seed at $0.50.
   - Every payout matches the case at its eight listed exit values.
   - At $20M the line under the table says "The warrant is exercised."
3. **Millrace, on the Rounds tab** (`test/rounds-editor.test.tsx`):
   - **Add "Warrants issued":** Lena Fischer, 500,000 for common at $1. The card says "Lena Fischer: warrants for 500,000 common shares at $1 a share, not from the pool." The payouts follow the new event, and Ana's headline is what the engine gives on Millrace's own events with that one added.
   - **The warrant's "It buys":** common, plus every series issued before it, including "Seed Preferred (from SAFEs)".
   - **Series B with dividends:** edit it, tick "Cumulative dividends" and type 8%. The round's card adds: "Series B Preferred accrues cumulative dividends of 8% a year on its $1.082112 issue price, simple, from Mar 31, 2025; if it converts, it gives them up."
   - **The Payouts tab** then asks for the sale's date. With Mar 31, 2027, Ana's headline is the engine's, and the table says Series B has accrued **$1,599,999.98**: 9,241,189 shares × $1.082112 × 8% × 730 ÷ 365.
4. **Files** (`test/file.test.ts`):
   - **Cases 8, 9, 9b, 9c and 23** open as saved files, 23 as its rounds. Each gives the engine exactly the case's cap table and sale date, and the same payouts at every breakpoint. Saving again writes the same file.
   - **Case 22's rounds** open with Lender L's "Warrants for Common Stock ($0.5 strike)".

## Decisions I made, for you to check

1. **A warrant whose series is removed** asks "Choose a class" and says "Fill this in" until someone does. It's never moved to another class.
2. **New terms start at the engine's defaults** (C5):
   - **Dividends:** simple, and given up on conversion, with the rate and start date blank for the page to ask for.
   - **A new warrant class:** for common at a $0 strike, as a new option class starts.
3. **The accrued dividends line** shows to the cent. It's the same at every exit value: only the date moves it.
4. **"Share of the company"** counts a warrant for preferred at its series' conversion ratio, as the engine does (R29). On the Payouts tab the footnote then says "every share, option, warrant and preferred share as converted".
5. **I fixed the Rounds tab's fully diluted share in passing.** It counted a warrant for preferred one for one. A test checks a warrant for Series A counts at its 1.137399.
6. **A round's dividends have no start-date field.** They accrue from the round's date (R30), and the hint says the round needs one. They come in the rounds editor only on a priced round's new series: the engine still refuses dividends on stock issued outside one.
7. **The sale's date hint** names what accrues: notes' interest, cumulative dividends, or both.

## What changed

- **The page** (`apps/dashboard/src/`):
  - **`draft.ts`:**
    - warrant classes, and a series' dividends
    - the page's refusal list without them
    - where their messages go
    - the sale's date message, naming the series
  - **`CapTableEditor.tsx`:** a Warrants section in "Classes of stock", dividend fields on each series, and the date shown for dividends.
  - **`PayoutTable.tsx` and `capTable.ts`:** warrants as converted, their class order and exercise, and the accrued dividends line.
  - **The Rounds tab:**
    - **`roundsDraft.ts`:** the "Warrants issued" event, with its holders, and a round's dividend rate as a percentage
    - **`RoundsEditor.tsx`:** the warrants form, and the round's dividends
    - **`rounds.ts`:** the round's dividend line, and warrants for preferred in the fully diluted share
- **Engine:** a test only, `test/safes.test.ts`. No source changes, and nothing to publish.
- **Tests:** 17 more on the page (260), 2 more in the engine (1,304). The tests that expected warrants and dividends to be refused now expect them to open, and the refusal test now uses a carve-out.
- **Docs:**
  - **`docs/ASSUMPTIONS.md`:** C13 (what the page shows and still refuses).
  - **The root README:** what the page shows.

## Checks

- **Engine:** 1,304 tests pass.
- **Dashboard:** 260 tests pass.
- **Reference:** 47 unit tests pass, and all 61 cases match.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** Updates:
- **C13:** the page shows warrants and dividends, and refuses only a carve-out and payment schedules.

## Open questions

1. **Screenshots:** should I take this note's screenshots with `pnpm screenshots`? It needs headless Chrome, outside the sandbox.

Otherwise M5k3, carve-outs with the curves and the X17 wording, is next. I'm stopping here.
