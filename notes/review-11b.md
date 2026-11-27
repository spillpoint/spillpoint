# Review: 11b (a priced round at a stated price)

Branch `11b-round-at-a-stated-price`, from main at `27a697f` (#147 merged, no PR open).
- **The cases lock is on,** and no case file changed.
- **No page change.** The page never writes `price_per_share`, so it doesn't meet one until 11c.
- **The version is still 1.0.0.** 1.1.0's release step, 11o, sets it.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

## What changed

1. **The engine** (`packages/engine/src/rounds.ts`):
   - **A `priced_round` may give `price_per_share` in place of `pre_money`** (R32). Giving both is an `InputError`, and the price must be more than zero. It reads as every number does, so `"3/2"` is $1.50 (C1).
   - **The round is worked out at that price** by the round rules as they stand, R3 to R28, with nothing to solve.
   - **A priced round's details give `preMoney`:** at a stated price, the pre-money valuation the price implies; given a pre-money, its own.
2. **The tests:**
   - **New, `test/stated-price.test.ts`:** your two tests, and a few on the field itself (section 2).
   - **`rounds.test.ts`'s table comparison** moved, unchanged, to `test/support/round-tables.ts`, so both files use it. It takes one flag: at a stated price, the post-money valuation is compared within one part in 10^30, as the price already is, since it's now the price × a 40-digit share count.
   - **`public-shapes.test.ts`** lists `preMoney` among `RoundDetails`' fields.
3. **The docs:**
   - **`docs/ASSUMPTIONS.md`:** R32, under "Rounds and cap tables".
   - **`docs/SPEC.md`:** one line under Rounds.
   - **The engine README:** the input field, `preMoney`, and a line under "What it covers", each marked *(1.1.0)*.
   - **`notes/release-1.1.0.md`:** started.
   - **`CLAUDE.md`'s "Where things stand":** 11b on main, unreleased, for 1.1.0, and 11c next.

## 1. How the engine does it

**Today's round** writes every share count as a straight line in x, the post-money fully diluted shares. Its price is the post-money valuation ÷ x, so a count the price sets is k × x ÷ post-money: the new money's shares, a SAFE's or note's at its discount, a full ratchet's. With the choices settled (cap or discount, top-up or not, which pieces adjust a series), x is one division.

**At a stated price,** those counts are k ÷ the price: fixed, not growing with x. Everything else is as it was:
- the pool's target share of x
- a pre-money SAFE's count, with the pool's increase in its Company Capitalization
- a post-money SAFE's share of its Company Capitalization
- the choices, settled by the same rules in the same loop

So x is still one division. The post-money valuation it implies is the price × x, and the pre-money is that less the new money.

**One helper does the switch,** `byPrice`, at the five places a count is set by the price. It writes the count as the solved round always wrote it, the same expression, so a round given its pre-money is untouched.
- **I checked that against main:** all 41 cases with events, 191 tables, built by main's engine and by this branch's, are the same to every digit, details included, apart from the new field. And each round's `preMoney` is its own `pre_money` exactly.

**The refusals are today's** (R32). That includes a conversion counted in a series' A at its discount, in a round that adjusts the series with the adjustment shares in its price.
- **Why it's refused today:** the price is the root of a quadratic.
- **At a stated price** its shares are fixed, so it could be worked out. But no case settles that round, at a stated price or a solved one, and the reference doesn't work it either.
- **So it's refused the same** (decision 2).

## 2. The tests

**Your first: every locked case's priced rounds, rebuilt at the exact price each solves to.** That's 40 cases, every one with a priced round. 41 cases have events, and 12g's are a SAFE at a sale, with no round. Each price is the case's own exact value, `a/b` where it repeats (C1), from its `expected.json`.
- **The case's tables, field by field,** as `rounds.test.ts` checks them. Every one matches.
- **Today's tables:** every count the same, and every price and amount within one part in 10^30 (E14). Across the 40 cases' tables and details, 2,854 numbers:
  - all 2,205 whole counts are equal
  - 2,763 numbers are identical to every digit
  - the largest difference is 1.7 × 10^-39 of the amount, in edge-16a's B
- **The pre-money each round implies** is its own, within one part in 10^30.

**Your second: at four other prices per round.** Those are half, nine tenths, eleven tenths and twice each round's price. I ran it for each round of a case in turn, with the case's other rounds as they are, so Millrace's three rounds each get four: 268 rounds in all. For each one, today's round is given the pre-money the stated price implies, and the two must build the same tables, as above.
- **260 build,** and match.
- **8 are refused,** each by a rule as it stands. The test pins the list:
  - **6, for a pro-rata investment over its entitlement (R6):** edge-18, 18b twice, 18c twice and Millrace, at 1.1× or 2×. At another price a SAFE converting at its discount gets other shares, which the pro-rata base counts, so the amount the case marks as pro-rata is more than the entitlement there. In Millrace it's the Series A's, since the Seed's price changes the SAFEs' shares under it. For each one, the test finds the implied pre-money with nothing marked pro-rata, which changes no count. Today's round at that pre-money refuses it in the same words.
  - **2, for a discounted conversion counted in A** (R25): edge-16h and 16j at half price, where the down round would adjust the Seed.

**On the field itself:**
- given beside `pre_money`, it's refused
- `"0"` is refused
- `"3/2"` and `"1.5"` build the same tables
- Millrace's Series B at $1.082112 gives the numbers below

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - 3,938 engine tests, 393 more than 1.0's 3,545, all from `stated-price.test.ts`
   - 713 page tests
   - 2,115 fund tests, 13 skipped
   - 838 fund page tests
   - the reference's 79 unit tests, and all 86 exit and round cases matching it
2. **The two tests on their own,** from `packages/engine`:

   ```bash
   pnpm vitest run test/stated-price.test.ts
   ```

3. **Millrace's Series B three ways.** I've left `local/stated-price.mjs` in your `local/`, which git ignores. It builds Millrace with its Series B given its $36,000,000 pre-money, then at the exact price it solves to, then at $1.082112, six places, as a purchase agreement would round it. From the repo root:

   ```bash
   node --no-warnings local/stated-price.mjs
   ```

   It prints:

   ```text
   pre-money $36,000,000:
     price 1.0821118250, pre-money 36000000.00, Cobalt 9241189, Series A's CP2 1.8247520242
   price 12003689592480000/11092836539841877:
     price 1.0821118250, pre-money 36000000.00, Cobalt 9241189, Series A's CP2 1.8247520242
   price 1.082112:
     price 1.0821120000, pre-money 36000005.27, Cobalt 9241187, Series A's CP2 1.8247521089
   ```

   The first two are the same round. The third is what a founder recording from the purchase agreement would see: the price is $1.082112 exactly, the solved price rounded up, so Cobalt's $10,000,000 buys 9,241,187 shares, two fewer, and the price implies a $36,000,005.27 pre-money. Series A's adjustment moves with the price. This gap between a stated price and a solved one is what 2.0's check of a recorded round, `within_rounding`, will name (L14).

## Decisions for you to check

1. **"Its new name joins Stable from 1.0's lists."** It doesn't, and I think it shouldn't.
   - **What the lists hold:** the terms the engine and the imports refuse with, the codes an import's report notes, and the reasons a breakpoint gives. The stable-names test holds them to the engine's.
   - **What this step adds:** none of those, since nothing new is refused. Its new names are the input field `price_per_share` and the field `preMoney`, each marked *(1.1.0)* in the README, with the shapes and README tests pinning them.
   - **If you meant a list of input fields** under Stable from 1.0, that's a list of its own, with a test to hold it, and I'd do it as a step of its own.
2. **The refusal at a stated price.** A discounted conversion counted in A is refused at a stated price too, though there its shares are fixed. No case settles the round, so it stays a rule as it stands. R32 says so, marked New. Letting it build would need a case worked by the reference first.
3. **`preMoney` on every priced round,** given or implied, not only at a stated price. A round given its pre-money reports its own, so code reading the field needn't ask which kind of round it is.

## Assumptions added or changed

**R32, new,** under "Rounds and cap tables": the stated price, the implied pre-money, the refusals, and the two tests' results. Its default was in the plan you agreed. Refusing the discounted conversion in A at a stated price is marked New (decision 2).

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**
- **The main-to-branch comparison** ran on a copy of main's engine sources in my scratchpad, from `git archive`, with decimal.js linked from the repo's install. Nothing was downloaded.

## Next

11c, the SAFEs tab, on the tables the page builds today. I'm stopping here.
