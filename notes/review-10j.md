# Review: 10j (a faster breakpoint search)

Branch `10j-faster-breakpoint-search`, from main at `b22caf7` (#142 merged). Draft PR #143: you take it out of draft after the parent session's check.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

**`cases/`:** untouched.

**Outside the engine, its tests and the docs:**
- **`apps/dashboard/test/saved-0.6.0.test.tsx`:** one test, as you allowed (below). No page code, and no fixture.
- **`reference/tools/random_many_safes.py`:** a new dev tool beside 05c4's `random_safes.py`, writing the random tables. The reference's calculator is untouched.
- **The root `package.json`:** a script, `pnpm compare-engines`.

## The result

**The target is met.** 26 post-money SAFEs, each with its own amount, beside 5 option strikes take 3.39s on CI's Node 24 job and 4.27s on Node 22 (8c7983e). Main took 26.1s on this laptop, and about 1.65 times that on your 2-core sandbox.

**Your memory check is met** (e080ad5 and 8c7983e):
- **Jordan's table at three caps** runs in a heap of at most 2,096 MB, as the timing test now checks: 25.7s on CI's Node 24, and 34.9s on Node 22, whose heap there is 1,952 MB. Its most heap live at once is 798 MB, where main's is 1,749 MB. c86969e runs out of memory in the same test.
- **No table holds more than main:** never more payout lines than main keeps, by construction. On every timing row the most heap live at once is lower than main's; on all 1,308 random tables, so is the peak heap. The one exception is a few hundred KB on the smallest tables, in open questions.
- **The timing test and `pnpm many-safes-timing`** print each row's peak heap beside its time.

**On this laptop** (M1 Pro, Node 24.21), every breakpoint and the answer at each, as the page works them out. 10j is 8c7983e:

| Table | Strikes | Breakpoints | Main | 10j |
|---|---:|---:|---:|---:|
| 26 SAFEs, each its own amount | 1 | 7 | 6.68s | 0.84s |
| | 3 | 8 | 16.41s | 1.72s |
| | **5** | **10** | **26.10s** | **3.13s** |
| | 8 | 13 | 36.67s | 5.43s |
| | 12 | 18 | 48.64s | 9.04s |
| 26 SAFEs, two amounts (the plan's table) | 1 | 7 | 1.59s | 0.83s |
| | 3 | 8 | 2.79s | 1.54s |
| | 5 | 10 | 4.82s | 2.78s |
| | 8 | 13 | 7.50s | 4.81s |
| | 12 | 17 | 11.54s | 8.08s |
| 10 SAFEs, two amounts | 3 | 8 | 0.80s | 0.39s |
| Jordan's table at three caps, 12 strikes | | 23 | about 3 minutes, in 2,096 MB | 26.4s, in 2,096 MB |

**On CI,** as the timing tests print them. Main is step 1's run (55e9aed), c86969e the rewrite before your memory check, and 10j is 8c7983e. Each pair is Node 24, then Node 22.

| Table | Strikes | Main | c86969e | 10j |
|---|---:|---:|---:|---:|
| 26 SAFEs, each its own amount | 1 | | 0.88s, 1.04s | 0.92s, 1.22s |
| | 3 | | 1.99s, 2.03s | 1.88s, 2.47s |
| | **5** | | **3.39s, 4.00s** | **3.39s, 4.27s** |
| | 8 | | 5.82s, 6.77s | 5.54s, 7.21s |
| | 12 | | 10.40s, 10.71s | 8.99s, 12.07s |
| 26 SAFEs, two amounts | 1 | 2.21s, 1.84s | 1.21s, 1.49s | 1.35s, 2.07s |
| | 3 | 4.05s, 3.55s | 1.87s, 1.91s | 1.84s, 2.36s |
| | 5 | 7.06s, 6.40s | 3.33s, 3.41s | 3.20s, 3.99s |
| | 8 | 10.58s, 9.85s | 5.88s, 6.29s | 5.22s, 7.07s |
| | 12 | 15.90s, 14.71s | 10.12s, 11.39s | 8.64s, 11.39s |
| 10 SAFEs, two amounts | 3 | 1.12s, 1.03s | 0.49s, 0.51s | 0.46s, 0.68s |
| Larkspur with its note, 10 SAFEs | | 6.75s, 5.47s | 4.22s, 5.18s | 2.60s, 5.07s |
| Jordan's table at three caps | | | | 25.73s, 34.85s |

Main's timing test had no rows with each SAFE its own amount, or Jordan's table, so CI has no before for them.

**Your 2-core sandbox, main** (your numbers, Node 22): two amounts, 5.21s at 3 strikes and 18.33s at 12; each its own amount, 27.06s at 3 and 83.23s at 12.

## Your answers, as applied

1. **Part 1, the rewrite:** done. Where payouts curve (X17), a stretch is read as before, every margin a stop. Everything in "What stays" stays: the two readings just above a stop, the check in each stretch's middle, the second-answer watch, curves, jumps and reasons.
2. **Part 2:** not done. E16's check of classes beyond the next runs as on main, under every set of choices. Nothing else in E16 changed either.
3. **The identity bar:** checked on every locked case and on the random tables (below).
4. **Each its own amount is the target table:** it's in the timing test beside the two-amount rows, at 1, 3, 5, 8 and 12 strikes.
5. **The page test, the reference's crash, pnpm not npx, the release note's 27th digit:** as you said (below).
6. **Memory:** what held it, and how it's bounded, are item 3 under What changed. Jordan's table is beside the made-up one in the timing test, and before-and-after memory is in the table under Memory.

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

**3. It lets go what it has passed, and never keeps more lines than main** (`lines.ts`, `decisions.ts`, `breakpoints.ts`; your memory check of c86969e).
- **What held the memory:** kept payout lines. A set of decisions' lines hold two of the waterfall's runs, about 43 KB at 26 SAFEs and 12 strikes. Main keeps one line for every set it reads, for as long as the table; c86969e kept up to four. Both read about the same sets: 4,098 at 5 strikes, each its own amount, and 16,366 and 16,352 at 12. After the search at 12 strikes, c86969e's 20,381 lines were 869 of the 891 MB it still held; its kept option exercises and SAFE answers were 11 MB.
- **Letting go:** each stretch of the search is a step, from the readings just above the stop it starts at, and so is each exit value `solve` is asked for. A set of decisions read on neither of the last two steps is let go: its lines and its kept results. At each stop, every line that ends there or below goes too, since the search reads above it from then on.
- **Never more than main:** never more lines in all than there are sets of decisions that have had them, main's count, one each. Where a set's second structure would make more, its new lines take the place of its last. That guarantee is on lines, nearly all the memory. Kept results are let go by the step, four at most a set, and aren't counted: capping them too cost 0.25s at 5 strikes and changed no table's memory.
- **The answer at each breakpoint** is worked out as the search passes it, while the lines it's weighed on are kept. Its decisions are kept for `solve` there after, which then runs the waterfall once, for the payout. Without it, the answers at the breakpoints after the search cost 0.8s more at 5 strikes, 3.5s against 2.7s on the laptop. The page's pass after the search, a solve at each stop and just above each jump, took 1.05s against main's 0.86s; with it, 0.34s.
- **What it costs:** the cap on lines, about 0.5s at 5 strikes on the laptop, and on CI 0.27s on Node 22 (4.27s against c86969e's 4.00s) and none on Node 24 (3.39s both). Early in the search, while few sets have had lines, a stretch where many sets change structure partway needs two lines for most of them, one read ahead and one behind. Under the cap, those are worked out again. Without the cap, two of the small rows held more than main: 26 SAFEs at 1 strike, 30 MB against 23, and at 3 strikes, 74 MB against 68.
- **Tried, and not kept:**
  - letting go after one step, not two: slower, 3.3s against 2.7s at 5 strikes, and no lower a peak;
  - keeping lines that hold at a breakpoint found, for the answers after: at 12 strikes it kept 797 MB, more than main's 728;
  - at the cap, the least recently read set giving up its line instead, or the set keeping its old line: 4.1s and 14s at 5 strikes;
  - two lines a set at most and no cap: as fast, and no less memory on the small rows.
- **The timing test** prints each row's peak heap: the heap is collected before the row, and the peak is the most in use before any collection while it runs, less what was in use before. It counts garbage not yet collected, so it varies from run to run and with the heap's limit: a figure, not a check. Jordan's table runs in a worker given an old space of 1,904 MB, which comes to 2,096 MB in all on a Mac and 1,952 MB on CI's Linux, and the test checks it's no more than 2,096.

**Counted** on copies with counters, before item 3. Main's are step 1's counts, and 5 strikes wasn't counted there:

| Table | Strikes | Breakpoints | Stops, main | Stops, 10j | Sets read again by themselves, 10j | Exact waterfall runs, main | 10j |
|---|---:|---:|---:|---:|---:|---:|---:|
| Each its own amount | 3 | 8 | 802 | 12 | 837 | 12,032 | 6,080 |
| | 5 | 10 | | 14 | 1,151 | | 12,122 |
| | 12 | 18 | 1,732 | 22 | 1,757 | 53,284 | 40,892 |
| Two amounts | 12 | 17 | 206 | 21 | 1,758 | 49,603 | 41,195 |

A stop is three readings of every margin, a few hundred at 26 SAFEs. A set read again by itself is two readings of one set of choices.

**What's left** at 5 strikes, each its own amount, as shares of a profile of the run before item 3 (loading the engine is most of the rest):
- **The follower's readings:** 38%.
- **The second-answer watch:** 19%.
- **The stops' readings and middle checks:** 24%. Just above a stop the answer is new, so its first reading settles the SAFEs on sets of choices not read before: 232 exact waterfall runs each.
- **The answer at each breakpoint:** 5%.
- **E16's check of classes beyond the next:** of the 12,122 exact runs, 5,092 are for it. Each time a set's next class comes into the money, every class beyond it is weighed on a set of choices not read before. It's the biggest part at 12 strikes, which is why they improved least. It isn't changed (your answer 2).

## Memory

**Each timing row and Jordan's table,** each run in a process of its own on this laptop, at Node's default heap here (4,288 MB). "Live" is the most heap in use at the start of any stretch, the heap collected first; for 10j that's just before it lets go, its most. "Held after" is what it still holds for the table once the answers at every breakpoint are worked out, collected. Peak RSS is the process's own:

| Table | Strikes | Live at most, main | 10j | Held after, main | 10j | Peak RSS, main | 10j |
|---|---:|---:|---:|---:|---:|---:|---:|
| 26 SAFEs, each its own amount | 1 | 24 MB | 21 MB | 23 MB | 2 MB | 431 MB | 349 MB |
|  | 3 | 70 MB | 55 MB | 69 MB | 2 MB | 642 MB | 503 MB |
|  | **5** | 173 MB | 102 MB | 170 MB | 3 MB | 1,099 MB | 581 MB |
|  | 8 | 376 MB | 169 MB | 373 MB | 4 MB | 1,665 MB | 935 MB |
|  | 12 | 723 MB | 263 MB | 719 MB | 6 MB | 2,241 MB | 994 MB |
| 26 SAFEs, two amounts | 1 | 23 MB | 21 MB | 23 MB | 2 MB | 423 MB | 346 MB |
|  | 3 | 68 MB | 55 MB | 67 MB | 2 MB | 547 MB | 502 MB |
|  | 5 | 166 MB | 95 MB | 162 MB | 2 MB | 804 MB | 572 MB |
|  | 8 | 369 MB | 160 MB | 367 MB | 4 MB | 1,158 MB | 926 MB |
|  | 12 | 723 MB | 245 MB | 720 MB | 6 MB | 1,558 MB | 1,016 MB |
| 10 SAFEs, two amounts | 3 | 18 MB | 13 MB | 18 MB | 2 MB | 391 MB | 280 MB |
| Jordan's table at three caps | 12 | 1,749 MB | 798 MB | 1,744 MB | 13 MB | 2,977 MB | 2,103 MB |

**Jordan's table in smaller heaps,** old space as `--max-old-space-size` sets it:
- **2,096 MB in all (1,904 old space):** main finishes in 193s on this laptop, near the limit, with 3,997 collections and 1,794 MB of heap at the end. c86969e runs out of memory, here after 131s in the timing test's worker. 10j finishes in about 26s.
- **1,600 MB of old space:** main runs out of memory.
- **1,000 MB of old space,** 1,192 MB in all: 10j finishes in 26.6s, at a peak RSS of 1,186 MB.

**The random tables** (below) count each engine's memory on each table: the heap collected first, its peak, and what it holds after, collected again.
- **1,000 tables:** 10j's peak heap is never more than main's on any of them, and what it holds after never more. At most, 2,409 MB peak against main's 2,904, and 323 MB held after against 1,761.
- **68 with a group:** never more on either count. At most 970 MB against 2,423, and 148 MB against 804.
- **240 small ones:** peak never more. Held after: 1 MB against 0 on two tables, rounded to the MB. In KB, after a warm-up run so that compiled code isn't counted: many-11-0064 holds 611 KB after against main's 525, and many-11-0178 323 KB against 726 (open questions).

## The checks

**Every locked case.**
- **The dump:** every exit case's results at full precision, from main and from 10j. That's 50 cases and 4,715 lines: every breakpoint, jump, curve flag and reason, and the decisions and every line at each breakpoint and listed exit value.
- **What differs:** 413 lines. All are breakpoint exit values and the payouts at breakpoints. The largest difference is $5.2 × 10⁻¹⁹, relative 6.0 × 10⁻²⁷, so about the 27th significant digit.
- **What doesn't:** no text, reason, decision, jump, curve flag, breakpoint count or error, and no cent. No value sits on a half cent.

**The page's saved files** (your answer 1).
- **The change:** `saved-0.6.0.test.tsx`'s test is now "opens, and gives 0.6.0's breakpoints, their reasons and jumps exactly and their exit values to the cent and within $10⁻¹⁵, and its payouts to all 40 digits".
- **It passes on 8c7983e:** the breakpoints' exit values within your bar, and the payouts at the recorded exit values unchanged to all 40 digits. `results-0.6.0.json` and every fixture are as they were.

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
- **On a half cent:** 12 values come out a hair either side of a half cent from the two engines, at most $4.2 × 10⁻²⁰ apart. `toCents` shows the same cent from both for 11 of them. The twelfth is in table many-10-0781: breakpoint 13's exit value, about $69,987,703.125.
  - **10j:** 69987703.12500000000000000000618273875063, shown as $69,987,703.13.
  - **Main:** 69987703.12499999999999999996419930186248, shown as $69,987,703.12.
  - **The other eleven,** each shown the same by both: $300,671.88, $369,396.88 and $231,946.88 in many-10-0048; $322,359.38; $0.93; $2,192,578.13 and $730,859.38; $1,278,749.93; $7,651,041.13 twice in many-10-0781; and $1,315,999.97.
- **Times,** five tables at a time beside the other checks, so each is slower than alone: 6,044s in all for 10j, against 20,675s for main.

**68 random tables with a conversion group, against main.**
- **The tables:** every table of `random_many_safes.py tables 1000 12 --groups` with a group: two series that can convert, converting together.
- **The result: all 68 agree** under your bar. None stops, and no value sits on a half cent. 10j took 828s in all, and main 4,720s, two at a time under load.

**240 random tables, against the reference.**
- **The tables:** from `random_many_safes.py tables 240 11 --most-safes 6 --most-strikes 4 --groups`. They have the same shape as the 1,000, but only 2 to 6 SAFEs and 0 to 4 strikes, and 19 have a conversion group.
- **Where I stopped, and why:** the reference tries every combination of the SAFEs' and the options' decisions at each exit value it reads. At 6 SAFEs and 4 strikes that's 1,024 under each choice of the series, and a table takes it up to several minutes. All 240 took 49 minutes on this laptop's 8 cores.
- **The result: the engine agrees with the reference on all 240,** on 8c7983e.
  - **235 in full,** as 05c4's check compares them: every breakpoint within a cent, with the same reason codes, subjects and jump flags, and every decision and holder × security line to the cent at each breakpoint and listed exit value.
  - **5 by their listed exit values, and a cent either side of each of the engine's breakpoints:** the reference's own search couldn't finish them. In 2 it couldn't place a jump. The other 3 are its crash on a conversion group beside SAFEs (below).
- **And against main:** all 240 agree under your bar. Two values sit on a half cent, both in many-11-0238: SAFE 0's and SAFE 4's payouts at breakpoint 5, where the reference has a jump at exactly $13,890,000. They're $737,965.625 and $296,565.625, a hair above from 10j and a hair below from main, and `toCents` shows the same cent from both, $737,965.63 and $296,565.63.

**Tests,** on CI for 8c7983e:
- **The engine:** 3,513 pass: 3,507 as before, the timing test's 5 rows with each SAFE its own amount, and Jordan's table.
- **The page and the fund:** pass, 699 for the page, 2,115 and 838 for the fund (13 skipped, as on main).
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

1. **The speed and the memory:**
   ```bash
   pnpm many-safes-timing --each-its-own 1 3 5 8 12
   ```
   ```bash
   pnpm many-safes-timing 1 3 5 8 12
   ```
   ```bash
   pnpm many-safes-timing --three-caps
   ```
   Each row prints its time and peak heap; Jordan's table prints its heap's limit too. On CI, each test job's log has the lines "26 SAFEs at two caps, each its own amount, 5 option strikes: …s for 10 breakpoints, peak heap … MB" and "Jordan's table at three caps: …".
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
   The report goes to `local/random-many-safes/compare-engines.txt`, with both engines' time, peak heap and heap held after on each table, and its first lines say on how many tables 10j's peak was more than main's. It took about 75 minutes on this laptop, five tables at a time, most of it main's.
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
- **E15** gains a paragraph on how the search follows each gain, and what it lets go and keeps; **E18** a sentence pointing to it.
- **The speed entry under Later** gains 10j's before and after, and its memory.

## Step 1, kept: where main's time went

**Most stops weren't breakpoints.**
- **Two amounts, 12 strikes:** 206 stops for 17 breakpoints. 150 were where the next option class's net reached zero in a set of choices one switch away, and 32 a tier there. Only 23 were the answer's own.
- **Each its own amount, 12 strikes:** 1,732 stops for 18 breakpoints.

**Turning off E16's check of classes beyond the next,** as an experiment only, took two amounts at 12 strikes from 11.5s to 5.0s.

The full counts are in this note's first version, at 55e9aed.

## Open questions

1. **A few hundred KB on the smallest tables.** Kept lines never pass main's, but on a table with a handful of SAFEs and strikes the search's other working memory can. That's the follower's trees of choices for the stretch it's on, and up to four kept results a set where main keeps one. On two of the 240 small tables, measured after a warm-up run:
   - **many-11-0064:** 765 KB live at most, against main's 525, and 611 KB held after, against 525.
   - **many-11-0178:** 1,019 KB live at most, against 783, though it holds 323 KB after, against 726.

   Peak heap, which counts what the process holds, isn't above main's on any table. Is that within your bar, or should the follower's working memory count against main's too? Counting the kept results as well cost 0.25s at 5 strikes and didn't change these.
2. **The reference's crash** is its own step after 10j, as you said. Part 2 isn't needed: the target is met without it.
