# Review: 03f (engine: the warrant on a curve, and a fix for two warrants for one series)

Branch `03f-engine`. The engine now finds case 8b's breakpoints. 8b is the warrant that comes into the money while payouts curve; until now the finder stopped there with its guard error.

Building the tests turned up a real bug, older than this PR, in both the engine and the reference. With two warrants for one series, the second was underpaid. It's fixed in both. No case had two, so no expected value changed.

No change to `cases/`.

## The warrant on a curve (8b; your answer 7)

**What the finder does now on a curved stretch.** It still checks the stretch at 64 points. Where it reads a decision change, it stops only after these steps fail:
1. **Gather readings.** It keeps the readings still in the stretch's state, at least four, bisecting towards the change if there are fewer.
2. **Fit.** It fits the deciding holder's gain from switching as (a·x + b) ÷ (c·x + 1), from the first, middle and last readings. That's the reference's method: the warrant's share of a tier that isn't paid in full is one straight line over another.
3. **Check against a fourth reading.** The fit must match it to within 10⁻²⁰ of the reading.
4. **Solve.** The breakpoint is where the fitted gain is zero, which must fall between the last reading in the stretch's state and the first one out of it.
5. **Confirm.** Exactly one decision must change there, and payouts must meet: a kink, not a jump.

**Still stopped with the guard error,** as in the reference:
- two decisions changing at once
- a conversion group
- a gain of another shape
- a root outside the bracket
- a jump on a curve

**How close it is.** On 8b:
- **The fit:** the fourth reading lands within 10⁻⁴⁰, exact to the engine's 40 digits.
- **The kink:** **$20,000,000 ÷ 19 to 40 digits.**
- **Bunched readings:** even with readings bunched 0.0001 apart, the fit is good to 10⁻³², so 10⁻²⁰ leaves room both ways.

The reasons and flags match the case: `warrant_in_the_money` and `payouts_curve`, curving on both sides.

## The bug: two warrants for one series (E12)

When warrants for a series are exercised, the series' payout splits among its own shares and each warrant's, pro rata by shares (E12).
- **The bug:** both the engine and the reference split it in a loop that took each warrant's part from what the previous one had left.
- **The effect:** a second warrant for the same series was paid a part of a smaller total. It was underpaid, and the series overpaid.
- **The fix:** every part is now taken from the series' whole total.

**How it showed up.** I wrote a test with two warrants for 8b's Seed, at $0.50 and $0.60, expecting two kinks on the curve. The engine didn't find the second where I'd worked it by hand. At $1,100,000, with both exercised, it paid the $0.60 warrant −$10,000 instead of −$7,619.05. The reference's code had the same loop.

**Tests, each failing under the old split:**
- **One unit test in each of the engine and the reference.** Case 8's company with two warrants, at $1,500,000.
  - **Each Seed share gets:** $161 ÷ 220.
  - **The $0.60 warrant:** $13,181.82 net, where the old split gave $9,855.37 when it came after the $0.50 warrant.

**It changes an answer 0.2.0 gave**, so the release notes list it under changed answers.

## Two warrants on one curve

With the split fixed, the same company with warrants at $0.50 and $0.60 gives three breakpoints:
- **$20,000,000 ÷ 19:** the first warrant comes in. Exercised, its shares join the tier: (X + $50,000) ÷ ($2,100,000 + 0.1X) = $0.50.
- **$121,000,000 ÷ 94 = $1,287,234.04:** the second comes in, where (X + $110,000) ÷ ($2,200,000 + 0.1X) = $0.60.
- **$20,900,000 ÷ 9:** the tier is paid in full.

The engine places all three to 30 digits. **The reference, run separately, finds the same three exactly.**

The same company with both warrants at $0.50 still stops with the guard error: both come in together, so two decisions change at once.

## How to check it by behavior

```bash
pnpm breakpoints edge-08b-warrant-on-the-curve
```

Three breakpoints, $1,052,631.58, $2,333,333.33 and $11,222,222.22, all matching `expected.json`. The first says the warrant comes into the money and payouts curve on both sides.

```bash
pnpm payouts edge-08b-warrant-on-the-curve 1500000
```

On the curve above the kink:
- **Investor X:** $1,361,702.13
- **Lender L's warrant:** $36,170.21 net
- **Manager M:** $102,127.66

Each line matches `expected.json`.

## Decisions I made, for you to check

1. **The fit's tolerance is 10⁻²⁰ of the fourth reading.** It's loose enough for readings gathered close together, and far tighter than any other shape would pass.
2. **Fixing the warrant split now,** in both the engine and the reference, rather than stopping. E12 already says "pro rata by shares", so the fix makes no modeling choice. And it was blocking a test of this PR's own work. No case's expected values change. If you'd rather it were its own PR, say so and I'll split it out.

## Also in this PR

- **`docs/ASSUMPTIONS.md`:**
  - **X17:** the engine's method since 03f.
  - **E12:** several warrants for one series, and the fix.
- **The engine README:** a warrant coming into the money on a curve is placed; any other decision changing there stops the finder.
- **`notes/release-0.3.0.md`:** 8b under New, and the warrant fix under changed answers.
- **A comment I misplaced in 03e:** in `reasons.ts`, `leftFor` sat between `sharers` and its doc comment. Moved back.

## The tests

- **Engine:** **1,482 tests pass**, 23 more.
  - 8b runs through every exit test.
  - **New:** the kink to 30 digits; two kinks on one curve; the guard for two at once; the warrant split.
  - **Removed:** the test that 8b stops with the guard error.
- **Dashboard:** **310 tests pass.**
- **Reference:** 55 unit tests pass, one more, and all 75 cases match.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** E12 and X17 updated.

## Open questions

None. Next is 03g: a post-money SAFE converting beside notes or pre-money SAFEs (21b–21d) and pay-to-play conversions (17i). I'm stopping here.
