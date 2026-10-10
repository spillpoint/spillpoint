# Review: 05c4 (the engine takes the SAFEs' most conversions and warrant shares keeping a preference, and the speed work)

Branch `05c4-engine-safe-rules-and-speed`, with the `cases/` edit rule back on: no case file changed. It has three commits:
1. **The engine and the reference:**
   - rules 2 and 3 in the engine;
   - a tie for warrants, in both;
   - the speed work.
2. **The checks:**
   - the random tables against the reference;
   - the timing script and test;
   - the tests' timeouts back to the defaults.
3. **The docs and this note.**

## 1. Your two rules, in the engine

**Rule 2, the most conversions (E20):** the SAFEs' answer under each set of the others' decisions comes from "every SAFE converts":
- every SAFE for which converting doesn't strictly pay more switches to cash, all at once, until none does;
- the result is then checked: if a SAFE taking cash would gain by converting, every combination is weighed instead.

Where one SAFE converting makes the others' conversion worth more, the first set where none wants cash has the most conversions. That isn't certain beside a series at its cap, or options not exercised, so the result is checked. In 200 random tables (section 4) the check never failed.

**Rule 3, warrant shares (X1):** a warrant exercised into a series that keeps its preference is left out of the count, with the series' own shares. A warrant not exercised still counts.

**12k and 12l pass,** at every listed exit value and breakpoint, with the same reasons and jump flags. Their wording:
- **12k at $5,000,000:** "…It converts together with Investor Y's SAFE. On its own, converting would pay it only $450,000 here, less than its cash; with both converting, each gets its fixed share of the Liquidity Capitalization, which pays more above this exit value, so they convert."
- **12l at $11,233,333.33:** the Seed's reason values its shares at $1.00, the price just above, and adds "Converting puts its shares in the Liquidity Capitalization Investor S's SAFE converts on, so its conversion shares grow with it: just above this exit value its payout jumps up and common's down."

## 2. Found: a warrant's tie, which rule 3 made matter (New, for you to confirm)

Timing Larkspur with its note and 8 SAFEs, the search stopped at $18,798,634.27 with "2 stable answers". The reference agrees there are two:
- **the warrant exercised,** and all 8 SAFEs taking cash;
- **the warrant not exercised,** and all 8 converting.

**Why:** the warrant's $1.00 strike equals the Seed's $1.00 preference per share, so exercising pays it nothing more. But exercised into a Seed keeping its preference, its 100,000 shares leave the SAFEs' count, and that tips all 8.

E20's tie already says a series or note that's indifferent where its choice moves the SAFEs keeps its preference, or is repaid. Warrants weren't in it.

**The default I've built, in the engine and the reference:** such a warrant isn't exercised, as E5 would have it. Here that means the SAFEs convert, which is also what the old count gave. It changes no locked case: the reference's full check passes on all 83.

## 3. The speed

Larkspur at a sale, as the page works it out: every breakpoint over the case's range, then the answer at each. **Machine:** Apple M1 Pro laptop, 8 cores, 16 GB, Node 24.21.0. **Before** is main with #72 (05c3); **after** is this branch.

| SAFEs | Without the note, before | after | With the note, before | after |
|---:|---:|---:|---:|---:|
| 2 | 1.0s | 0.2s | 2.6s | 0.3s |
| 4 | 4.2s | 0.3s | 10.9s | 0.6s |
| 6 | 11.9s | 0.4s | 32.4s | 0.8s |
| 8 | 29.9s | 0.5s | 80.9s | 1.1s |
| 10 | 70.9s | 0.7s | 204.1s | 1.4s |

**Against your 2-core figures** for main (2.3s, 15s and 61s without the note; 6.4s, 38s and 155s with it), this laptop is 2.3 to 5 times faster, more on the bigger runs. So with the note and 10 SAFEs I'd expect about 3 to 7 seconds on CI's machine. Rather than guess, a new engine test runs that table and prints its time on every CI run: "Larkspur with its note and 10 SAFEs: …s". **I'll read the number from this PR's first CI run and tell you.** If it's over 5 seconds, that's the point to talk about a limit on the page, or more work.

**What changed, in plain terms:**
- **The SAFEs' answer by dropping from "all convert"** (section 1), in place of weighing every combination of SAFEs, which doubled the work with each SAFE.
- **Straight lines, not runs.** With the decisions fixed, every amount paid moves in a straight line with the exit value until the waterfall's formula changes: a tier or debt paid in full, a cap reached, a carve-out's band, a SAFE or note with no cap able to convert. The waterfall now reports those conditions. Two exact runs that agree on them give every amount on the interval where they hold, at least a billionth of a dollar from changing. Outside it, or where payouts curve (X17), the waterfall runs exactly.
- **Results kept with their comparisons.** Option exercise and the SAFEs' answer for each set of decisions are kept with each comparison they turned on, and the interval where it comes out the same. At another exit value only the expired comparisons are made again. If each comes out as before, so does the result.
- **Option exercise is kept as a certificate.** Since the price only falls as classes are exercised, the first k classes are where E16's sequence stops when each of them, all exercised, nets more than nothing and the next wouldn't. That's what is kept, and it's tried first for the next set of decisions. Where the sequence settles but that doesn't hold, as in a near tie, the sequence's own comparisons are kept. Checking every combination still runs the full sequence, so the decision tests compare both routes at every case point.
- **Smaller savings:**
  - the SAFEs' count worked out once per payout, not once per SAFE;
  - the holder × security lines worked out only when read;
  - a tier paid in full giving each claimant its claim, without a multiply and divide.

**The answers reported are always run exactly:** `solve` and each breakpoint's answer. Only the solver's weighing uses the lines. A breakpoint's exit value can differ from before in the 40th digit, because its margins come off the lines. Every test compares to the cent and passes; one 05c4 test that compared 12k's $5,000,000 exactly now compares to the cent.

## 4. The randomized check against the reference

**The tables:** `reference/tools/random_safes.py` builds 200 tables with a fixed seed. Each has:
- two to four post-money SAFEs, each with its own amount ($100,000 to $1M) and cap ($4M to $20M), some with a 20% discount;
- common, sometimes options;
- none, one or two preferred series, non-participating, capped or participating, stacked or pari passu;
- sometimes a warrant: for a series at or below its preference per share, or for common;
- sometimes a capped note.

The reference works each as a case. `pnpm check-random` compares the engine to the cent: breakpoints, reasons and jump flags, and the decisions and every holder × security line at each point.

**The results:**
- **150 tables agree in full:** every breakpoint, reason, jump flag and payout.
- **50 tables the reference's own breakpoint search couldn't finish:** it couldn't place a jump, or found "no clean region" next to one. For these, the reference worked out the payouts at the listed exit values, and a cent either side of each breakpoint the engine found. 39 agree everywhere.
- **The other 11 have an exit value with two stable answers** (section 5).
- **Larkspur with 4, 6 and 8 SAFEs,** with and without the note, agree too, at listed values and a cent either side of each breakpoint. Larger ones the reference would take hours on.

## 5. Found: two stable answers with equal-priced series beside SAFEs (open question)

**All 11 tables share one shape:** two non-participating series at the same price per share, beside post-money SAFEs.
- **Without SAFEs,** equal-priced series convert at the same exit value.
- **With them, either one can convert first.** Each one's conversion joins the SAFEs' count, the SAFEs convert into more shares and dilute it, and the other then prefers its preference. So over a range, "A converts, B keeps its preference" and the reverse are both stable.

The reference finds both answers in every one. E8's search before M2c found no table like this, but it had no SAFEs.

**What the engine does there:**
- **In 5 tables,** its breakpoint search stops with "there are 2 stable answers", as E8 says it should.
- **In 6,** both ends of its search agree, so it reports one answer at a point where the reference has two. That's the gap E15 describes. Its per-segment check, "checking every combination once per segment of the curve", was meant to close it, and was never built, because no table had two answers.

**Nothing in 05c4 caused this,** and no locked case has it. It needs a rule from you, for example:
- **a tie rule,** such as the more senior series converting first, or neither converting (the outcome from below), or both converting together;
- **a refusal** with a plain message;
- **building E15's per-segment check,** so the engine always reports both answers and the page says so.

## How to check by behavior

1. **The cases:** `pnpm test`. 12k and 12l run like every other exit case.
2. **The speed:**
   ```bash
   pnpm safes-timing 2 4 6 8 10
   ```
   That prints the after column above for your machine. On CI, the test-node-22 log has the line "Larkspur with its note and 10 SAFEs: …s".
3. **The random tables,** reproducible from seed 1. They're written to `local/`, which git ignores.
   ```bash
   python3 reference/tools/random_safes.py 200 1 local/random-safes
   ```
   ```bash
   pnpm check-random local/random-safes
   ```
   ```bash
   python3 reference/tools/random_safes.py probe local/random-safes
   ```
   ```bash
   pnpm check-random local/random-safes
   ```
   The last run lists the 11 tables of section 5 and nothing else. The first two steps take a few minutes on this laptop.
4. **On the page:** use a cap table with several SAFEs. Larkspur's export with a third SAFE answered as post-money now opens in about a second; under the old solver it took several.

## The tests on the 60-second timeout

All eight go back to the defaults: 5 seconds for engine tests, 20 for page tests. Times on this laptop:

| Test | Time |
|---|---:|
| Engine: SAFEs follow the Seed at 12j's jump | 0.33s |
| Engine: case 27's RSUs, a full search | 0.31s |
| Engine: no codes or jargon in the reasons, all 48 exit cases (slowest, 13j) | 0.34s |
| Page: the OCF check on Larkspur | 0.88s |
| Page: the OCF check's leak tests, 68 (slowest, note-base-unreadable) | 1.92s |
| Page: the SAFE and note cases open as files, 22 (slowest, 13j) | 0.93s |
| Page: case 27's Series B through "Add a round" | 1.85s |
| Page: Larkspur with a third SAFE answered post-money (#72's fix) | 1.17s |

`FULL_SEARCH_TIMEOUT` is gone from both packages. The one new long test, the 10-SAFE timing, has a 20-second limit of its own: a limit at the 5-second target would fail at random on a slow runner.

## Decisions for you to check

1. **The warrant's tie** (section 2): an indifferent warrant whose choice moves the SAFEs isn't exercised. New, in the engine and the reference.
2. **Dropping from "all convert" all at once,** with the check and the fallback (section 1).
3. **The straight-line reuse** (section 3):
   - a billionth of a dollar is how close to a change a line may be used;
   - breakpoint values can differ in the 40th digit;
   - the answers reported are run exactly.
4. **Option exercise as a certificate,** from the price only falling as classes are exercised (section 3).
5. **A new public field, `payout.structure`:** the conditions the waterfall's formula turns on. Also, a payout's `lines`, `holderTotals` and `classTotals` are now worked out when first read, which is invisible to code that reads them. Both are for the 1.0b API review.
6. **The 10-SAFE timing test** prints its time, and has its own 20-second limit.
7. **The tools:**
   - `pnpm safes-timing`, with its table builder in `packages/engine/test/support/larkspur.ts`;
   - `reference/tools/random_safes.py` and `pnpm check-random`.

## Assumptions added or changed

- **E20:**
  - the most conversions, in the engine since 05c4, and how it's found;
  - the warrant's tie, New;
  - 12k's figures.
- **X1:** the engine since 05c4.
- **E15:**
  - reusing work across exit values;
  - the two-answer tables found, and the per-segment check never built. Open question.
- **The later list:** the speed entry, done for SAFEs.
- **The plan:**
  - 05c4's results;
  - the faster search in 0.5.0's release notes.

## Open questions

1. **The warrant's tie** (section 2): confirm "isn't exercised"?
2. **Two equal-priced series beside SAFEs** (section 5): which rule? And a locked case for it, in a cases PR?
3. **CI's time for the 10-SAFE table:** I'll read it from this PR's first CI run. If it's over 5 seconds, a limit on the page or more speed work?

## Checks

- **Engine:** 2,253 tests pass.
- **Page:** 472 tests pass.
- **Reference:** 67 unit tests pass, and every `expected.json` matches: 83 cases.
- **Typecheck:** clean.
- **Random tables:** as in section 4.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

05e, release 0.5.0, once the two open questions are settled. I'm stopping here.
