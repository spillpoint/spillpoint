# Review: f01h (the fund page's clawback)

Branch `f01h-fund-clawback`, from main after #103. The plan's step 3.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

### The first commit, from your f01g answers

- **The range (answer 1):** the default top now also covers 1.25 × the X the page opens at.
  - **Case 3** runs to $25M; it was $21M, just past its opening $20M.
  - **Cases 8, 13 and 12** are unchanged: $80M, $40M and $9M.
  - **An X typed past the top** still raises it to 1.25 × that X, to two digits, as in f01g, so X's mark is never off the chart.
- **Answers 2 and 3** are in the plan:
  - the per-$1M line counts carry only
  - no zoom, since the range's top does that job
  - in f01m, clicking or tapping the chart sets X there
- **The order of the cards** is now the main page's:
  - the answer
  - X and its slider
  - the chart
  - the split table
  - the breakpoint list

  The main page's order is "For you", the slider, the chart, the payout table, payments, then the breakpoint list. A test pins the order.
- **A correction:** f01g's review note said its order (headline, X, the split, the chart, the breakpoints) was the main page's. It wasn't: the main page puts the chart before the table. That note stays as written, since it's history.

### Short amounts (their own commit)

**The bug:** the headline's short amounts chose their unit before rounding, so $999,999.99 read "$1000K".

**The fix:** the unit is now chosen after rounding. $999,999.99 reads "$1M", and $999.50 reads "$1K". Every other amount reads as before. The main page's `shortDollars` has the same edge; it isn't changed here (open question 4).

### The clawback

**The card, "The clawback",** sits right under the main chart, before the split, as the plan has it.

**When it shows:**
- **A final fund:** at every X.
- **A fund that isn't final:** only when X is exactly NAV. That point is final by F14: the fund liquidated at NAV on D.
- **Otherwise:** there's no card.

**The sentence** is yours, word for word, with amounts to the cent: "If this is the fund's last distribution, the GP has been paid $4,750,000.00 of carry, has earned $2,000,000.00 on the fund's totals, and owes $2,750,000.00 back to the LPs." When nothing is owed, it ends "and owes nothing back to the LPs."

**A final fund's small chart:**
- **What it plots:** what's owed against X, from $0 to the same top as the main chart, on its own scale.
- **Marks:**
  - numbered marks where the clawback bends, numbered as in the breakpoint list
  - X
- **The legend:** "The clawback", with what's owed at X to the cent.
- **Under it, where it bends:** each bend's number and X, the engine's clawback reasons only, and "Owed at this X: $…". Choosing one moves X there.
- **Exact:** the chart is drawn from what's owed at $0, at each bend and at the top, the engine's amounts, and nothing else. It's exact because the engine reports every X where what's owed bends.

**A final fund that owes nothing at $0** owes nothing at any X, since what's owed never rises with X (FA9). So in place of a flat chart, the card says: "Nothing is owed at any X: even at $0, the GP has been paid no more carry than it has earned on the fund's totals, and more X never adds to what's owed." That's case 12.

**A fund that isn't final, at NAV,** gets the sentence and a line under it: "The fund isn't final, so away from NAV there's no clawback, and no chart of one against X." That's case 8.

**The NAV button** sits in the X card, under the box:
- **The line:** "Set X to NAV", then "At NAV, $40,000,000.00, as if the fund were liquidated on 30 Sep 2026; the clawback card then shows what the GP would owe back."
- **For a final fund with a NAV** (case 12), the line stops after the date.
- **At NAV,** an "X is at NAV" tag shows.

**The headline,** when what's owed is more than $0.00 to the cent:
- **A final fund:** your sentence, "At a $15M distribution on 1 Jan 2025, the GP's carry is $1M, and it owes $750K back." It's "$1M", not your "$1.00M" (open question 1).
- **At $0:** "With nothing distributed on 1 Jan 2025, the GP's carry is $0, and it owes $2.75M back." (open question 2)
- **A fund that isn't final, at NAV:** "…, and if the fund were liquidated at NAV it would owe $750K back." None of the four examples has this, so a test uses case 13's terms, not final, with a NAV of $10M.

**Case 13 opens at $0,** owing $2,750,000.

**One fix to both charts:** each now takes its card's width before its first paint. Before, a chart's first frame was 960 pixels wide. The clawback's chart appears whenever a final fund is picked, so on a phone that frame scrolled the page sideways.

### Tests: 90 in `apps/fund`, up from 66

- **`clawback.test.tsx` (22, new):**
  - **The sentence** at every clawback point of every final case: cases 10, 11, 12, 13, 15 and 16, 39 points in all. Each sentence gives that point's carry paid, entitlement and owed from `expected.json`.
  - **The small chart is exact** for the same six cases: what's owed at a quarter, half and three-quarters of the way between two of its points is on the straight line between them, within 10⁻²⁰. It's also checked the other way round:
    - **inside the test:** with the bends left out, every case that owes anything isn't a straight line
    - **by hand:** I took the bends out of the page's code, and cases 10, 11, 13, 15 and 16 failed. Case 12 owes nothing, so it's flat either way.
  - **Case 13:**
    - at $0, the sentence and the headline
    - owed at $10M, $12M and $15M, then at $15,937,500 and $25M
    - $703,125.00 halfway between $15M and $15,937,500
    - the headline at $15M
    - the bends list
    - the chart's marks
    - choosing bend 3
  - **The NAV point:**
    - **Case 8 at NAV** owes nothing, as case 8's point at $40M says. It has no chart, and no clawback in the headline.
    - **Case 8 away from NAV** has no card, and the button brings X back.
    - **Case 3** has no NAV, so no button, and no card.
    - **Case 12** owes nothing at any X.
    - **A fund that isn't final, at NAV:** the headline gives what it would owe.
- **`app.test.tsx` (12):**
  - the card order
  - case 13 at $0 and at $15M, each split held to the case
- **`chart.test.tsx` (44):**
  - the four tops: $25M, $80M, $40M and $9M
  - case 3's slider running to $25M
- **`format.test.ts`:** the short amounts' edge.

**Checked in the browser:** the dev page, desktop and 375 pixels wide.
- **The page never scrolls sideways,** including the frame when a final fund is picked.
- **The clawback's legend** sits on one line.
- **The NAV line** wraps as text.

**CI, run locally:**
- the fund page's 90 tests
- the fund package's 318
- the engine's 3,115
- the main page's 673
- both references

## How to run it on your machine

```bash
pnpm install
```

```bash
pnpm --filter @spillpoint/fund dev
```

Open the address it prints, `http://localhost:5173/` or the next port if that's taken.

## What to check

1. **It opens on case 3 at $20,000,000.** The slider and the chart run to $25M. There's no NAV button and no clawback card. The cards run: the answer, X, the chart, the split, the breakpoints.
2. **Pick "A late call and a clawback" (case 13).** It opens at $0.
   - **The headline:** "With nothing distributed on 1 Jan 2025, the GP's carry is $0, and it owes $2.75M back."
   - **The clawback card, under the chart:** "If this is the fund's last distribution, the GP has been paid $4,750,000.00 of carry, has earned $2,000,000.00 on the fund's totals, and owes $2,750,000.00 back to the LPs."
   - **The small chart** falls from $2.75M at $0 to $750K at $10M, holds to $15M, falls to $656,250 at $15,937,500, then holds.
   - **Type each X:** the legend under the small chart gives what's owed.

     | X | Owed |
     |---:|---:|
     | `0` | $2,750,000.00 |
     | `10000000`, `12000000`, `15000000` | $750,000.00 |
     | `15937500`, `25000000` | $656,250.00 |

   - **At `15000000`,** the headline reads "At a $15M distribution on 1 Jan 2025, the GP's carry is $1M, and it owes $750K back."
   - **Its reasons,** under the small chart:

     | | X | Reason | Owed at this X |
     |---|---:|---|---:|
     | 1 | $10,000,000.00 | The clawback owed stops falling. | $750,000.00 |
     | 2 | $15,000,000.00 | The clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here. | $750,000.00 |
     | 3 | $15,937,500.00 | The clawback owed stops falling. | $656,250.00 |

3. **Pick "A VC fund with premium carry…" (case 8).** It opens at NAV, $40,000,000, with "X is at NAV" beside the button.
   - **The card:** "If this is the fund's last distribution, the GP has been paid $6,806,250.00 of carry, has earned $6,806,250.00 on the fund's totals, and owes nothing back to the LPs."
   - **The headline** has no clawback: "At a $40M distribution on 30 Sep 2026, the GP's carry is $6.81M."
   - **Choose breakpoint 2:** the card goes. **"Set X to NAV"** brings X back to $40,000,000 and the card with it.
4. **Pick "An SPV…" (case 12).** The card says nothing is owed, $792,000.00 paid and earned, and "Nothing is owed at any X…". Type `0`: still nothing owed. Its one breakpoint, $2,040,000, is in the breakpoint list.
5. **At a phone's width,** the page doesn't scroll sideways when you pick case 13, and the small chart fits.

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. The page's choices are above, and in the plan's "The answer first" and "The clawback" sections.

## Open questions

1. **"$1M" or "$1.00M":** your headline example wrote "$1.00M". The page writes "$1M", as the main page writes its short amounts: three significant digits, trailing zeros dropped. That's also how the headline writes "$15M". Keep that, or always three digits ("$1.00M", "$15.0M")?
2. **The headline at $0:** it leads "With nothing distributed on 1 Jan 2025", not "At a $0 distribution". All right?
3. **A fund that isn't final:** at NAV the card has the sentence but no chart, since the plan gives the small chart to final funds and only the NAV point is final. Should it also chart what would be owed if the fund were liquidated at each X? The engine finds clawback breakpoints only for a fund marked final, so the page would ask it about a final copy of the fund.
4. **The main page's "$1000K":** its `shortDollars` has the same edge fixed here, at $999,999.99. Fix it in a step of its own?
