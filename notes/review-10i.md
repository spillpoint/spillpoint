# Review: 10i (an outside waterfall as a locked case)

Branch `10i-outside-waterfall-case`, from main at `fb8d2d3` (#140 merged).

**CI and permissions:** no change to `.github/workflows/` or `.claude/`. Your local lift of the `cases/` edit rule in `.claude/settings.json` is not in this PR.

**`cases/`:** one new folder, `cases/outside-01-hustle-fund/`. No existing case is touched. It needs your independent re-derivation and the cases label.

## What to look at first

1. **The case has a new prefix, `outside-`, not `edge-28`.** It isn't an edge case isolating one behavior: it's a waterfall someone else published, and more may follow. So it gets its own section in `docs/SPEC.md`, "Outside cases (10i)". The engine's test support counts `outside-` folders as exit cases, and the pinned list of exit cases in `input.test.ts` names it. See question 1.
2. **I read the article (on 2026-11-14) to check what the case cites.** Its inputs and all its figures are the ones you gave. The page says it was last modified on October 1, 2026, so `DERIVATION.md` gives the date it was read. The article lets each series choose for itself between its preference and converting, which is the engine's default. Only its numbers are in the repo: no text from it.
3. **Besides the new line, the README's 1.0 paragraph changes.** It said 1.0 "waits on an outside waterfall that matches spillpoint's, and a few outside users". It now says it waits on a few outside users, and that the other gate is the waterfall above.

## What changed

**The case, `cases/outside-01-hustle-fund/`:**
- **`inputs.json`:** the inputs as the article states them.
  - Founders: 5,400,000 common.
  - Employees: 600,000 common, the article's shortcut for awards that share in the proceeds.
  - Seed: 2,000,000 preferred at $1.00, 1x non-participating, junior.
  - Series A: 2,000,000 preferred at $3.00, senior, 1x participating with its total capped at 2x.
  - Everything converts 1:1, and there's no pool.
  - The exit values are the article's five, and the range runs to $120M.
- **`expected.json`:** from `reference/generate.py`, untouched.
- **`CASE.md`:** the table and terms, citing the article, and saying Hustle Fund published the example and hasn't reviewed spillpoint.
- **`DERIVATION.md`:** the article cited, how the waterfall pays piece by piece, and the article's breakpoints and payouts beside ours, with each listed exit value worked by hand.

**Engine tests (no engine code):**
- **`packages/engine/test/support/cases.ts`:** `EXIT_CASES` takes `outside-` folders, and its comment says since when.
- **`packages/engine/test/input.test.ts`:** the pinned list of exit cases ends with `outside-01-hustle-fund`.

Every test that runs the exit cases now runs this one: the waterfall at each point, decisions included, the breakpoints and reasons, the frozen copy, and the page's cents test.

**Docs:**
- **`README.md`:** the line, with the article's link, and the 1.0 paragraph's gate sentence.
- **`notes/release-1.0.md`:** a short section, "Checked against a published waterfall", with the line.
- **`docs/SPEC.md`:** "Outside cases (10i)", listing case 1.
- **`CLAUDE.md`:** Where things stand says 1.0's first gate is met and the second, a few outside users, is open.

The README, the release note and `CASE.md` say only that spillpoint reproduces Hustle Fund's published example. Nothing says or suggests Hustle Fund reviewed or endorses spillpoint.

## The figures

**Breakpoints:** the article's $6M, $8M, $16M, $36M and $60M. Ours, from the reference and the engine alike, are $6,000,000, $8,000,000, $16,000,000, $36,000,000 and $60,000,000 exactly:
- $6M: Series A's preference is fully paid.
- $8M: Seed's preference is fully paid.
- $16M: Seed converts.
- $36M: Series A reaches its 2x cap.
- $60M: Series A converts.

**Payouts:** the article's in $M, ours to the cent, Series A / Seed / Founders / Employees:

| Exit | The article | Ours |
|---:|---|---|
| $5M | 5 / 0 / 0 / 0 | 5,000,000.00 / 0.00 / 0.00 / 0.00 |
| $10M | 6.5 / 2 / 1.35 / 0.15 | 6,500,000.00 / 2,000,000.00 / 1,350,000.00 / 150,000.00 |
| $20M | 8.8 / 2.8 / 7.56 / 0.84 | 8,800,000.00 / 2,800,000.00 / 7,560,000.00 / 840,000.00 |
| $45M | 12 / 8.25 / 22.275 / 2.475 | 12,000,000.00 / 8,250,000.00 / 22,275,000.00 / 2,475,000.00 |
| $100M | 20 / 20 / 54 / 6 | 20,000,000.00 / 20,000,000.00 / 54,000,000.00 / 6,000,000.00 |

All 20 match exactly, as you found on main's engine. At the two points where a series is indifferent, $16M for Seed and $60M for Series A, the case shows it keeping its preference (E5). The payouts are the same either way.

## How to check it by behavior

- **The engine on the case:** `pnpm payouts outside-01-hustle-fund --all` says 10 of 10 exit values match `expected.json`. `pnpm breakpoints outside-01-hustle-fund` prints the five breakpoints with their reasons, and whether each matches.
- **One exit value, laid out:** `pnpm payouts outside-01-hustle-fund 45000000`, for example, prints each holder's line beside the case's.
- **The reference:** `python3 reference/generate.py --check outside-01-hustle-fund` prints `ok outside-01-hustle-fund`.
- **Your independent re-derivation** is the cases label's condition, as for any new case.

CI's sequence passes locally: install, typecheck, build, the tests and the reference checks.

## Assumptions added

None in `docs/ASSUMPTIONS.md`: the case uses only rules already there. The case's own choices:
- **The holders are by class,** since the article gives a payout per class: Founders, Employees, Seed Investors and Series A Investors.
- **Employees are 600,000 shares of common,** as the article simplifies them: no strikes, vesting or pool.
- **The exit values are exactly the article's five.** The reference adds the breakpoints, as for every case.
- **The range runs to $120M,** the top you gave, past the last breakpoint at $60M.

## Open questions

1. **The `outside-` prefix and its own SPEC section:** right, or would you rather it were edge case 28?
