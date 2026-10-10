# Review: 05c5 (more than one stable answer stops the engine)

Branch `05c5-two-answers-stop`. The `cases/` edit rule is on, and no case file changed. Your two decisions after #73, the answer to your question, and CI's number. It has two commits:
1. **The engine and the reference**, with their tests and the page test.
2. **The docs and this note.**

## CI's number from 05c4's timing test

Larkspur with its note and 10 SAFEs, on #73's run: **4.63s** on the Node 24 job, and **4.12s** on Node 22. Both are under 5s, with the other test files running alongside on the 2-core runner.

This PR's check adds about a third (section 3), so expect about 6s on this PR's run. Your 2-core figures (13.3s with 10 SAFEs and the note) are on the later list beside these.

## 1. The warrant's tie, confirmed

A warrant whose strike equals its series' preference per share doesn't exercise while the series keeps its preference, as an indifferent holder stays put. E20 now says so, as confirmed. No code changed: 05c4 already did this.

## 2. More than one stable answer stops the engine

**Your rule:** wherever the series, warrants and notes have more than one stable answer, and those answers pay holders differently, the engine stops with a plain message, and never reports just one of them. It takes three parts.

**1. Every combination at every exit value.** With 12 or fewer series, warrants and notes, the engine now checks every combination of their choices, not only where its two ends disagree. Answers that pay every holder the same are still one answer (E5).

**2. Your message,** naming the series:

> At $11,047,000: Series 0 Preferred and Series 1 Preferred are at the same price, so with the SAFEs outstanding either could convert here, and the documents don't say which. spillpoint doesn't pick one. Adding a round that converts the SAFEs avoids this.

- **Where the prices differ:** "…could each be the one that converts here, with the SAFEs outstanding, and the documents don't say which…". It happens: with Series 1 at $1.01 instead of $1.00, random-1-149 still has two answers. At $1.05 it has one.
- **Where a warrant or note is among them:** "…could settle more than one way here…".
- **Without SAFEs,** the SAFE clauses are left out.
- **"At $X:" comes first,** because the breakpoint search's stop needs to say where.

**3. Nothing between the readings.** Checking only at the exit values the search reads isn't enough. random-1-185 has two answers only from about $10.10M to $10.14M, and the search's readings fell either side.
- **So the search now follows which combinations are stable between its readings.** Each combination's stability turns on comparisons of what a player gets switching and staying, with the SAFEs re-settled. Each comparison is kept with how it came out and the interval where that holds: until its line crosses a tie threshold, or its lines or the results it's worked out from stop holding. It's compared again only there, so the search can't step past a second answer.
- **I tried the simpler route first:** every combination's margins in the search itself. That makes the search 4 times slower, because every combination's structure changes start new stretches.

**Limits, written into E15:**
- **Past 12 series, warrants and notes,** it's the two ends as before.
- **Where payouts curve** (a carve-out alongside the preferences, X17), there are no lines to follow, so the check is made only where the search reads.

**The reference does the same:** `evaluate` raises `SeveralAnswers` with the same message, its dollars to the cent. Every locked case is unchanged: none has two answers.

**On the page,** both places show the message:
- the payouts at the exit value you're on: "The engine couldn't settle on an answer at $11M: At $11,047,000: …", which repeats where;
- the curves and breakpoints: "Couldn't work out the curves and breakpoints: At $10,896,153.85: …".

## 3. The cost

Larkspur at a sale, as the page works it out, on the same M1 Pro laptop as 05c4:

| SAFEs | Without the note, 05c4 | 05c5 | With the note, 05c4 | 05c5 |
|---:|---:|---:|---:|---:|
| 2 | 0.2s | 0.2s | 0.3s | 0.4s |
| 4 | 0.3s | 0.3s | 0.6s | 0.8s |
| 6 | 0.4s | 0.5s | 0.8s | 1.1s |
| 8 | 0.5s | 0.6s | 1.1s | 1.4s |
| 10 | 0.7s | 0.8s | 1.4s | 1.9s |

## 4. Your question: why the reference's search couldn't finish 50 of the 200 tables

**No time limit:** the generator has none, and every table either finished or raised an error. I reran the reference's search on each of the 50 and recorded where and why it failed:

| Why | Tables | The reference's message |
|---|---:|---|
| **Two stable answers:** two equal-priced series beside SAFEs | 10 | "no clean region next to …" |
| **An error in the reference's jump placement,** where only SAFEs change: two or three unequal SAFEs converting together | 40 | "cannot place the jump near …" |

**The two-answer tables:** the search needs one answer either side of a change, so it stopped where the second answer began. The 11th two-answer table, random-1-140, is among the 40: its search failed first at a SAFE-only jump, below its two answers.

**The 40:** under rule 2, unequal SAFEs convert together where the last of them becomes indifferent with the others already converting. The jump is there, and payouts jump for the SAFEs that gain.
- **The reference's jump locator** flips each changed SAFE from the answer below: one SAFE converting alone. That's never indifferent there, so it finds no point.
- **Flipping from the answer above** would find it. It's a small change, not made here.
- **On those 40,** the engine's breakpoints matched the reference's payouts at the listed exit values and a cent either side of each breakpoint.

**With this PR,** the reference stops with your message on all 11 two-answer tables, where before it gave "no clean region". The check now reads:
- 150 tables agree in full;
- 39 agree at their listed exit values and a cent either side of each breakpoint;
- 11 have more than one stable answer somewhere, and the reference and the engine both stop.

## How to check by behavior

1. **The tests:** `pnpm test`, and `pnpm test:reference`.
   - `packages/engine/test/two-answers.test.ts` has random-1-149 and random-1-185: your message at a point and from the search, the wording for close prices, and the narrow stretch.
   - `reference/tests/test_two_answers.py` has the same two tables in the reference.
   - `apps/dashboard/test/two-answers.test.tsx` opens random-1-149 as a file on the page.
2. **The random check, as in 05c4:** the last run says "11 tables have more than one stable answer somewhere; the reference and the engine both stop on them" and "The engine agrees with the reference on every one".
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
3. **On the page:** open a cap table with Series 0 and Series 1 Preferred both at $1.00, non-participating, beside two post-money SAFEs; random-1-149's table is in the engine test's support file. At $11,047,000 the Payouts tab shows the message.

## Decisions for you to check

1. **The message's variants** (section 2):
   - "could each be the one that converts here" where prices differ;
   - "could settle more than one way" where a warrant or note is among them;
   - no SAFE clauses without SAFEs;
   - "At $X:" first.
2. **The page repeats the exit value** ("…at $11M: At $11,047,000: …"). I left the page's wrapper as it is for every stop the engine makes.
3. **The limits:** past 12 decision-makers, and where payouts curve (section 2).
4. **SPEC's line changed** to your rule: "If more than one stable answer exists and they pay holders differently, stop with a plain message naming what could go either way. Never pick one."
5. **`solve` now stops where it used to return several answers.** Its `answers` holds one answer whenever there are 12 or fewer decision-makers. It's under changed behavior in the plan's 0.5.0 release notes.

## Assumptions added or changed

- **E8:** the stop and its message.
- **E15:**
  - every combination with 12 or fewer;
  - the search following stability between readings;
  - the limits;
  - the gap closed.
- **E20:** the warrant's tie, confirmed.
- **SPEC:** the two-answer line under conversion decisions.
- **The later list:**
  - "report both answers, with a locked case";
  - the speed entry, with your 2-core figures and CI's.
- **The plan:**
  - 05c5;
  - the changed behavior for 0.5.0's release notes.

## Open question

**Fix the reference's jump placement for SAFEs converting together,** flipping from the answer above (section 4)? Then those 40 random tables can be compared in full. It changes no locked case, and it would go in its own small PR.

## Checks

- **Engine:** 2,258 tests pass, 5 new.
- **Page:** 473 tests pass, 1 new.
- **Reference:** 69 unit tests pass, 2 new, and every `expected.json` matches: 83 cases.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

05e, release 0.5.0. I'm stopping here.
