# Review: 10j, step 1 (where the breakpoint search's time goes)

Branch `10j-faster-breakpoint-search`, from main at `b22caf7` (#142 merged).

**Stopped after step 1,** as the task says to when the target needs a rewrite of the search rather than a fix to its costly part. Nothing in the engine has changed. This note is step 1's numbers and my plan, for your answers. The after numbers, the identity checks and the random tables come with the rest of the step, and this note grows to cover them.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`. **`cases/`:** untouched.

## What's on the branch

One commit, measuring only:
- **`packages/engine/test/support/many-safes.ts`:** the made-up table, built in code (below). Not a case: nothing in it is anyone's cap table.
- **`packages/engine/test/many-safes.test.ts`:** the timing test. It runs 26 SAFEs at 1, 3, 5, 8 and 12 strikes, and 10 SAFEs at 3. Each prints a line on every run, as Larkspur's 10-SAFE test does: "26 SAFEs at two caps, 12 option strikes: …s for 17 breakpoints". Each also checks the count of breakpoints and that each has one answer. For now each has two minutes, since on main 12 strikes takes about 12 seconds here and more on CI.
- **`pnpm many-safes-timing`:** the same rows from the command line. `--safes 10` changes the count of SAFEs, and `--each-its-own` gives every SAFE its own amount (below).

## The table

- **Common:** 8,000,000 shares, held by two founders.
- **Seed:** 2,000,000 at $0.50. **Series A:** 2,500,000 at $2.00, senior. Both 1x non-participating.
- **Options:** 100,000 shares in each class, at 1 to 12 strikes from $0.25 to $6.00. A pool of 500,000 unissued.
- **SAFEs:** 26 post-money SAFEs, alternating $250,000 at a $20M cap and $100,000 at a $12M cap.
- **The range:** $0 to $200M.

**Against 08a's table** in `notes/plan-0.8.0.md`:
- It has the same breakpoints at 3, 5, 8 and 12 strikes (8, 10, 13 and 17), and 7 at 1 strike, where 08a's had 6.
- It runs about 3 times faster than 08a's times, on the same model of laptop (M1 Pro, Node 24.21).
- 08a's script wasn't kept, and its run was under load, so I can't say which explains it. Three other pairs of amounts and caps gave times within 15% of mine.

**A second shape: every SAFE its own amount.**
- SAFE i is $150,000 + $10,000 × i at the $20M cap, or $50,000 + $5,000 × i at the $12M cap.
- A real table looks like this: SAFEs rarely share an amount.
- It's 4 to 6 times slower (below), so it's what I've sized the plan for.

## Before: main, on this laptop

| Table | Strikes | Breakpoints | Seconds |
|---|---:|---:|---:|
| 26 SAFEs, two amounts | 1 | 7 | 1.59 |
| | 3 | 8 | 2.79 |
| | 5 | 10 | 4.82 |
| | 8 | 13 | 7.50 |
| | 12 | 17 | 11.54 |
| 10 SAFEs, two amounts | 3 | 8 | 0.80 |
| Larkspur with its note, 10 SAFEs | | 10 | 2.4 |
| 26 SAFEs, each its own amount | 1 | 7 | 6.68 |
| | 3 | 8 | 16.41 |
| | 5 | 10 | 26.10 |
| | 8 | 13 | 36.67 |
| | 12 | 18 | 48.64 |

**What the target means here:**
- On main's last CI run, Larkspur's test printed 5.93s on Node 24 and 4.86s on Node 22, against 2.4s here. So CI is 2 to 2.5 times slower than this laptop.
- Under 5 seconds on CI at 12 strikes is about 2 seconds here.
- That's 6 times faster on the two-amount table, and about 25 times with each its own amount.

## Where the time goes

**How the search works now** (05c4):
- It walks up the range a stretch at a time. At the start of each stretch it reads the answer twice just above, for slopes, and once in the middle, as a check.
- Each reading works out every margin. That's the answer's, and those of every set of choices one switch away: each series' switch, each SAFE's switch, and each SAFE's switch on the SAFEs' way down from "every SAFE converts" and under each series' switch. For each, its tiers, its caps and its next option class's net.
- It stops wherever the first margin reaches zero.

**Counted, on a copy of main with counters** (5 to 15% slower than the times above):

| Table | Strikes | Breakpoints | Stops | Readings | Readings per breakpoint | Per reading | Payout sets | Of them, E16's check | Waterfall runs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 26 SAFEs, two amounts | 1 | 7 | 66 | 198 | 28 | 7ms | 540 | 0 | 3,740 |
| | 3 | 8 | 102 | 306 | 38 | 10ms | 1,664 | 864 | 8,999 |
| | 5 | 10 | 143 | 429 | 43 | 12ms | 3,916 | 2,542 | 16,931 |
| | 8 | 13 | 172 | 516 | 40 | 16ms | 8,655 | 6,839 | 29,940 |
| | 12 | 17 | 206 | 618 | 36 | 22ms | 16,387 | 14,152 | 49,603 |
| 10 SAFEs, two amounts | 3 | 8 | 100 | 300 | 38 | 3ms | 676 | 352 | 3,939 |
| Larkspur with its note, 10 SAFEs | | 10 | 75 | 225 | 23 | 11ms | 2,458 | 1,402 | 16,583 |
| 26 SAFEs, each its own amount | 1 | 7 | 452 | 1,356 | 194 | 5ms | 540 | 0 | 5,037 |
| | 3 | 8 | 802 | 2,406 | 301 | 6ms | 1,714 | 864 | 12,032 |
| | 12 | 18 | 1,732 | 5,196 | 289 | 10ms | 16,366 | 13,990 | 53,284 |

A reading is one answer worked out with its margins. A payout set is one set of decisions whose payouts the search works out as straight lines; each needs two or three exact waterfall runs.

**Two findings.**

**1. Most stops aren't breakpoints.** At 12 strikes there are 206 stops for 17 breakpoints. With each its own amount there are 1,732 for 18. What places each stop, at 12 strikes on the two-amount table:
- **150:** the next option class's net, in a set of choices one switch away.
- **32:** a tier, or the payout with the next class, in such a set.
- **23:** the answer's own payouts changing shape, or a gain from switching reaching zero.

Each set one switch away is priced a little differently, so each option class comes into the money at its own exit value there. Nothing paid changes at those stops. The search stops only so that the gains it follows stay straight lines.

Equal SAFEs come into the money together, so two amounts give 2 such sets per switch. With each its own amount there are 26, and the stops multiply. At 3 strikes there are 802 stops, where two amounts have 102, and 786 of them are inside a set one switch away.

**2. At many strikes, E16's check makes most of the waterfall runs.** Once option exercise settles under a set of choices, E16 checks that no class beyond the next would gain by exercising. That's one payout per class beyond. The check runs under every set of choices, at every count of classes exercised. At 12 strikes it's 14,152 of the 16,387 payout sets, and 39% of the time.

**The parts you named,** each with everything it calls, so they overlap and a column adds up to more than 100%:

| Part | 12 strikes, two amounts | 3 strikes, each its own | 12 strikes, each its own |
|---|---:|---:|---:|
| Options re-settling under each choice | 77% | 35% | 50% |
| of it, E16's check of classes beyond the next | 39% | 2% | 11% |
| The SAFEs settling, with their options | 65% | 14% | 23% |
| Every reading's margins: each switch weighed | 30% | 73% | 67% |
| The series' every combination, with the SAFEs and options under each | 47% | 11% | 18% |
| The check for a second answer | 19% | 4% | 5% |
| The answer at each breakpoint | 8% | 2% | 3% |
| Exact waterfall runs, wherever made | 47% | 8% | 15% |

## Why it needs a rewrite

- **A leaner reading can't change how many there are:** 3 per stop, at 206 or 1,732 stops. Cutting the bookkeeping and the cost of each waterfall run might make the search about twice as fast. To keep every digit identical (below), each reading would also have to stay where it is.
- **Turning E16's check off entirely,** as an experiment only, isn't enough on its own:
  - 12 strikes, two amounts: 11.5s → 5.0s.
  - 3 strikes, each its own amount: 16.4s → 14.5s.
- **So the stops have to go:** the search has to follow each gain on its own lines. That's a rewrite of the search's core, in `breakpoints.ts` and the margins in `decisions.ts`.

## The plan

**Part 1, the rewrite: stop only where the answer can change.**
- **The lines are already there.** Each set of choices one switch away has its payouts as straight lines, with the interval where they hold (`lines.ts`). Its option exercise and its SAFEs' answer are kept with where they hold too (05c4). A gain from switching is the difference of two such lines, so it's straight until either side's interval ends.
- **Where the search stops:** it would keep each gain as a line, with that interval. It stops only where the answer's own payouts change shape or a gain reaches zero: the 23 stops of 206 above, and about 16 of 802 with each its own amount at 3 strikes.
- **Where a side's interval ends first,** only that set of choices is read again: its options and SAFEs re-settled, a waterfall run or two. Every other margin is left alone.
- **What stays:** the two readings just above a stop, the check in each stretch's middle, the second-answer watch, curves, jumps and reasons.
- **No rule changes.** E15's account of how the search reuses work gets a paragraph.

**Part 2, needing your OK: E16's check of classes beyond the next, only where an answer is reported.**
- **The answer at each exit value still gets the check,** as now, at every reading and in `solve`.
- **A set of choices one switch away** would be valued with options as E16's sequence settles them, without the check.
- **What that changes:** today, if classes beyond the next would gain in such a set, the search stops with "option exercise doesn't settle". With this, it stops only if that happens in the answer itself. No table that main answers gets a different answer: the check only ever stops the search.
- **Without Part 2,** I expect 12 strikes on the two-amount table to stay over the target. Its 14,152 payout sets for the check need their waterfall runs whatever the search does.

**What I expect, until it's built:**
- **With both parts:** about 1.5 to 3 seconds here at 12 strikes on the two-amount table, so around 5 seconds on CI. With each its own amount, about 3 to 5 seconds here.
- **Larkspur and its note at 10 SAFEs:** no slower. It has 75 stops for 10 breakpoints today.

## What "byte-identical" can mean after the rewrite

**Each breakpoint's exit value is worked out from two readings just above the stop before it.** So its last digits depend on where the stops fell. Of its 40 digits, about the first 27 are certain.

**The experiment:** main with one change, reading 1.5e-4 above each stop rather than 1e-4.
- **The dump:** every exit case at full precision. That's 50 cases and 4,715 lines: every breakpoint, reason, decision and line, at each breakpoint and listed exit value.
- **What differs:** 447 lines, all of them breakpoint exit values and payouts at breakpoints. The largest difference is $5.5 × 10⁻¹⁹, relative 6 × 10⁻²⁷.
- **What doesn't:** no reason, decision, jump or cent.

**Part 1 moves the stops, so it will change those digits too.** Keeping all 40 digits rules out any change to where the search reads, which leaves about twice as fast at best.

**What I'd check instead,** on the locked cases and the random tables:
- every reason, decision and jump byte-identical;
- every exit value and amount identical to the cent;
- and within $10⁻¹⁵ of main's at full precision.

## Questions for you

1. **Part 1, the rewrite of how the search follows its margins:** go ahead?
2. **Part 2, E16's check only where an answer is reported:** OK? It's a change to how E16's check runs, so it's yours. Without it I expect 12 strikes to stay over 5 seconds on CI.
3. **The identity bar:** byte-identical reasons, decisions and jumps, every number identical to the cent and within $10⁻¹⁵ of main's? All 40 digits can't hold through any change to where the search reads.
4. **The table the target is for:** the two-amount table is the plan's shape and the timing test's. Should the target hold with each its own amount too? If so, I'd add it to the timing test after the rewrite; on main it takes 49 seconds at 12 strikes.

## Checks so far

- **Typecheck:** clean.
- **The new test file:** 6 tests pass.
- **The engine's suite:** 3,507 tests pass. Nothing in the engine has changed.

## Next

Your answers to the four questions. Then step 2, the speed; step 3, the random tables; and the docs. I'm stopping here.
