# Review: f03a (classes and later closes: spec, reference and cases)

Branch `f03a-fund-classes-spec-and-cases`, from main. The first step of spillpoint-fund 0.3.0: LPs in classes with their own fee and carry, and later closes with equalization (F22 to F28). No engine or page code.

**Nothing in the engine, the fund's source, the page's source, the main page, `cases/` or `reference/` changed:** `git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github` prints nothing.
- **One file under `apps/` changed:** `apps/fund/test/support/cases.ts`, the page's pending list, as your step 4 asks (§7).
- **`packages/fund/cases`:** only the six new folders, fund-22 to fund-27. Nothing in fund-01 to fund-21 changed.

`.claude/settings.json` isn't committed: the fund cases' lock is lifted only on your machine.

**The reference and my hand work never disagreed, and no case contradicted the spec.** Every value in cases 22 to 26 came out the same both ways, and all twenty refusals are the ones `cases-classes.json` expects (§5).

## 1. The spec and assumptions

### `packages/fund/docs/SPEC.md`

From `local/fund/fund-spec-classes.md`, in the spec's own style:
- **The opening line:** F22 to F28 settled on 2026-10-23 for 0.3.0 (S2).
- **"What it answers":** your three lines for funds whose LPs aren't all on the same terms.
- **Inputs:** a "From 0.3.0" bullet with your JSON for the two terms, the classes and an LP's two fields, and your six points about them.
- **F18's input terms:** `lp_class_name_repeated`, `lp_class_unknown`, `lp_close_after_distribution` and `call_without_payers`, marked F28.
- **F22 to F28** after F21, as your spec has them, with "The order of checks" and its fifth stage inside F28.
  - **A lead-in before F22:** F22 to F28 let LPs differ, and F19 to F21 are the case of every LP on the fund's terms and in from the start. F19's own text says every LP is on the same terms, and you said F1 to F21 stand as they are, so I added this line rather than change F19.
  - **One sentence added to F28:** from 0.3.0 an LP's fields are `name`, `commitment`, `class` and `close`, and any other is unsupported, as F21 has it. F21 lists only the first two.
- **Cases:** twenty-four and three sets of refusals, with 22 to 27 added.
- **Decided:** your six decisions of 2026-10-23.

### `packages/fund/docs/ASSUMPTIONS.md`

- **A new status, Settled (S2),** and a table "Classes and later closes (S2)" with F22 to F28, each "Settled (S2; Jordan)".
- **FA21 to FA32,** the choices F22 to F28 leave open (§3).
- **FC11 and FC12,** the case files for classes, accounts and closes, and the classes' refusals (§4).
- **FC2's last sentence** names the third refusal set. **FC7** says `set` can add at a list's end (FC12).
- **Later:** "Per-LP accounts" is now "where LPs differ, beyond classes and later closes": defaulted or excused LPs. Two new lines give F22's and F25's later work, word for word from your spec.

### Not in this step

- **STABLE.md and the README's stable lists** don't have the four new terms yet. A test holds both to the engine's list exactly, so they go in with f03b, as `lp_name_repeated` did in f02b.
- **The page's section of your spec** (f03c) isn't copied in. For 0.2.0 you had the page's rules go into `notes/plan-fund-page.md` in f02c's first commit; I'll do the same in f03c unless you say otherwise.
- **`CLAUDE.md`** names the 0.3.0 steps in the fund workstream's "Steps" line, and F1 to F28, as f02a did for 0.2.0.

## 2. The reference (`packages/fund/reference`)

Written from `SPEC.md` alone, as before.

- **`fund_ref/inputs.py`:** reads `fee_rate`, `equalization_rate`, `lp_classes`, and an LP's `class` and `close`, with F28's refusals in its five-stage order:
  - **Stage 1** finds a class's unsupported keys, its carry's keys among them.
  - **Stage 2** checks `fee_rate`, `equalization_rate` and each class after the fund's own terms. The fund's carry reading now takes a path, so a class's carry is refused at its own path with F9's refusals.
  - **Stage 4** checks an LP's class and close after F21's checks.
  - **Stage 5** is new: a later close's equalization rate, then each call in date order for a payer.
- **`fund_ref/accounts.py`, new (F22 to F24).** Each account is a fund of its own, run by the unchanged `waterfall.py`: the fund's terms with its class's carry, its part of every flow, and no GP commitment. The fund's amounts are the accounts' sums, with the GP commitment's line beside them. Each account settles its own clawback, and the fund owes their sum, each floored at zero first.
  - **With one account** the run is exactly the fund's own. That's why cases 01 to 21 come out byte for byte the same through the new path: `generate.py --check` matches all 21.
- **`fund_ref/closes.py`, new (F25).** The equalization, worked beside the waterfall:
  - each call as the fund made it, paid by the LPs in at its date
  - each later close's rebalancing of every earlier call
  - the joiners' interest, shared by what each LP already in gets back of each call
- **`fund_ref/breakpoints.py`:** the same search, its signature now every account's. Each reason names its account when there are two or more (F27). Given a plain `Waterfall`, it searches the one run, as before, so the old tests are unchanged.
- **`fund_ref/case.py`:** writes FC11's shapes (§4). `apply_change` adds a value at a list's end (FC12).
- **`fund_ref/waterfall.py`:** only the GP commitment's part of a call moved into a function both it and the accounts use.
- **`fund_ref/lps.py`:** a note that F19's share is the one-account case.
- **`tests/test_fund_ref.py`:** 23 new tests, 62 in all, with numbers small enough to check on paper.
  - **Classes:** fee weights dividing a fee call; each account's own tiers; a class on the fund's terms giving the same amounts as none; a class no LP names; classes in a fund without LPs.
  - **F24's case:** one account's surplus never offsetting another's clawback, at X = $5,500,000 on case 11's fund.
  - **Closes:** one close; a call on the close's date; two LPs joining on one date; two closes in date order; fee calls by fee weight; the GP commitment outside the equalization; case 25 with Cedar's close removed giving the same waterfall.
  - **Interest:** received at the rate on what each LP gets back, checked on 40 random close patterns.
  - **The refusals beyond the fixtures:** null for each new field, the order within and between classes, class names compared as written, an LP's class and close after its other checks, D as a close's limit, and stage 5 coming last.
  - **Random funds:** the 60 funds again, 40 of them with LPs in classes and at later closes. Every account's breakpoints are found, no account's clawback rises, the fund's amounts are the accounts' sums, and on the fund's terms alone the accounts give exactly what the plain waterfall gives.
    - **What they covered:** 35 of the 40 have two or more accounts, 10 have a later close, and 12 owe a clawback at X = 0.
    - **The cost:** the reference's unit tests now take about 31 seconds, up from 8.
- **`README.md`:** the method gains the accounts, the closes and F28.

## 3. Decisions I made (all New, in `ASSUMPTIONS.md`)

| ID | Default |
|---|---|
| FA21 | **When an LP is in:** when it has no close, or its close is on or before the date. So a call on a close's date is paid as it's made by the LPs in by then, the joiners included; it's not one of the calls they catch up on, and it carries no interest. `call_without_payers` asks the same question. |
| FA22 | **Which accounts there are:** the fund's terms when any LP is on them, then each class an LP names, in `lp_classes`' order. A class no LP names has no account; its terms are checked and do nothing. "Two or more accounts" counts accounts, so a fund whose LPs are all in one class has one account and reads as before. |
| FA23 | **The fund's figures with accounts** are the accounts' sums: each tier, paid-in, pref to D, hurdle pref, carry paid and entitlement. **The owed** is the sum of each account's owed, each floored first. So it can be more than the fund's carry paid less its entitlement, as F24 means. |
| FA24 | **null** is the same as leaving out each new field, and an empty `lp_classes` is none. **A class's `carry` of null** is refused as `bad_number`, as the fund's is (FA3): none, or the fund's? |
| FA25 | **The order where F28 leaves a tie:** within a class, the first unsupported key in the file, its carry's keys at the carry's place; a class's own fee rate before the fund's missing `fee_rate`; within an LP, class not text, class unknown, close not a date, close too late; stage 5's first call in F4's order. |
| FA26 | **Terms given but not needed** (a `fee_rate` no class uses, an `equalization_rate` with no later close, a class no LP names) are checked and unused, not refused. |
| FA27 | **Class names** follow FA17: blank is JavaScript `trim`'s whitespace, compared exactly as written. "Friends & family" isn't "Friends and family". |
| FA28 | **An account's name** in its reasons is "Fund terms" for the fund's terms, as F27's example has it, and the class's name otherwise. Nothing stops a class being named "Fund terms" (open question 4). |
| FA29 | **The clawback's reasons with accounts** keep F15's wording after the name, "on the fund's totals" included, though the run is on the account's totals. No case has such a `clawback_changes` (open question 4). |
| FA30 | **The equalization's arithmetic,** exact. At each later close, each LP in by then holds the LPs' part of each earlier call times its weight over theirs. Joiners pay in, and the LPs already in get back the difference. Interest on a call goes to the LPs already in by what each gets back of it, which comes to each receiving the rate on what it gets back. A fee call a no-fee joiner pays none of moves nothing. "Got back at later closes" counts every close after an LP was in: case 26's Birchwood joins at one close and gets some back at the next. |
| FA31 | **A close's limit:** before the first distribution in the cash flows and before D, since X is a distribution on D. With no distribution in the cash flows, D. |
| FA32 | **An account's LP multiple** is as the fund's (FA16): the split will give it, and the case files don't record it. |

**Also decided, smaller:**
- **Each case's `description`** is your `about` from `cases-classes.json`, word for word. Each fixture's `about` sentence is mine; its change and expected refusal are yours.
- **An LP's `close` is in the case file only when it's a later close.** An input close on or before the first call is in from the start (F25), so the case file says nothing about it.
- **An equalization row gives all four amounts,** zeros included, so every row reads the same.
- **`class` sits after `code` in a reason,** and first in a carry entry.
- **Case 26's two $5,333,333.33 points.** Your listed X is $5,333,333.33 exactly, and the fund terms' breakpoint is 16,000,000/3, a third of a cent above it. Both are points, the same to the cent, told apart by `exact` (open question 5).

## 4. The case files: FC11 and FC12 (your step 3)

**FC11 proposes how `expected.json` carries the accounts, each LP's class and close, and the equalization.** Each piece is there only when the input needs it, so cases 01 to 21 don't change, byte for byte:
- **`lps` (FC9):** an entry gains `class` when the LP has one and `close` when it joins at a later close, after `name`.
  - **Its `share` is its commitment over its account's commitments,** which is what divides its account's amounts (F23). With one account that's F19's share, so cases 17 to 20 are as they were.
  - **Its `paid_in`** is that share of its account's paid-in.
- **With two or more accounts:**
  - **At the top,** `accounts` after `lps`: each account's `class` (null for the fund's terms), `commitment`, `share` of the distributions and investment calls, `fee_share` of the fee calls, `paid_in`, and its pref when the fund has one.
  - **At each point,** `by_account` after `clawback`: each account's `distribution` and `to_date` in FC4's shape with its own steps, and its own `clawback` where the fund has one.
  - **The fund's `gp.carry`** lists every account's steps, the fund's terms first, each entry starting with its `class` (F26).
  - **Each reason** gains `class`, and its text starts with the account's name (F27).
  - **The fund's `clawback`** gives the accounts' sums (FA23).
- **With a later close,** `equalization` at the top:
  - its `rate`
  - `closes` in date order, each with its `date`, the `joining` LPs' names, and every LP in by then with its four amounts
  - `lps`: each LP's four over all the closes

  Each amount is `{amount, exact}`, as FC9's are.

What it looks like, from case 22 at X = $40,000,000 (shortened):

```json
"accounts": [
  { "class": null, "commitment": "8000000", "share": "8/9", "fee_share": "1", "paid_in": "8320000.00" },
  { "class": "Friends and family", "commitment": "1000000", "share": "1/9", "fee_share": "0", "paid_in": "1000000.00" }
],
"gp": { "carry": [
  { "class": null, "rate": "0.2", "amount": "4160000.00" },
  { "class": null, "rate": "0.25", "from_lp_multiple": "3", "amount": "2608888.89" },
  { "class": "Friends and family", "rate": "0", "amount": "0.00" }
], "total": "6768888.89" },
"by_account": [ { "class": null, "distribution": { "amount": "35555555.56", ... }, "to_date": { ... }, "clawback": { ... } }, ... ]
```

and from case 26, its second close:

```json
{ "date": "2022-10-01", "joining": ["Cedar Holdings"], "lps": [
  { "name": "Alder Endowment", "capital_paid": { "amount": "0.00", "exact": "0" },
    "capital_returned": { "amount": "833333.33", "exact": "2500000/3" },
    "interest_paid": { "amount": "0.00", "exact": "0" },
    "interest_received": { "amount": "22520.55", "exact": "1644000/73" } }, ...
] }
```

**FC12:** `fund-27-classes-refused`, in FC7's shape, twenty fixtures, each naming its own base:
- **case 22** for the classes and an LP's class
- **case 23** for a class's carry against the catch-up
- **case 25** for a close and the equalization rate

One fixture, `class-name-repeated`, sets `terms.lp_classes[1]` on a list of one, so `set` adds at a list's end. The engine's test helper already does that: a JavaScript array takes an assignment one past its end. So f03b needs no change there.

## 5. The cases (`packages/fund/cases`)

- **fund-22 to fund-26:**
  - `inputs.json`, written by a script from `cases-classes.json`: your `xs` and `inputs`, as `{case, description, xs, fund}`
  - `expected.json` from the reference
  - a `DERIVATION.md` worked by hand
- **fund-27-classes-refused:** your twenty changes as fixtures, `expected.json` from the reference, and a derivation of each refusal.

**How the hand work was done and checked** (scripts in my scratch folder, not committed):
- **Each derivation works its case from tier sizes.** For each account it takes the capital due, the pref due, the catch-up's length (pref × c / (1 − c)) and the room to the next step. The equalization it works call by call. That's a different method from the reference's search, and it imports nothing from the reference.
- **The whole `expected.json`, rebuilt from that hand working, against the reference's:** every key, in order, and every value, for all five cases. No differences.
  - **The comparison bites:** three planted changes were all caught, and a catch-up written as pref/8 instead of pref/9 gave 72 differences.
- **Every table cell in the derivations, against `expected.json`:** 1,399 cells, including the tables I typed: the accounts, paid-in, breakpoints and equalization totals. None differ.
  - The per-call equalization tables, which `expected.json` doesn't hold, were worked again from the inputs. They agree too.
- **The refusals:** all twenty match the kind, term and path in `cases-classes.json`, and the derivation's twenty rows match `expected.json`.
- **Cases 01 to 21:** `generate.py --check` matches all of them, and `git diff` shows none changed.

## 6. How the files got there

This session still refused the Write tool in `packages/fund/cases/`: the deny it loaded at its start, though your `settings.json` no longer has it. So, as you said during the step:
- **`inputs.json`** for cases 22 to 26 and **the 27 fixtures** were written by a script from `cases-classes.json`, each into its own new folder.
- **`expected.json`** was written by the reference, `generate.py`.
- **The six `DERIVATION.md` files** were written in my scratch folder, checked there, and copied in byte for byte with `cp`.
- **I didn't edit or commit `.claude/settings.json`.**
- **One attempt that was refused:** to check that `cases.test.ts`'s new tests bite, I tried to plant errors in case 26's `expected.json` and restore it. The permission check refused it. I ran those checks on a copy of the cases in my scratch folder instead (§7). No case file was ever changed and put back.

Their sha256, the same in both places:

| File | sha256, scratch folder and case folder |
|---|---|
| `fund-22-classes-fee-carry/DERIVATION.md` | `3c7283fa48318a6dad958680ebc1c00b772d68c86d8db8d21ff57b29c286a32a` |
| `fund-23-classes-pref-catch-up/DERIVATION.md` | `435461aedab794a9a33f2eb3a96bb867c21cdeb8f3a67179032586ae7dd9b0dc` |
| `fund-24-classes-clawback/DERIVATION.md` | `8c349d1b9366b42dc48a049599221c1d438a59c272732d943feff29b81baffff` |
| `fund-25-later-close/DERIVATION.md` | `189ac1ecf77af96485c59690989d3523fe0ee4ed033ee0d23857f7685d57c696` |
| `fund-26-closes-and-classes/DERIVATION.md` | `a5d0f282c224e5a706cd22536408fe066c87c7b62357e43494defc120cbcc883` |
| `fund-27-classes-refused/DERIVATION.md` | `d44443406d9468c782715a4f74e8e79dece97b4d1b79ca92a79e4308b813f898` |

`git diff --stat main -- packages/fund/cases` lists only the six new folders: 37 files.

## 7. The pending lists and the case-file checks

- **Both pending lists** have cases 22 to 27, as for 0.2.0:
  - **`packages/fund/test/support/cases.ts`,** which f03b empties
  - **`apps/fund/test/support/cases.ts`,** which f03c empties

  Today's engine and page skip them and keep passing.
- **`packages/fund/test/cases.test.ts`** checks the case files with no engine code, the pending cases included:
  - **Counts:** twenty-four runs and three sets of refusals, the four new input terms, LPs in 17 to 20 and 22 to 26, classes or closes in 22 to 26.
  - **Each LP's share** within its account, its class and later close as the input gives them, and its amounts dividing its account's.
  - **The clawback:** each account's owed is its carry paid less entitlement, floored, and the fund owes their sum.
  - **The accounts:** in F26's order; commitments, shares and fee shares from the input; paid-in and pref adding up; every tier adding up to the fund's; the fund's carry by step being each account's, named; each reason named, fund terms first.
  - **The equalization:** closes in date order with the right LPs joining and in; paid in equal to got back, and interest paid equal to received, at every close, exactly; each LP's totals the sum of its closes.
  - **Cases with one account** name no class, and cases with no later close have no equalization.
  - **"Is the case it adds LPs to"** now runs only for 17 to 20, the five skipped tests.
- **The checks bite.** On a copy of the cases in my scratch folder, five planted errors failed six tests:
  - interest that doesn't balance
  - an account's step the fund's list doesn't match
  - a reason without its account's name
  - a clawback share for the class owed nothing
  - a wrong fee share

**Nothing in `packages/fund/src` or `apps/fund/src` changed.**

## 8. CI and permissions (hard rule 9)

- **Nothing in `.github/workflows/` or `.claude/` is in this PR.**
- **`cases-locked.yml`** fails this PR until you add the cases label, as for any case step.

## 9. Each case's key figures, to the cent

Every value is from the case's `expected.json`, to the cent, half away from zero (FC8). The exact values are in each `expected.json` and `DERIVATION.md`. For each case: the accounts, each account's breakpoints, each LP at two Xs, and, with a later close, every LP's equalization.

#### fund-22-classes-fee-carry

A friends-and-family class (no fees, no carry) beside the fund's 2% and 20%-then-25%. The fee calls fall on the fund terms' account alone. A NAV of $40,000,000.

| Account | Commitment | Share of distributions | Share of fee calls | Paid in |
|---|---:|---:|---:|---:|
| Fund terms | 8,000,000 | 8/9 | 1 | 8,320,000.00 |
| Friends and family | 1,000,000 | 1/9 | 0 | 1,000,000.00 |

| X | Exact | Account | Reason |
|---:|---|---|---|
| 4,500,000.00 | 4500000 | Friends and family | `capital_returned`: LPs have their $1,000,000 of paid-in capital back |
| 4,860,000.00 | 4860000 | Fund terms | `capital_returned`: LPs have their $8,320,000 of paid-in capital back |
| 28,260,000.00 | 28260000 | Fund terms | `carry_step`: LPs reach 3.0x: carry is 25% from here |

| LP | Class | Paid in | From X = 18,000,000 | To date at 18,000,000 | From X = 40,000,000 (NAV) | To date at 40,000,000 | Clawback at 40,000,000 |
|---|---|---:|---:|---:|---:|---:|---:|
| Alder Endowment | | 6,240,000.00 | 10,248,000.00 | 13,248,000.00 | 21,590,000.00 | 24,590,000.00 | 0.00 |
| Birchwood Family Office | | 2,080,000.00 | 3,416,000.00 | 4,416,000.00 | 7,196,666.67 | 8,196,666.67 | 0.00 |
| Cedar Holdings | Friends and family | 1,000,000.00 | 2,000,000.00 | 2,500,000.00 | 4,444,444.44 | 4,944,444.44 | 0.00 |

At the NAV point the GP's carry is $4,160,000 at 20% and $2,608,888.89 at 25%, all from the fund terms' account, and it owes nothing back.

#### fund-23-classes-pref-catch-up

Anchor at a 1% fee and 10% carry beside the fund's 2% and 20%, an 8% pref over 1,827 days, and a full catch-up. Each account's pref is on its own paid-in: $2,082,279.45 and $2,042,235.62.

| Account | Commitment | Share of distributions | Share of fee calls | Paid in |
|---|---:|---:|---:|---:|
| Fund terms | 5,000,000 | 0.5 | 2/3 | 5,200,000.00 |
| Anchor | 5,000,000 | 0.5 | 1/3 | 5,100,000.00 |

| X | Exact | Account | Reason |
|---:|---|---|---|
| 10,200,000.00 | 10200000 | Anchor | `capital_returned`: LPs have their $5,100,000 of paid-in capital back |
| 10,400,000.00 | 10400000 | Fund terms | `capital_returned`: LPs have their $5,200,000 of paid-in capital back |
| 14,284,471.23 | 1042766400/73 | Anchor | `pref_met`: LPs have their 8% pref, $2,042,235.62 |
| 14,564,558.90 | 1063212800/73 | Fund terms | `pref_met`: LPs have their 8% pref, $2,082,279.45 |
| 14,738,301.37 | 1075896000/73 | Anchor | `catch_up_done`: the GP has 10% of the profit |
| 15,605,698.63 | 1139216000/73 | Fund terms | `catch_up_done`: the GP has 20% of the profit |

Nothing was distributed before X, so each LP's amount to date is its amount from X.

| LP | Class | Paid in | From X = 14,500,000 | From X = 30,000,000 |
|---|---|---:|---:|---:|
| Anchor Pension | Anchor | 5,100,000.00 | 7,142,235.62 | 14,010,000.00 |
| Bluebell Trust | | 5,200,000.00 | 7,250,000.00 | 13,040,000.00 |

At $14,500,000 Anchor's GP is in its catch-up ($107,764.38) while Bluebell is still getting its pref. At $30,000,000 the GP has 20% of the fund terms' $9,800,000 of profit and 10% of Anchor's $9,900,000: $2,950,000.

#### fund-24-classes-clawback

Example C with a friends-and-family class at no carry. X is final. Everything bends at X = $2,000,000: one breakpoint with three reasons.

| Account | Commitment | Share of distributions | Share of fee calls | Paid in |
|---|---:|---:|---:|---:|
| Fund terms | 8,000,000 | 0.8 | 0.8 | 9,600,000.00 |
| Friends and family | 2,000,000 | 0.2 | 0.2 | 2,400,000.00 |

| X | Exact | Account | Reason |
|---:|---|---|---|
| 2,000,000.00 | 2000000 | Fund terms | `capital_returned`: LPs have their $9,600,000 of paid-in capital back |
| | | Fund terms | `clawback_cleared`: from here the GP has earned all the carry it was paid earlier |
| | | Friends and family | `capital_returned`: LPs have their $2,400,000 of paid-in capital back |

| LP | Class | Paid in | From X = 0 | To date at 0 | Clawback at 0 | From X = 5,000,000 | To date at 5,000,000 | Clawback at 5,000,000 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Alder Endowment | | 6,000,000.00 | 0.00 | 7,000,000.00 | 200,000.00 | 2,200,000.00 | 9,200,000.00 | 0.00 |
| Birchwood Family Office | | 3,600,000.00 | 0.00 | 4,200,000.00 | 120,000.00 | 1,320,000.00 | 5,520,000.00 | 0.00 |
| Cedar Holdings | Friends and family | 2,400,000.00 | 0.00 | 3,000,000.00 | 0.00 | 1,000,000.00 | 4,000,000.00 | 0.00 |

At X = 0 the GP owes $320,000, 80% of example C's $400,000, all to the fund terms' LPs: $200,000 to Alder, $120,000 to Birchwood, nothing to Cedar.

#### fund-25-later-close

Cedar joins on 2021-07-15, after the 2021-01-15 calls; 8% equalization; a 2% GP commitment outside it. One account, so the waterfall and its wording are 0.2.0's, as if Cedar had been in from the start.

| X | Exact | Reason |
|---:|---|---|
| 5,183,673.47 | 254000000/49 | `capital_returned`: LPs have their $7,040,000 of paid-in capital back |

| LP | Close | Paid in | From X = 5,200,000 | To date at 5,200,000 | From X = 20,000,000 | To date at 20,000,000 |
|---|---|---:|---:|---:|---:|---:|
| Alder Endowment | | 4,224,000.00 | 3,055,680.00 | 4,231,680.00 | 10,017,600.00 | 11,193,600.00 |
| Birchwood Family Office | | 1,408,000.00 | 1,018,560.00 | 1,410,560.00 | 3,339,200.00 | 3,731,200.00 |
| Cedar Holdings | 2021-07-15 | 1,408,000.00 | 1,018,560.00 | 1,410,560.00 | 3,339,200.00 | 3,731,200.00 |

**Equalization,** one close, 181 days after the calls:

| LP | Capital paid in at its close | Capital got back | Interest paid | Interest received |
|---|---:|---:|---:|---:|
| Alder Endowment | 0.00 | 600,000.00 | 0.00 | 23,802.74 |
| Birchwood Family Office | 0.00 | 200,000.00 | 0.00 | 7,934.25 |
| Cedar Holdings | 800,000.00 | 0.00 | 31,736.99 | 0.00 |

Cedar pays in 0.2 of the LPs' $4,000,000 of 2021 calls. The GP commitment's $80,000 is outside it.

#### fund-26-closes-and-classes

Birchwood joins on 2022-04-01, and Cedar, in a friends-and-family class (no fees, no carry), on 2022-10-01; 6% equalization.

| Account | Commitment | Share of distributions | Share of fee calls | Paid in |
|---|---:|---:|---:|---:|
| Fund terms | 7,500,000 | 0.75 | 1 | 4,000,000.00 |
| Friends and family | 2,500,000 | 0.25 | 0 | 1,250,000.00 |

| X | Exact | Account | Reason |
|---:|---|---|---|
| 5,000,000.00 | 5000000 | Friends and family | `capital_returned`: LPs have their $1,250,000 of paid-in capital back |
| 5,333,333.33 | 16000000/3 | Fund terms | `capital_returned`: LPs have their $4,000,000 of paid-in capital back |

Nothing was distributed before X, so to date is X's.

| LP | Class | Close | Paid in | From X = 5,000,000 | From X = 12,000,000 |
|---|---|---|---:|---:|---:|
| Alder Endowment | | | 2,666,666.67 | 2,500,000.00 | 5,333,333.33 |
| Birchwood Family Office | | 2022-04-01 | 1,333,333.33 | 1,250,000.00 | 2,666,666.67 |
| Cedar Holdings | Friends and family | 2022-10-01 | 1,250,000.00 | 1,250,000.00 | 3,000,000.00 |

**Equalization,** by close, then each LP over both:

| Close | LP | Capital paid in | Capital got back | Interest paid | Interest received |
|---|---|---:|---:|---:|---:|
| 2022-04-01 | Alder Endowment | 0.00 | 700,000.00 | 0.00 | 10,356.16 |
| 2022-04-01 | Birchwood Family Office (joins) | 700,000.00 | 0.00 | 10,356.16 | 0.00 |
| 2022-10-01 | Alder Endowment | 0.00 | 833,333.33 | 0.00 | 22,520.55 |
| 2022-10-01 | Birchwood Family Office | 0.00 | 416,666.67 | 0.00 | 11,260.27 |
| 2022-10-01 | Cedar Holdings (joins) | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 |
| **Both** | Alder Endowment | 0.00 | 1,533,333.33 | 0.00 | 32,876.71 |
| **Both** | Birchwood Family Office | 700,000.00 | 416,666.67 | 10,356.16 | 11,260.27 |
| **Both** | Cedar Holdings | 1,250,000.00 | 0.00 | 33,780.82 | 0.00 |

At the second close Cedar pays a quarter of each investment call and none of the fee call, since its fee weight is 0.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - **The fund package:** 730 tests, 588 before. 725 pass, and 5 are skipped by design: "is the case it adds LPs to" applies only to cases 17 to 20.
   - **The fund page:** 327 tests, 321 before, the 6 new ones from `pending.test.ts`.
   - **Unchanged:** the engine's 3,177 and the main page's 680.
   - **The fund reference:** 62 unit tests, 39 before, and all 27 fund cases matching it.
   - **Spillpoint's reference:** its 73 unit tests and its cases.
2. **Case 26's equalization, from the reference:**

   ```bash
   python3 -c '
   import json, sys; sys.path.insert(0, "packages/fund/reference")
   from fund_ref.case import run_case
   eq = run_case(json.load(open("packages/fund/cases/fund-26-closes-and-classes/inputs.json")))["equalization"]
   for m in eq["lps"]: print(m["name"], *(m[k]["amount"] for k in ("capital_paid", "capital_returned", "interest_paid", "interest_received")))'
   ```

   It prints the "Both" rows above: Alder 0.00 1533333.33 0.00 32876.71, and so on.
3. **One account's surplus and another's clawback:** `python3 -m unittest discover packages/fund/reference/tests -k surplus` runs case 11's fund with a class stepping to 30%. At X = $5,500,000 the fund owes $81,250, not $31,250 (FA23).
4. **The refusals:** apply any fixture in `fund-27-classes-refused/fixtures/` to its base case's `inputs.json` and run it through `fund_ref.inputs.read`. Each is refused with the kind, term and path `cases-classes.json` gives.
5. **Nothing outside the step moved:**

   ```bash
   git diff --stat main -- packages/engine packages/fund/src apps/fund/src apps/dashboard cases reference .github
   ```

   It prints nothing. `git diff --stat main -- packages/fund/cases` lists only fund-22 to fund-27.
6. **Have cases 22 to 27 re-derived** independently, from `SPEC.md` and each case's `inputs.json`, before you add the cases label.

## Assumptions added

- **F22 to F28:** Settled (S2; Jordan).
- **FA21 to FA32 (New):** when an LP is in; which accounts; the fund's figures with accounts; null for the new fields; the order of checks' ties; terms given but unused; class names; an account's name; the clawback's wording with accounts; the equalization's arithmetic; a close's limit; an account's multiple.
- **FC11 and FC12 (New):** classes, accounts and closes in `expected.json`; the classes' refusals.
- **FC2 and FC7:** name the third refusal set, and `set` at a list's end.

## For f03b

- **Case 26 has two points with the same `x`** and different `exact`. `split.test.ts` names each point's test by `x` but splits at `exact`, so it will run both correctly, under one name twice. A page test that types a point's `x` into the page (f03c) reaches the listed point both times.
- **The known edge for keys that look like whole numbers** (FA2, FA18) will reach a class's keys too, once the engine reads them. It belongs under "Known edges" in f03b, beside the engine that has it.
- **STABLE.md and the README** get the four new input terms.

## Open questions

1. **FC11's shape.** It's what f03b's engine will be held to once the cases are locked:
   - `accounts` at the top and `by_account` at each point
   - `class` on each reason and each carry entry
   - an LP's `share` as its share of its account
   - `equalization` per close and per LP, every row with all four amounts

   Fine, or would you rather any of it be shaped differently?
2. **FA21:** a call on a close's date is paid by the LPs joining that day as it's made, so it isn't caught up on and carries no interest. Is that how you'd read "each call before the close"?
3. **FA22:** a fund whose LPs are all in one class has one account, and its reasons aren't named, since F27 says "two or more accounts". Fine, or should any class name its reasons?
4. **The account's name (FA28, FA29).** No case uses either, so this is wording for later:
   - Should a class named "Fund terms" be refused, which would need a new input term?
   - Should an account's clawback reason say "on its totals" rather than F15's "on the fund's totals"?
5. **Case 26's listed X of $5,333,333.33** is a third of a cent below the fund terms' breakpoint, 16,000,000/3. So the case has two points that read the same to the cent. Was the listed one meant to be the breakpoint itself? If so, I'd change the listed X to `"16000000/3"` while the lock is lifted, and the duplicate goes.
