# Review: 08b0 (the engine's changes, apart from Carta)

Branch `08b0-engine-refusals-and-six-safes`, from main at `5168c35` (#138 merged).

**CI and permissions:** no change to `.github/workflows/` or `.claude/`. Your local lift of the `cases/` edit rule in `.claude/settings.json` is not in this PR.

**`cases/`:** one new folder, `cases/edge-12m-six-safes/`. No existing case is touched. It needs your independent re-derivation and the cases label.

## What to look at first

**Three things went beyond the plan or differ from it:**

1. **A third blank passes, and I've left it.** A note's null `conversion_base` reads as `with_pool`, so it passes `readCapTable` unfilled, as the two you named did. Question 9 said two, and that was wrong. The page always asks for it, so only code calling `readCapTable` directly is exposed. Your answer named two fields, so the code does those two and the docs say the third is still read. See the open question.
2. **A plain sum misses exactly 100% in thirds, at a sale and at a round.** Three $100,000 SAFEs at $300,000 are exactly 100%, and in 40 digits they add up to 0.999…. On the v0.7.0 sources the sale pays the founder $0.00 and the priced round goes through. So one exact test, in whole numbers, now serves both. That changes the round's check, which the plan didn't list. Its wording is unchanged.
3. **The new refusal needed words on the page.** The engine's message starts with its path, `import.cap_table.unconverted_safes:`. At Use and on the Rounds tab, the page now drops that and shows the sentence alone. No other refusal changes.

## What changed

**Engine:**
- **`packages/engine/src/input.ts`:** at a sale, post-money SAFEs owning 1 or more are refused (X19), on a table given in full or built from rounds. It's an `InputError` at `unconverted_safes`, starting with the round's own words, and there's no new term. It runs before the sale's other SAFE limits, since a round couldn't convert these either.
- **`packages/engine/src/input.ts`:** an explicit null `unissued_pool` or `conversion_price` is refused (C19). Left out, each means what it did.
- **`packages/engine/src/rounds.ts`:** the round uses the same exact test.
- **`packages/engine/src/decimal.ts`, `packages/engine/src/ocx-import.ts`:** one `grouped` helper, shared. No behavior change.

**Page:** `saleLimits.ts` has `safesOwnCompanyText`, used by `ImportReview.tsx`, `rounds.ts` and `roundsDraft.ts`. The editor needed nothing: its existing path mapping puts the message on the outstanding SAFEs card, and a test now says so. `file.test.ts` counts the SAFE and note cases by hand, so its 22 is 23, and 12m opens there as a file and pays as its case does.

**Case:** `cases/edge-12m-six-safes/`, six post-money SAFEs at $10M and $20M caps, beside a senior Series A and a junior Seed, with options and a pool. The reference wrote `expected.json`. I worked `DERIVATION.md` by hand from the table, and it agrees with the reference at every breakpoint and listed exit value.

**Docs:**
- **`docs/ASSUMPTIONS.md`:** X19, C19, and the speed numbers on the Later list.
- **`docs/SPEC.md`:** 12m.
- **`packages/engine/README.md`:** Stable from 1.0, with your line on minor releases and `ImportRefusal.format`, and both refusals.
- **Both READMEs:** "Four behaviors change", where they said two.
- **`notes/release-1.0.md`:** items 3 and 4 under "Fixed since 0.7.0". Item 4 says it can stop an input that worked on 0.7.0.
- **`CLAUDE.md`:** Where things stand now says 08b0 is on main, unreleased, and next are 1.0's gates.

**`notes/plan-0.8.0.md`, your two changes:**
- **The ledger rule:** `no_ledger`, under the refusals, in the steps at 08b2, and in "After the merge". The sentence "every security shows in both", which was the hole, is gone.
- **The corrected line:** it now says what the summary gives: the refusal's code, the tab count, each column's cell kinds with counts, and a header only when it's OCX's.

**Also in the plan:** the Carta case folder moves from C19 to C20, since 08b0 took C19. Your 45% replaces my 22.5%.

**Kept out on purpose:** your message names a class from the founder's report as the example of "no column and no ledger". The plan gives the rule without it, since rule 11 lets only Carta's own titles and headers into the repo.

## How to check it by behavior

**The refusal, in the engine.** Your five rows, in `packages/engine/test/safes.test.ts`, under "post-money SAFEs that own the whole company or more (X19)". By hand, `local/safes-over-100.mjs` from `notes/review-08a.md` now stops with:

> cap_table.unconverted_safes: the post-money SAFEs would own the whole company at their caps: A's SAFE, $100,000 at a cap of $8,000 (1,250%); B's SAFE, $100,000 at a cap of $8,000,000 (1.25%). That's 1,251.25% in all, so a cap may be mistyped

Change both caps to $200,001 and it prints the founder's $100.00, as before.

**On the built page, through Use.** I ran both on `pnpm build`'s output, with `.xlsx` files written from the locked cases, driving the page by DOM clicks because the pane was hidden:

| Workbook | What I did | What happened |
|---|---|---|
| `ocx-02-ferncliff-preferred`, conversion price blank | Use, with nothing answered | "Answer each question above first: every one changes who gets what." |
| The same | "Conversion price = issue price", "1x, non-participating", all pari passu, Use | The table opened on the Payouts tab, with no refusal. Founder A gets $5.33M at $10M. |
| `ocx-01-alder-gate`, open SAFE's cap changed to $150,000 | Use | "This cap table can't be used yet. The post-money SAFEs would own the whole company at their caps: Investor S's SAFE, $200,000 at a cap of $150,000 (133.33%). That's 133.33% in all, so a cap may be mistyped." The report stayed up, and no round was offered. |

**The one-click answer writes the price.** It doesn't leave null. The editor then shows the conversion price empty, its way of saying "same as the issue price", and leaves the field out of what it writes. So both of your options happen, in that order. `apps/dashboard/test/ocx-import.test.tsx` checks the written value and goes through Use, for the workbook's issue price and for one you type (ocx-04's `preferred-prices-differ`).

**Every import.** `packages/engine/test/imports.test.ts` looks at every import result in `cases/`, fixtures included: each null conversion price is in `to_fill`, and no pool is null. The only cases with this blank are ocx-02 and ocx-04.

**The six SAFEs.** `cases/edge-12m-six-safes/`. Its `DERIVATION.md` works each of these from the table, and its re-derivation is yours to have done:

| Exit value | What happens |
|---:|---|
| $2,000,000 | Series A's preference is paid |
| $6,000,000 | The junior tier is paid: Seed and all six SAFEs |
| $8,250,000 | The options come into the money |
| $10,625,000 | Seed converts |
| $13,875,000 | The three $10M SAFEs convert together |
| $21,875,000 | The three $20M SAFEs convert together, and payouts jump |
| $31,125,000 | Series A converts, and payouts jump |

At the top of the range the Liquidity Capitalization is 15,625,000. Both jumps' figures are in `DERIVATION.md`.

**What CI runs:** `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference` passes here: the engine's 3,246 tests, the fund's 2,115, the dashboard's 692, the fund page's 827, the reference's 73, and all 125 cases against the reference, edge-12m among them. `cases-locked.yml` fails on the PR until the cases label is on, as it should.

## Assumptions added

- **X19 and C19,** both yours, with two additions of mine marked New in X19: the exact sum, and the refusal coming before the sale's other SAFE limits.
- **What the page says** for the refusal, in the rule's words. It has no wording of its own.

## Open questions

1. **Refuse a null `conversion_base` too?** It's the same defect, one line in `readNote`, with a test and a line in the release note. It's a blank in OCF's O9 and in ocx-04, and Carta's notes would have it. I'd refuse it, as one more commit here. Left out, it would still mean `with_pool`.
2. **A company built from rounds, on the Rounds tab:** the refusal shows as the rounds' problem, in those words, and names no one event, since it's the SAFEs together. The payouts stay on the last good rounds. Is that the right place? I've tested the message and where it's sent, not clicked it in the built page.
3. **`buildCapTables` then `prepare`** never meets the refusal, as it never meets a sale's other limits: only `readInputs` and `readExit` check them. That's unchanged and is how the API reads, but it does mean a library user going that way still gets a negative payout. I'd leave it.

## After your review (2026-11-03)

One commit on the same branch, for your answers 1 and 3. Still no change to `.github/workflows/` or `.claude/`, and nothing under `cases/` beyond edge-12m as you checked it. Answer 2 needs nothing here: you'll check the Rounds tab on the live page after the merge.

### 1. A null `conversion_base` is refused

`readNote` refuses it, and left out it still means `with_pool`. C19, both READMEs, the release note, the plan and `CLAUDE.md` say three fields now. The page and `ocf-check` always write a value, and the OCX tests answer the note's question through Use.

**The test is structural,** in `packages/engine/test/imports.test.ts`, on all 61 imports the locked cases give: each package, workbook and fixture, read by the importer itself, so fixtures whose expected results are stored as differences are covered too. It has your test and two more, since one blank can hide behind another, or behind a sale's limits:

| Test | Runs | What it would catch |
|---|---:|---|
| Yours: `readCapTable` on the result as it stands, blanks unanswered, refuses | 37 | A table with only blanks that read as defaults |
| Each blank alone, the rest answered, read as a starting table, refuses at that field | 111 | A blank hidden by another blank or a sale limit |
| With every blank answered, it reads | 61 | A null no question asks about, which could never be filled in |

**A new kind of blank has no stand-in answer,** so the test stops and says so.

**I broke each thing on purpose to see it fail,** then put the sources back and compared their checksums:

| What I broke | Tests that failed |
|---|---:|
| A null `conversion_base` reads again | 7 |
| A null conversion price reads again | 2 |
| A fourth blank: an OCX SAFE leaves its `discount` null | 54, named as "a new kind of blank" |
| A null no question asks: OCX leaves `conversion_price` out of `to_fill` | 9 |

**Every other field where null reads as a default.** No import can leave one blank. `blanks()` in both importers lists every null on a security, SAFE or note but `cap_multiple`, so if one ever did, it would be a listed blank and the test above would fail on it.

| Field | Null reads as | What the imports write |
|---|---|---|
| Series `cap_multiple` | no cap | Null by design unless capped: only capped participation has one, and that without one is refused (O1, O4) |
| Series `conversion_ratio` | not stated | Never written |
| Series `anti_dilution` | `none` | Always `none` (O11) |
| Series `anti_dilution_a` | not named | Never written |
| Series `cumulative_dividend` | none | Never written: a report note says so |
| A dividend's `method`, `on_conversion` | `simple`, `forfeited` | Never written |
| Table `conversion_groups` | none | Always `[]` |
| A group's `vote_threshold_percent`, `vote_rule` | 50, `more_than` | Never written |
| Table `unconverted_safes`, `unconverted_notes` | none | Left out when empty |
| Table `carve_out` | none | Never written: a report note says so |
| A carve-out's `timing`, a tier's `to` | `before_preferences`, no upper end | Never written |
| SAFE `post_money_cap`, `pre_money_cap` | no cap of that kind | Left out. A cap of unknown kind is `valuation_cap` with `cap_type: null`, which stops the table as unknown fields |
| SAFE `discount`, note `discount` | 0 | Always written, "0" when none |
| SAFE `cash_out_ranks_with` | the most junior tier | Never written |
| Note `interest_method` | `simple` | Always `simple` |
| Note `cap_type` | `pre_money` | `pre_money` with a cap, left out without one |
| Note `valuation_cap` | no cap | Left out when there's none |

A round event's own fields aren't listed, since no import writes them. It writes only a `start` event's table, which reads as above.

### 3. X19 where every payout is worked out

`prepareWorking` is the one place: `prepare` calls it, and so does `working()` on each call for a prepared table written by hand, which is how `solve`, `payout`, `findBreakpoints` and `paySchedule` start. So one check covers both, in the reader's own words, as an `InputError`. The other limits stay with the readers, and a test says so: a pre-money SAFE beside a post-money one is refused by `readInputs`, and `prepare` works it out as before.

**Check it:** your path, a $100,000 SAFE at an $8,000 cap through `buildCapTables`, `prepare` and `solve`. On the v0.7.0 sources the founder gets −$230,000,000.00. Now:

> cap_table.unconverted_safes: the post-money SAFEs would own the whole company at their caps: Investor A's SAFE, $100,000 at a cap of $8,000 (1,250%). That's 1,250% in all, so a cap may be mistyped

**The tests,** in `packages/engine/test/safes.test.ts`: `prepare`, then each of the four on a table written by hand, then a hand-written table changed between calls, thirds, and a table under 100% as before. Every page use of `prepare` comes after `readExit`, so nothing new stops there.

**X19 and the release note** say so, and so does the README's `InputError` line.

**CI:** `pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference` passes here: the engine's 3,463 tests, the fund's 2,115, the dashboard's 692, the fund page's 827, the reference's 73, and all 125 cases against the reference.

