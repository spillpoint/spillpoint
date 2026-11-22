# Review: 10k (the reference's gaps at jumps)

Branch `10k-reference-group-reasons-and-jumps`, from main at `e855aa2`. PR #144. Two commits: the fixes (39a65ec), then your answers (below).

**CI and permissions:** no change to `.github/workflows/` or `.claude/`. Your local `.claude/settings.json`, with `Edit(cases/**)` taken out to lift the lock, is left uncommitted.

**`cases/`:** one new case, `edge-28-group-converts-a-safe` (your answer 3), so the PR needs the cases label. No other case is touched. `python3 reference/generate.py --check` passes on all 86, with no other `expected.json` changed.

**The engine and the page:** no code change. The engine's tests list the new case, and its check script retries a table at a finer grid (below).

**What changed, first commit:**
- **`reference/spillpoint_ref/breakpoints.py`:** three fixes, one for each gap below.
- **`reference/spillpoint_ref/waterfall.py`:** one helper, `group_choice`, the decisions if the group converts or stays, which the third fix reads.
- **`reference/tests/test_jump_followers.py`:** six tests, on three small tables.
- **`reference/README.md`:** its paragraph on breakpoints covers the three fixes, and says what its grid can miss.
- **`docs/SPEC.md`:** one paragraph, on how a reason names a group (gap 1).

**Second commit, your answers:**
- **`reference/tools/random_many_safes.py`** and **`packages/engine/scripts/check-random.ts`:** the retry at $100,000 (answer 1).
- **`docs/ASSUMPTIONS.md`:** E13 names the third way (answer 2).
- **`cases/edge-28-group-converts-a-safe/`:** `inputs.json`, `expected.json` from the reference, and `DERIVATION.md` (answer 3).
- **`docs/SPEC.md`:** case 28 in the edge cases.
- **`packages/engine/test/support/cases.ts`** and **`packages/engine/test/input.test.ts`:** case 28 among the exit cases the engine runs.
- **`reference/README.md`:** a line for `random_many_safes.py`. **`CLAUDE.md`:** case 28 on main's unreleased line.

## The result

- **All 240 small random tables agree with the engine in full,** compared as 05c4's check compares them. In 10j it was 235.
  - **239 at the tool's $500,000 grid.**
  - **many-11-0125 only at a $100,000 grid,** and `check-random` now says so. At $500,000 the reference's grid misses a stretch $83,403 wide (gap 3).
- **The three group tables and the two jump tables** are among them, each compared in full.

## Your answers, as applied

1. **The grid: the method stays.** Where a table's breakpoints disagree with the engine's at a grid coarser than $100,000, it's worked again at $100,000 and compared in full there:
   - **`check-random`** writes `retry.json` in the table's folder, asking for $100,000. Only breakpoints trigger it: a breakpoint count, an exit value more than a cent off, a jump flag or a reason. A payout that disagrees with the breakpoints agreeing is reported as before.
   - **`random_many_safes.py probe`** works each table that asks into its own `fine/` folder, as `work` works a table: `fine/inputs.json` at $100,000, then `fine/expected.json`, or `fine/refused.txt` if the reference stops.
   - **`check-random`, run again,** compares the table in full against `fine/expected.json` instead, and reports it as agreeing only at the finer grid: "1 of those compared in full agree only at the $100,000 grid, where the reference worked them again: many-11-0125: at its own $500,000 grid, 8 breakpoints, the reference 6; at the $100,000 grid, it agrees in full".
   - **If it still disagrees there,** each difference is a problem, marked "(at the $100,000 grid)", and the check fails. I checked that on a copy of 0125 given its $500,000 answer as its fine one.
   - **The commands are the same as 10j's:** `work`, `check-random`, `probe`, `check-random`.
2. **E13 names the third way:** one of the two outcomes the group votes on jumps across the other by itself, with no voter indifferent. The example is the round-number table from `test_jump_followers.py`: the group converts above $26,722,222.22, stops just above $27M where SAFE A starts converting under its conversion, and converts again at $27,272,727.27. No behavior changes.
3. **Case 28, `edge-28-group-converts-a-safe`:** your $75,000 SAFE table, as you checked it, over $0 to $20M, at $3,000,000, $5,075,000, $10,579,345.08, $10,579,345.09 and $15,000,000.
   - **Its breakpoints:** $4,000,000, Series 0's preference; $5,075,000, Series 1's and the SAFE's Cash-Out Amount; and the jump at 4,200,000,000/397. The jump's reasons are `series_converts` (both series), `safe_switches` (the SAFE) and `payouts_jump`.
   - **At $10,579,345.08,** just below the jump: Founder A $4,586,954.23, Founder B $917,390.85, Series 0 $4,000,000, Series 1 $1,000,000, the SAFE $75,000.
   - **At $10,579,345.09,** just above: $5,000,000, $1,000,000, $4,000,000, $500,000 and $79,345.09.
   - **At $15,000,000:** the common price is $1.417857, and the SAFE has 0.75%, $112,500. Investor 1's $708,928.57 is below its preference, but Investor 0 carries the vote.
   - **`DERIVATION.md`** has your working: the SAFE's 0.75% of 10,500,000 plus its own shares, Investor 0 indifferent at a $1.00 price, the two breakpoints below the jump, and a table of the jump.
   - **The engine** passes it as a locked case: its breakpoints, reasons and every payout.

## The gaps

### 1. The crash: a SAFE following a group

**The cause.** Where a group's conversion moves a SAFE into its Conversion Amount, the SAFE's reason names what it follows (E20). `reasons` looked each one up among the securities, then the notes. A group's player is its series joined with "+", which is neither. So `next()` found nothing, and Python turned that into `RuntimeError: generator raised StopIteration`.

**What SPEC said:** nothing on how a group is named in a reason.

**What the engine does:**
- **The group's own reason:** `series_converts`, its subject every series in the group, its text naming them listed: "Series 0 Preferred and Series 1 Preferred convert together if…".
- **A SAFE following it:** `safe_switches`, its subject that SAFE alone, its text "following Series 0 Preferred and Series 1 Preferred".

The locked cases' group reasons (6b, 6c, 6d, 11b) already have the group's series as their subject. No locked case has a SAFE following a group.

**The fix.** SPEC's Breakpoints section gains a paragraph:

> A group of series that must convert together is named in a reason by its series, listed ("Series A and Series B"), and a reason about its conversion concerns every series in it. Where SAFEs switch because the group converted, each SAFE's reason concerns that SAFE alone and names the group's series as what it follows.

The reference now names a group that way (`_followed_names`): each of its series by name. It also says "counts them", not "counts it", for a group's two series.

**Your table** (common 5,000,000 and 1,000,000; Series 0, 4,000,000 at $1.00, senior; Series 1, 500,000 at $2.00; the two a group; a $75,000 SAFE at a $10M cap):
- **The jump is 4,200,000,000/397, $10,579,345.09,** as the engine has it.
  - **The SAFE's count:** once the group converts, everyone is common, so the SAFE's 0.75% is of 10,500,000 + n shares. That makes n = 79,345.09.
  - **Investor 0's vote:** it compares $4M with 4,000,000 × x × 0.9925 ÷ 10,500,000, equal at 10,500,000 ÷ 0.9925.
- **Reasons:** `series_converts` (series_0, series_1), `safe_switches` (safe_1) and `payouts_jump`, as the engine gives them.
- **A cent below:** Series 0 gets $4,000,000, Series 1 $1,000,000 and the SAFE $75,000. Founder A gets $4,586,954.23 and Founder B $917,390.85.
- **A cent above:** $4,000,000, $500,000, $79,345.09, $5,000,000 and $1,000,000, at a hair over $1.00 a share.
- **At exactly the jump:** the outcome from below holds (E13).

### 2. The two tables where the reference couldn't place a jump

**The tables:** many-11-0002 at $39,970,850.26, and many-11-0011 at $12,461,427.57. In both, SAFEs convert at the jump, and that drops common below an option strike:
- **0002:** SAFEs 1 and 3 convert together, and the options at $2.50 leave the money.
- **0011:** SAFE 1 converts, and the options at $1.25 leave the money.

**The cause is in the reference.** E16 says an option class isn't a decision-maker: it settles on the common price under each choice of the others.
- **What it did:** `_indifference` took every changed player that wasn't a SAFE for the one leading the jump, the option class included. It then looked for where flipping the class alone pays the class the same on both sides. That isn't where anything changes, so it found no point, and stopped with "cannot place the jump near …: []".
- **The fix:** an option class is never the one deciding a jump. The SAFEs decide, with the class re-settled under each of their choices, as everywhere else. Where only option classes change, the search does what it did before.

**Both tables agree in full now:** 11 and 9 breakpoints, the same as the engine's to the cent, with the same reasons and jump flags, and every payout point. The engine needed nothing.

**The unit test's table** is made by hand, since every cut-down version of the two needed three option classes:
- **The table:** common 4,000,000 and 2,000,000, 100,000 options at $1.39, SAFE 0 ($1.2M at $8M) and SAFE 1 ($2M at $12M).
- **The jump** is 723,800,000/61, $11,865,573.77.
  - **SAFE 1's side:** converting, it gets 610/3,619 of x, with the options out of the money. That equals its $2M there. It's the same exit value as at a $1.40 strike, where the options don't change at the jump, which is what E16 implies.
  - **Common's price:** $1.3941 just below and $1.3443 just above.
- **On main's reference,** the test stops with "cannot place the jump near 11865573.77: []".

### 3. Found comparing the group tables in full: many-11-0125

**What the engine finds:** the group converts at $23,787,077.06, with SAFEs 3 and 4 following, then stops converting at $23,870,480.48, and converts again at $23,934,269.93. The reference found only the last.

**The reference's own answers agree with the engine's:** it says the group converts at $23,787,077.07, $23,830,000 and $23,870,480.47, and stays at $23,870,480.49.

**Why the vote fails inside the stretch** (E17: the group votes on its two settled outcomes):
- **The trigger:** under the group's conversion, SAFEs 0 and 2 ($1.11M each at a $20M cap) start converting at $23,870,480.48.
- **The effect:** that drops Series 0's converting outcome from $6,028,518.74 to $5,980,780.78, below its $6M preference.
- **How long it lasts:** the vote fails until $23,934,269.93, where converting with all four SAFEs reaches $6M again.

**Two things in the reference kept it from this:**

1. **Its grid never lands in the stretch.**
   - **What the grid read:** at $500,000 it read "stays" at $23.5M, $23.75M and $23.875M. It bisects only between readings that differ.
   - **Why the check misses it:** the check after reads five points between consecutive breakpoints, and none fell in $83,403 of $4.98M.
   - **Payouts can't show it either.** Readings with the same answer always lie on one line, whatever lies between them, so only a reading inside the stretch would.
   - **What I did:** this is a limit of any grid, so I didn't change the method (open question 1). At a $100,000 grid a reading lands inside it.
2. **At that finer grid, it couldn't place the jump at the top of the stretch,** $23,870,480.48.
   - **The cause is in the reference.** There, neither voter is indifferent: their two outcomes never cross. The converting outcome itself jumps across the staying one. `_indifference` looked only for crossings, found none, and stopped.
   - **The fix** (`_inside_group_choice`): where no voter is indifferent in the bracket, it looks inside the group's two settled outcomes for one that changes across the bracket. It places the jump where what changed there is indifferent, with the group's choice held. Here that's SAFEs 0 and 2 converting together (E20), placed as any SAFEs' jump is.
   - **What it can't change:** it's tried only where the search used to stop, so no answer that worked before changes.
   - **Where it lands:** at $100,000, the reference finds all 8 of the engine's breakpoints, and 0125 agrees in full.

**The unit test's table** is made by hand, with round numbers:
- **The table:** common 10,000,000; two $5M series at $1.00 in one tier and one group; SAFE A ($4.5M at a $27M cap) and SAFE B ($1M at $10M).
- **Where the group converts:** at 240,500,000/9, $26,722,222.22, where 0.45 × (x − $4.5M) reaches its $10M.
- **Where it stops:** at exactly $27M, where SAFE A starts converting under its conversion. That drops the series from $10,125,000 to $9,900,000.
- **Where it converts again:** at 300,000,000/11, $27,272,727.27, with SAFE A following.
- **The engine** gives the same five breakpoints.
- **On main's reference,** it stops with "cannot place the jump near 27000000.00: []".

## The checks

**Reference tests:** 79 pass: 73 as before and the 6 new ones. On main's reference, 4 of the new ones fail: one on each gap, and one on the new helper. `pnpm test:reference` passes on the second commit, the fund's included: every one of the 86 cases is "ok", edge-28 among them.

**The engine, the page and the fund,** on the second commit, on this laptop: `pnpm typecheck` is clean, and `pnpm test` passes. That's 3,545 for the engine, among them the 18 that read case 28 by name; 699 for the page; and 2,115 and 838 for the fund, with 13 skipped as on main.

**The five tables in full:** worked fresh, with the reference's search, then `pnpm check-random`. 0002, 0011, 0006 and 0142 agree in full at $500,000. 0125 agrees in full at $100,000, as above.

**The 240 small tables**, regenerated from seed 11 into a fresh folder, every `inputs.json` the same as 10j's:
- **The reference worked all 240 as cases,** none refused, in 22m53s on 8 cores. Its answers hold 1,462 breakpoints (335 of them jumps) and 2,902 payout points; 19 tables have a group.
- **`pnpm check-random`:** 240 compared in full; 239 agree, and many-11-0125 differs only by its missed stretch. Its other breakpoints are the engine's, and the engine has its two extra ones. At $100,000 it agrees in full.
- **With the retry** (second commit): the first run compares 239 and asks for 0125 again; `probe` works it at $100,000 in 86s; the second run says 240 compared in full, 0125 agreeing only at the $100,000 grid.
- **When the fixes ran:** fixes 1 and 2 were in from the start. Fix 3 went in while the run was going, but it only runs where the reference used to stop, and no table stopped.

## How to check it by behavior

1. **The new tests,** each with its table worked by hand in the docstring:
   ```bash
   python3 -m unittest reference/tests/test_jump_followers.py -v
   ```
2. **Every case:**
   ```bash
   pnpm test:reference
   ```
3. **The 240 tables against the reference,** written to `local/`. The `work` step takes about 23 minutes on 8 cores:
   ```bash
   python3 reference/tools/random_many_safes.py tables 240 11 local/random-many-safes-ref-10k --most-safes 6 --most-strikes 4 --groups
   ```
   ```bash
   python3 reference/tools/random_many_safes.py work local/random-many-safes-ref-10k
   ```
   ```bash
   pnpm check-random local/random-many-safes-ref-10k
   ```
   It says 239 tables compared in full and 1 waiting, and writes many-11-0125's `retry.json`.
   ```bash
   python3 reference/tools/random_many_safes.py probe local/random-many-safes-ref-10k
   ```
   About 90 seconds, for 0125 at $100,000.
   ```bash
   pnpm check-random local/random-many-safes-ref-10k
   ```
   It says 240 tables compared in full, many-11-0125 agreeing only at the $100,000 grid, and "The engine agrees with the reference on every one."
4. **Case 28:** read `cases/edge-28-group-converts-a-safe/DERIVATION.md` against `expected.json`. Then:
   ```bash
   pnpm breakpoints edge-28-group-converts-a-safe
   ```
   It prints the engine's three breakpoints with their reasons, and "All match expected.json (to the cent, with the same jumps)." The jump's reasons follow the SPEC paragraph: "following Series 0 Preferred and Series 1 Preferred".

## Assumptions added

**E13 gains a third way** a group's jump is located (your answer 2): where the outcome the group votes on jumps by itself. It writes down what the engine already does, with no behavior change. The three fixes follow E16, E17 and E20 as they stand. SPEC gains the paragraph on naming a group (gap 1) and case 28.

## Open questions

None. Your answers settled the two from the first commit: the grid's method stays, with the retry at $100,000, and E13 names the third way.
