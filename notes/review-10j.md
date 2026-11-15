# Review: 10j (a faster breakpoint search)

Branch `10j-faster-breakpoint-search`, from main at `b22caf7` (#142 merged). Draft PR #143: you take it out of draft after the parent session's check.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

**`cases/`:** untouched.

**Outside the engine, its tests and the docs:**
- **`apps/dashboard/test/saved-0.6.0.test.tsx`:** one test, as you allowed (below). No page code, and no fixture.
- **`reference/tools/random_many_safes.py`:** a new dev tool beside 05c4's `random_safes.py`, writing the random tables. The reference's calculator is untouched.
- **The root `package.json`:** a script, `pnpm compare-engines`.

## The result

**The target is met.** 26 post-money SAFEs, each with its own amount, beside 5 option strikes take 3.39s on CI's Node 24 job and 4.00s on Node 22. Main took 26.1s on this laptop, and about 1.65 times that on your 2-core sandbox.

**On this laptop** (M1 Pro, Node 24.21), every breakpoint and the answer at each, as the page works them out:

| Table | Strikes | Breakpoints | Main | 10j |
|---|---:|---:|---:|---:|
| 26 SAFEs, each its own amount | 1 | 7 | 6.68s | 0.58s |
| | 3 | 8 | 16.41s | 1.34s |
| | **5** | **10** | **26.10s** | **2.52s** |
| | 8 | 13 | 36.67s | 4.43s |
| | 12 | 18 | 48.64s | 7.85s |
| 26 SAFEs, two amounts (the plan's table) | 1 | 7 | 1.59s | 0.62s |
| | 3 | 8 | 2.79s | 1.17s |
| | 5 | 10 | 4.82s | 2.12s |
| | 8 | 13 | 7.50s | 3.93s |
| | 12 | 17 | 11.54s | 6.86s |
| 10 SAFEs, two amounts | 3 | 8 | 0.80s | 0.29s |
| Larkspur with its note, 10 SAFEs | | 10 | 2.0s to 2.5s | 1.2s |

**On CI,** as the timing tests print them: main is step 1's run (55e9aed), and 10j is c86969e's. Each pair is Node 24, then Node 22.

| Table | Strikes | Main | 10j |
|---|---:|---:|---:|
| 26 SAFEs, each its own amount | 1 | | 0.88s, 1.04s |
| | 3 | | 1.99s, 2.03s |
| | **5** | | **3.39s, 4.00s** |
| | 8 | | 5.82s, 6.77s |
| | 12 | | 10.40s, 10.71s |
| 26 SAFEs, two amounts | 1 | 2.21s, 1.84s | 1.21s, 1.49s |
| | 3 | 4.05s, 3.55s | 1.87s, 1.91s |
| | 5 | 7.06s, 6.40s | 3.33s, 3.41s |
| | 8 | 10.58s, 9.85s | 5.88s, 6.29s |
| | 12 | 15.90s, 14.71s | 10.12s, 11.39s |
| 10 SAFEs, two amounts | 3 | 1.12s, 1.03s | 0.49s, 0.51s |
| Larkspur with its note, 10 SAFEs | | 6.75s, 5.47s | 4.22s, 5.18s |

Main's timing test had no rows with each SAFE its own amount, so CI has no before for them. The commits after c86969e change no engine code.

**Your 2-core sandbox, main** (your numbers, Node 22): two amounts, 5.21s at 3 strikes and 18.33s at 12; each its own amount, 27.06s at 3 and 83.23s at 12.

## Your answers, as applied

1. **Part 1, the rewrite:** done. Where payouts curve (X17), a stretch is read as before, every margin a stop. Everything in "What stays" stays: the two readings just above a stop, the check in each stretch's middle, the second-answer watch, curves, jumps and reasons.
2. **Part 2:** not done. E16's check of classes beyond the next runs as on main, under every set of choices. Nothing else in E16 changed either.
3. **The identity bar:** checked on every locked case and on the random tables (below).
4. **Each its own amount is the target table:** it's in the timing test beside the two-amount rows, at 1, 3, 5, 8 and 12 strikes.

## What changed

**1. The search follows each gain on its own lines** (`breakpoints.ts`, `followStretch`).
- **Where it stops:** only where the answer's own margins, a vote, or a gain that decides the answer reach zero. Those are the answer's tiers, caps and next option class, a free series', warrant's or note's gain from switching, and each SAFE's gain on its way to settling.
- **Where it doesn't:** where a margin of a set of choices one switch away reaches zero, such as an option class coming into the money there. It reads that set again just above, by itself, two readings as a stop would make. Then it follows the gain on its new line. Nothing paid changes there.
- **A gain that decides a set one switch away,** as one SAFE's switch decides how the SAFEs settle under a series' switch (E20), is followed the same way. Where it reaches zero, that set is read again with every switch under it.
- **Where a reading changes sides:** a gain on another side of the tie threshold just above than just below is a change of decisions there. If it decides the answer, the search stops there, as before.
- **Anything a reading can't follow** stops the search where it would have stopped before, and reads everything above. That covers a reading that can't be read, an error, or a payout that curves.
- **The check in the middle** now expects the keys of each set of choices read again below the midpoint to have changed where they were read. Everything else it checks is as before.
- **`decisions.ts`:** each snapshot's margins come as a tree of those sets of choices (`Unit`), and one set can be read again at another exit value (`unitAt`). The flat margins are the same keys, in the same order, as before.

**2. Each set of decisions keeps its last four lines, option exercises and SAFE answers** (`lines.ts`, `decisions.ts`).
- **Why:** the search now reads a set ahead as it follows a gain, then behind, in the middle check and the second-answer watch. With one kept, each replaced the other's. At 5 strikes, each its own amount, the watch made 5,974 exact waterfall runs with one kept, and 2,000 with four.
- **How:** a kept result is used where every comparison it turned on held when last made, as before. A kept result whose comparisons all held there last time isn't walked again.
- **Memory:** main's peak on the target table is 1.1 GB, and 10j's is 676 MB.

**Counted** on copies with counters. Main's are step 1's counts, and 5 strikes wasn't counted there:

| Table | Strikes | Breakpoints | Stops, main | Stops, 10j | Sets read again by themselves, 10j | Exact waterfall runs, main | 10j |
|---|---:|---:|---:|---:|---:|---:|---:|
| Each its own amount | 3 | 8 | 802 | 12 | 837 | 12,032 | 6,080 |
| | 5 | 10 | | 14 | 1,151 | | 12,122 |
| | 12 | 18 | 1,732 | 22 | 1,757 | 53,284 | 40,892 |
| Two amounts | 12 | 17 | 206 | 21 | 1,758 | 49,603 | 41,195 |

A stop is three readings of every margin, a few hundred at 26 SAFEs. A set read again by itself is two readings of one set of choices.

**What's left** at 5 strikes, each its own amount, as shares of a profile of the run (loading the engine is most of the rest):
- **The follower's readings:** 38%.
- **The second-answer watch:** 19%.
- **The stops' readings and middle checks:** 24%. Just above a stop the answer is new, so its first reading settles the SAFEs on sets of choices not read before: 232 exact waterfall runs each.
- **The answer at each breakpoint:** 5%.
- **E16's check of classes beyond the next:** of the 12,122 exact runs, 5,092 are for it. Each time a set's next class comes into the money, every class beyond it is weighed on a set of choices not read before. It's the biggest part at 12 strikes, which is why they improved least. It isn't changed (your answer 2).

## The checks

**Every locked case.**
- **The dump:** every exit case's results at full precision, from main and from 10j. That's 50 cases and 4,716 lines: every breakpoint, jump, curve flag and reason, and the decisions and every line at each breakpoint and listed exit value.
- **What differs:** 402 lines. All are breakpoint exit values and the payouts at breakpoints. The largest difference is $5.5 × 10⁻¹⁹, relative 6.4 × 10⁻²⁷, so about the 27th significant digit.
- **What doesn't:** no text, reason, decision, jump, curve flag, breakpoint count or error, and no cent. No value sits on a half cent.

**The page's saved files** (your answer 1).
- **The change:** `saved-0.6.0.test.tsx`'s test is now "opens, and gives 0.6.0's breakpoints, their reasons and jumps exactly and their exit values to the cent and within $10⁻¹⁵, and its payouts to all 40 digits".
- **Millrace's file:** 5 of its 10 breakpoints move, by at most $5.54 × 10⁻¹⁹.
- **The company file:** none of its 5 moves.
- **Unchanged:** the payouts at the recorded exit values, to all 40 digits. `results-0.6.0.json` and every fixture are as they were.

**1,000 random tables, against main.**
- **The tables:** from `random_many_safes.py tables 1000 10`, every one built afresh:
  - 2 to 26 post-money SAFEs, each with an amount of its own, at one to four caps from $8M to $40M, some with a 20% discount. Together they own 5% to 45% of the company at their caps.
  - 0 to 12 option classes, each at its own strike from $0.10 to $8.
  - In 599 of them, one or two preferred series: non-participating, capped or participating, stacked or pari passu.
  - In 311 a capped note, and in 143 a warrant.
  - The range is $0 to $100M, with six listed exit values.
- **The result: all 1,000 agree** under your bar:
  - every breakpoint count, reason, jump and curve flag, and every decision and stop message, byte for byte;
  - every number within $10⁻¹⁵ of main's.
- **15 stop** on both engines with E8's message, word for word, where two stable answers begin.
- **On a half cent:** 8 values come out a hair either side of a half cent from the two engines, $10⁻³⁴ to $4 × 10⁻²⁰ apart. `toCents` shows the same cent from both for 7 of them. The eighth is in table many-10-0781: breakpoint 13's exit value, about $69,987,703.125.
  - **10j:** 69987703.12500000000000000000618273875063, shown as $69,987,703.13.
  - **Main:** 69987703.12499999999999999996419930186248, shown as $69,987,703.12.
  - **The other seven,** each shown the same by both: $322,359.38, $0.93, $140,228.13, $91,453.13, $20,296,765.63, $1,278,749.93 and $1,315,999.97.
- **Times,** with six tables at a time beside the reference's run, so each is slower than alone:
  - 3,984s in all for 10j, against 16,709s for main;
  - a median of 1.3s a table for 10j, against 4.8s;
  - on the tables 10j takes over half a second on, it's a median of 3.9 times faster.
  - **One table looked slower on 10j:** many-10-0373, at 271.8s against main's 248.1s. That was the load: alone, 10j takes 10.1s on it and main 36.1s. It has 21 SAFEs at one cap, 12 strikes, two series and a warrant.

**68 random tables with a conversion group, against main.**
- **The tables:** every table of `random_many_safes.py tables 1000 12 --groups` with a group: two series that can convert, converting together.
- **The result: all 68 agree** under your bar. None stops, and no value sits on a half cent. 10j took 185s in all, and main 1,080s.

**240 random tables, against the reference.**
- **The tables:** from `random_many_safes.py tables 240 11 --most-safes 6 --most-strikes 4 --groups`. They have the same shape as the 1,000, but only 2 to 6 SAFEs and 0 to 4 strikes, and 19 have a conversion group.
- **Where I stopped, and why:** the reference tries every combination of the SAFEs' and the options' decisions at each exit value it reads. At 6 SAFEs and 4 strikes that's 1,024 under each choice of the series, and a table takes it up to several minutes. All 240 took 49 minutes on this laptop's 8 cores.
- **The result: the engine agrees with the reference on all 240.**
  - **235 in full,** as 05c4's check compares them: every breakpoint within a cent, with the same reason codes, subjects and jump flags, and every decision and holder × security line to the cent at each breakpoint and listed exit value.
  - **5 by their listed exit values, and a cent either side of each of the engine's breakpoints:** the reference's own search couldn't finish them. In 2 it couldn't place a jump. The other 3 are its crash on a conversion group beside SAFEs (below).
- **The engine checked** is 10j's. On the same 240 tables, `compare-engines` finds 10j and main agree under your bar on every one.

**Tests:**
- **The engine:** 3,512 pass: 3,507 as before, and the timing test's 5 new rows.
- **The page and the fund:** pass, 699 for the page, 2,115 and 838 for the fund (13 skipped, as on main). On CI the page's one failure, on c86969e, was the 40-digit test above.
- **The reference's own tests:** `pnpm test:reference` passes.
- **Typecheck:** clean.

## Found: the reference crashes on a conversion group beside SAFEs (its own step, after 10j)

**What happens:** where a group's conversion moves a SAFE, the reference can't word its reason, and its breakpoint search stops with `RuntimeError: generator raised StopIteration`. `breakpoints.reasons` names what the SAFE follows by looking each one up among the securities, then the notes. A group's player is named by its series joined with "+", which is neither.

**The smallest table that shows it,** shrunk from one random table:
- **Common:** 5,000,000 and 1,000,000, two founders.
- **Series 0:** 4,000,000 at $1.00, senior. **Series 1:** 500,000 at $2.00. Both 1x non-participating, and the two are one conversion group.
- **One post-money SAFE:** $75,000 at a $10,000,000 cap.
- **No options or pool.** The range is $0 to $100M.

**The engine, there:** it finds a jump at $10,579,345.09, where the group converts and the SAFE switches with it (`series_converts`, `safe_switches`, `payouts_jump`). The reference's payouts at the listed exit values still work.

**In the random check:** 3 of the 19 tables with a group, many-11-0006, many-11-0125 and many-11-0142. The table above is many-11-0006, shrunk. The check compares those tables at their listed exit values, and a cent either side of each of the engine's breakpoints, as 05c4's did where the reference's search couldn't finish.

## How to check it by behavior

1. **The speed:**
   ```bash
   pnpm many-safes-timing --each-its-own 1 3 5 8 12
   ```
   ```bash
   pnpm many-safes-timing 1 3 5 8 12
   ```
   On CI, each test job's log has the lines "26 SAFEs at two caps, each its own amount, 5 option strikes: …s".
2. **The tests:** `pnpm test`.
3. **The random tables against main,** reproducible from seed 10. They're written to `local/`, which git ignores.
   ```bash
   python3 reference/tools/random_many_safes.py tables 1000 10 local/random-many-safes
   ```
   ```bash
   mkdir -p local/main-engine && git archive main packages/engine/src | tar -x -C local/main-engine
   ```
   ```bash
   ln -s "$PWD/packages/engine/node_modules" local/main-engine/packages/engine/node_modules
   ```
   ```bash
   pnpm compare-engines local/main-engine/packages/engine/src local/random-many-safes
   ```
   The report goes to `local/random-many-safes/compare-engines.txt`, with both engines' time on each table. It took an hour on this laptop, six tables at a time, most of it main's.
4. **The random tables against the reference,** from seed 11:
   ```bash
   python3 reference/tools/random_many_safes.py tables 240 11 local/random-many-safes-ref --most-safes 6 --most-strikes 4 --groups
   ```
   ```bash
   python3 reference/tools/random_many_safes.py work local/random-many-safes-ref
   ```
   ```bash
   pnpm check-random local/random-many-safes-ref
   ```
   ```bash
   python3 reference/tools/random_many_safes.py probe local/random-many-safes-ref
   ```
   ```bash
   pnpm check-random local/random-many-safes-ref
   ```
   The `work` step takes about 50 minutes on 8 cores, and the probe step a minute. The last run says the engine agrees with the reference on every one.
5. **On the page:** open a cap table with many SAFEs and option grants. The curves and breakpoints come up in a few seconds where they took most of a minute.

## Assumptions added

**None.** No rule changed.
- **E15** gains a paragraph on how the search follows each gain, and **E18** a sentence pointing to it.
- **The speed entry under Later** gains 10j's before and after.

## Step 1, kept: where main's time went

**Most stops weren't breakpoints.**
- **Two amounts, 12 strikes:** 206 stops for 17 breakpoints. 150 were where the next option class's net reached zero in a set of choices one switch away, and 32 a tier there. Only 23 were the answer's own.
- **Each its own amount, 12 strikes:** 1,732 stops for 18 breakpoints.

**Turning off E16's check of classes beyond the next,** as an experiment only, took two amounts at 12 strikes from 11.5s to 5.0s.

The full counts are in this note's first version, at 55e9aed.

## Open questions

**None.** The reference's crash is its own step after 10j, as you said. Part 2 isn't needed: the target is met without it.
