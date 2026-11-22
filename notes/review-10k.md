# Review: 10k (the reference's gaps at jumps)

Branch `10k-reference-group-reasons-and-jumps`, from main at `e855aa2`.

**CI and permissions:** no change to `.github/workflows/` or `.claude/`.

**`cases/`:** untouched. `python3 reference/generate.py --check` passes on every case, 85 of them, with no `expected.json` touched.

**The engine and the page:** no change.

**What changed:**
- **`reference/spillpoint_ref/breakpoints.py`:** three fixes, one for each gap below.
- **`reference/spillpoint_ref/waterfall.py`:** one helper, `group_choice`, the decisions if the group converts or stays, which the third fix reads.
- **`reference/tests/test_jump_followers.py`:** six tests, on three small tables.
- **`reference/README.md`:** its paragraph on breakpoints covers the three fixes, and says what its grid can miss.
- **`docs/SPEC.md`:** one paragraph, on how a reason names a group (gap 1).

## The result

- **All 240 small random tables agree with the engine in full,** compared as 05c4's check compares them. In 10j it was 235.
  - **239 at the tool's $500,000 grid.**
  - **many-11-0125 at a $100,000 grid.** At $500,000 the reference's grid misses a stretch $83,403 wide (gap 3).
- **The three group tables and the two jump tables** are among them, each compared in full.

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

**Reference tests:** 79 pass: 73 as before and the 6 new ones. On main's reference, 4 of the new ones fail: one on each gap, and one on the new helper. `pnpm test:reference` passes, the fund's included.

**The five tables in full:** worked fresh, with the reference's search, then `pnpm check-random`. 0002, 0011, 0006 and 0142 agree in full at $500,000. 0125 agrees in full at $100,000, as above.

**The 240 small tables**, regenerated from seed 11 into a fresh folder, every `inputs.json` the same as 10j's:
- **The reference worked all 240 as cases,** none refused, in 22m53s on 8 cores. Its answers hold 1,462 breakpoints (335 of them jumps) and 2,902 payout points; 19 tables have a group.
- **`pnpm check-random`:** 240 compared in full; 239 agree, and many-11-0125 differs only by its missed stretch. Its other breakpoints are the engine's, and the engine has its two extra ones. At $100,000 it agrees in full.
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
   It lists many-11-0125's differences and nothing else.
4. **many-11-0125 at a $100,000 grid,** about 3 minutes:
   ```bash
   mkdir -p local/10k-fine/many-11-0125 && python3 -c "import json; d=json.load(open('local/random-many-safes-ref-10k/many-11-0125/inputs.json')); d['exit']['grid_step']='100000'; json.dump(d, open('local/10k-fine/many-11-0125/inputs.json','w'), indent=2)"
   ```
   ```bash
   python3 reference/tools/random_many_safes.py work local/10k-fine
   ```
   ```bash
   pnpm check-random local/10k-fine
   ```
   It says "1 tables compared in full" and "The engine agrees with the reference on every one."

## Assumptions added

**None.** The three fixes follow E16, E17 and E20 as they stand, and the engine already did each. SPEC gains the paragraph on naming a group (gap 1).

## Open questions

1. **The reference's grid.** A stretch narrower than the grid, with the same answer at the grid points either side, is invisible to it. Its check after can't see one either, since readings with the same answer lie on one line. The locked cases are safe from this in practice: the engine follows its margins exactly, so a stretch both missed would fail a case test. A new case is where it could hide. Two ways to close it, for a step of its own:
   - **`random_many_safes.py` writes a finer grid,** $100,000 or $50,000. That's simple, but slower: 0125 alone takes 91s at $100,000 against 32s at $500,000, so the 240 would take about an hour, not 23 minutes. And it only narrows what can be missed.
   - **The reference also bisects where the group's two settled outcomes change,** not only where the answer does. Those outcomes are what the vote is weighed on, and it works them out at every reading already. Bisecting there finds this stretch at any grid. It moves the reference a little toward the engine's method of following what decides the answer.

   Or leave it as the README now says. Which would you like?
2. **E13's wording.** It places a group's jump "where its two outcomes cross, or where they separate after being equal over a range". Gap 3 is a third way, where the outcome it votes on jumps across the other. E17 and E20 settle it, and the engine and the reference now agree there. Should E13 name it too?
