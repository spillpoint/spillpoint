# Review: f01i (the fund page's layout, and the terms form)

Branch `f01i-fund-terms-form`, from main after #104. The layout changes from your side-by-side look come first, then the plan's step 4.
- **Not deployed:** `pages.yml` is unchanged.
- **Unchanged:** nothing in `apps/dashboard`, `packages/engine`, `packages/fund`, any cases, `reference/`, `.github/` or `.claude/`. The local `.claude/launch.json` I preview with is untracked and not committed.

## 1. What changed

### Your f01h answers

1. **"$1M"** stays, the way the main page shortens.
2. **The $0 headline** is replaced by the new headline, below.
3. **No clawback chart for a fund that isn't final:** unchanged. The sentence at NAV is its scope.
4. **The main page's "$1000K"** is left for the main track, as its own small step.

### The first commit: the layout

- **Tabs, as the main page has them:** Payouts (everything the page showed), Terms and Cash flows.
  - **The keys are the main page's:** the arrows move between tabs, Home and End go to the first and last.
- **One line on the fund behind the answers.** It sits under the governance note, as the main page's "built from its 10 events" does (open question 4). It gives:
  - what's been paid in
  - what's been distributed before X
  - the NAV, if there is one
  - whether X is the last distribution

  The amounts are the cash flows' own, added up as entered.

  | Example | The line |
  |---|---|
  | Case 3 | This fund: $10.7M paid in over 3 calls and nothing distributed before X. X isn't its last distribution. |
  | Case 8 | This fund: $11M paid in over 4 calls, $4M distributed before X and a NAV of $40M on 30 Sep 2026. X isn't its last distribution. |
  | Case 13 | This fund: $20M paid in over 2 calls and $30M distributed before X. X is its last distribution. |
  | Case 12 | This fund: $2.04M paid in over 2 calls, nothing distributed before X and a NAV of $6M on 1 May 2026. X is its last distribution. |

- **The headline stays in one frame.**
  - **A final fund:** the GP's carry over the fund's life, your sentences word for word.
    - **What it ends with:** its carry to date, X's included, less what it gives back. That's the lesser of what it was paid and what it earned on the fund's totals (F12, one way only). For case 13 that's $2M, $5M and $8M at $0, $15M and $25M: the case's entitlement each time.
    - **When X itself pays the GP nothing,** "it gets $0 now" is left out. At $10M it reads "…, the GP ends with $4M of carry: it gives back $750K."
    - **The line under it** says it's about this distribution: "Of the $15M, the LPs get $14M." At $0 there's no such line (open question 2).
  - **A fund that isn't final:** unchanged. That includes the NAV clause when something would be owed (open question 1).
- **The clawback card** comes after the split, so the chart and the split, both about this distribution, sit together.
  - **It keeps** its sentence and small chart.
  - **Its list of bends is gone,** since the breakpoint list has them. The small chart still marks them, numbered as in that list.
- **The Cash flows tab, read-only:** the rows as entered (date, type, kind, amount), then:
  - As of
  - D
  - whether it's the last distribution
  - NAV on D

### The second commit: the terms form (the plan's step 4)

**The fields:**
- **Carry,** flat or in steps.
  - In steps: "Add a step", and "Remove" on every step after the first.
  - Switching keeps both: the flat rate becomes the first step's, and the steps come back when you switch back.
- **A pref,** with its rate a year, simple.
- **The catch-up,** shown only with a pref: None (a hard hurdle), Full, or Partial with the GP's share.
- **The GP commitment:**
  - its share of the fund
  - "Pays its share of fees" (off unless the example has it)
  - "Pays its share of expenses" (on unless the example has it)

**Rates are typed as percents and written exactly.** "7.25" is "0.0725": the page moves the decimal point rather than dividing, so a rate typed with 46 places keeps all 46.

**A term turned on starts at its usual value,** in its field, to be changed:
- a pref of 8% a year
- a partial catch-up of 50% to the GP
- a GP commitment of 1%

A pref brings in the catch-up at "None", which is what leaving it out of the input means (open question 3).

**Refusals, one at a time, in the engine's order (FA2):**
- **Text the page can't read as a number,** like "twenty" or an empty step: the page says so under that field, and nothing goes to the engine.
- **Everything else is the engine's refusal,** shown under the field its path names, in the page's words:

  | The engine's refusal | Under | The page's words |
  |---|---|---|
  | `carry_rate_not_below_one` | the carry rate | A carry rate must be below 100%. |
  | `steps_out_of_order`, rate | the step's rate | This step's rate must be above 30%, the rate of the step before it. |
  | `steps_out_of_order`, multiple | the step's rate | This step must start from an LP multiple above 5.0x, where the step before it starts. |
  | `catch_up_share_not_above_carry` | the GP's share | The GP's share of the catch-up must be above the carry rate, 20%, or the catch-up never ends. |
  | `gp_commitment_not_below_one` | its share | The GP commitment's share must be below 100%. |
  | `bad_number`, a pref of 0% | the pref's rate | Write the pref as a percent a year, above 0: 8 or 7.5. |

  For `steps_out_of_order`, the engine names the step. The page compares that step with the one before it to say which of F9's two rules it breaks.
- **The same words show at the top of the form,** with "Show me".
- **The Payouts tab stays on the last fund the engine accepted,** and says so: "Your last change to the terms has a problem, so these payouts are from the fund before it." Its "Fix it" opens the Terms tab on the field.

**Once a term changes:**
- **The picker** reads "An example, with your changes", not the case's name.
- **The line under it** reads "This fund, with your changes to its terms: …".
- **Picking an example** asks first, as the main page does: "Start over from this example? Your changes to the terms will be lost."

### Tests: 121 in `apps/fund`, up from 90

- **`terms.test.tsx` (27, new):**
  - **Rates:** typed percents to exact rates and back, with nothing rounded, including one typed with 46 places. Text that isn't a number is refused.
  - **Every fund case, 15 of them:** the form, filled from the case's terms, writes them back exactly, with the same breakpoints.
  - **Carry of 100%:**
    - refused under the carry rate
    - the payouts keep the last good fund and say so
    - "Fix it" focuses the field
    - 25% then runs, at $2.29M of carry
  - **Case 8 at a flat 20%:**
    - one breakpoint, $7,000,000.00
    - $6,534,000.00 of carry at $40,000,000
    - the picker and the line say it's edited
    - back to steps, its three breakpoints return
  - **Adding a step:** each problem with the step under its row, then a fourth breakpoint, "LPs reach 7.0x: carry is 35% from here.", and Remove.
  - **The pref and catch-up:**
    - a pref brings in the catch-up at None, and Full gives "full catch-up"
    - a partial 20% is refused beside its share, and 80% runs
    - a pref of 0% and "half" are refused
  - **Case 3 with both flags turned is case 4:**
    - its breakpoint, $10,651,020.41
    - the GP's $1,832,400.00 at $20,000,000, from case 4's `expected.json`
  - **A share typed as 7.25** shows as 7.25%, and 100% is refused.
  - **Starting over** asks first, and keeps your changes on "no".
- **`tabs.test.tsx` (4, new):**
  - the four examples' summary lines
  - one panel at a time
  - the keys
  - case 8's cash flows, read-only
- **`app.test.tsx` (12):**
  - the headlines, the terms line first
  - the card order, with the clawback after the split
- **`clawback.test.tsx` (22):**
  - case 13's headline at $0, $15M, $25M and $10M
  - the card has no list or buttons of its own
  - choosing bend 3 from the breakpoint list

**Checked in the browser,** desktop and 375 pixels wide:
- The page never scrolls sideways.
- On a phone a step's row wraps onto two lines, which f01m's narrow screens can tighten.

**CI, run locally:**
- the fund page's 121 tests
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

1. **Pick "A late call and a clawback" (case 13).** The line under the picker reads "This fund: $20M paid in over 2 calls and $30M distributed before X. X is its last distribution." Type each X:

   | X | The headline |
   |---:|---|
   | `0` | If nothing more is distributed after 1 Jan 2025, the GP ends with $2M of carry: it gives back $2.75M. |
   | `15000000` | If $15M on 1 Jan 2025 is the last distribution, the GP ends with $5M of carry: it gets $1M now and gives back $750K. |
   | `25000000` | If $25M on 1 Jan 2025 is the last distribution, the GP ends with $8M of carry: it gets $3.91M now and gives back $656K. |

   At $15M the line under it reads "Of the $15M, the LPs get $14M." The cards run: the chart, the split, the clawback (no list of its own), then the breakpoints.
2. **Carry of 100%:**
   - **On case 3,** the first example, open Terms and type `100` as the carry rate. "A carry rate must be below 100%." shows under it.
   - **On Payouts,** a notice says the payouts are from the fund before your change, and the headline still reads "…, the GP's carry is $1.83M." "Fix it" takes you back to the field.
3. **A pref brings in the catch-up.** Tick "A preferred return": the rate shows 8, and a Catch-up group appears at "None (a hard hurdle)". The headline's terms line reads "Carry 20%; pref 8%, no catch-up; …".
4. **A partial catch-up of 20%.** Choose Partial (it starts at 50) and type `20`. Under the share: "The GP's share of the catch-up must be above the carry rate, 20%, or the catch-up never ends."
5. **Case 8 at a flat 20%.**
   - **Pick case 8,** open Terms and choose Flat: the carry rate shows 20.
   - **On Payouts:**
     - one breakpoint, $7,000,000.00
     - "Carry at 20%" with $6,534,000.00 to the GP at $40,000,000
     - the headline at $6.53M
   - **The picker** reads "An example, with your changes".
6. **Case 4 from case 3:**
   - **Start over on case 3:** it asks first.
   - **Tick "Pays its share of fees"** and untick "Pays its share of expenses".
   - **Its one breakpoint** is $10,651,020.41, and the GP's total at $20,000,000 is $1,832,400.00, case 4's values.
7. **The Cash flows tab** on case 8: five rows, as entered, and NAV $40,000,000.00.

## Assumptions added

None in the fund engine, and nothing in `ASSUMPTIONS.md`. The page's choices are above and in the plan:
- the starting values
- the catch-up at "None" with a new pref
- what "ends with" is
- the line under a final fund's headline

## Open questions

1. **A fund that isn't final, at NAV:** you said its headline stays "as now", so when something would be owed it still reads "At a $40M distribution on 30 Sep 2026, the GP's carry is $X, and if the fund were liquidated at NAV it would owe $Y back." That's the shape you didn't want for a final fund. None of the examples shows it, since case 8 owes nothing at NAV. Keep it, or use the final frame at NAV: "If the fund is liquidated at NAV, $40M on 30 Sep 2026, the GP ends with $Z of carry: it gets $X now and gives back $Y"?
2. **The line under a final fund's headline:** "Of the $15M, the LPs get $14M.", and none at $0, since the line above is about the fund's life. All right?
3. **Starting values:** a pref of 8%, a partial catch-up of 50%, a GP commitment of 1%, and the catch-up at "None" when a pref is ticked. Keep them, or start the fields empty so nothing is filled in for you?
4. **Where the line sits:** under the governance note, as on the main page, rather than right under the picker. All right?
