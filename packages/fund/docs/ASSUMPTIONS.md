# Assumptions

Every modeling choice for the fund waterfall, with its default.
- **F1 to F18** are the rules in `SPEC.md`, settled with Jordan on 2026-10-12 (S0).
- **F19 to F21** are the LPs' rules in `SPEC.md`, settled with Jordan on 2026-10-18 for 0.2.0 (S1).
- **FA1 onward** are choices the rules don't settle.
- **FC1 onward** are the case-file conventions.

"Term" means it comes from the fund's own terms in the input. "Toggle" means an input field switches it. "Fixed" means there is one behavior. IDs are stable; later steps add to this file and never renumber.

Status:
- **Settled (S0)**: in the spec Jordan settled on 2026-10-12. Those he decided himself say so; the rest he took on Claude's recommendation or as drafted.
- **Settled (S1)**: in the LPs' spec Jordan settled on 2026-10-18, for 0.2.0.
- **Confirmed (f01a review)**: added in f01a and agreed by Jordan in his answers to its review. **Confirmed (f01b review)**, **Confirmed (f01c review)** and **Confirmed (f02a review)** likewise for f01b's, f01c's and f02a's.
- **New**: added while building, not yet reviewed. Each one is listed in its step's review note.

Nothing from ILPA's model LPA, law-firm templates or any other published waterfall material is in the repo: no text, examples, templates or models. The same rule as the engine's O12 for OCF and OCX (hard rule 10).

## The rules (S0)

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| F1 | Structure | European (whole-fund), cumulative. Every distribution, earlier ones included, runs the same tiers in date order against the fund's running balances. Carry on interim distributions is paid as they're made; F12 trues it up at the end. | Fixed | Settled (S0) |
| F2 | What a call or distribution's amount covers | The whole fund: all partners, the GP commitment included. | Fixed | Settled (S0) |
| F3 | The GP commitment | A share g, fee-free and carry-free. It pays g of investment calls, g of expense calls and none of fee calls; the LPs pay the rest of every call. It gets g of every distribution, outside the tiers, with no carry, reported as its own line. | Toggle (`pays_fees`, default false; `pays_expenses`, default true) | Settled (S0; Jordan) |
| F4 | Order of events | On one date, calls before distributions, so capital called that day is returned first and accrues no pref. Same-day distributions in the order listed. D on or after every cash flow. No calls at all, or a distribution before the first call, is refused. | Fixed | Settled (S0) |
| F5 | Tier 1, capital | LPs get back all their paid-in capital to date first: investment, fee and expense calls alike. | Fixed | Settled (S0) |
| F6 | Tier 2, pref | None by default. Rate r, accrued Actual/365 on the LPs' unreturned capital, from each call's actual date to the distribution's date, across the whole fund. Within a distribution, capital before pref. | Term (`pref`) | Settled (S0; Jordan) |
| F7 | Pref compounding | Simple only. Any other compounding is refused as unsupported. | Fixed | Settled (S0; on Claude's recommendation) |
| F8 | Tier 3, catch-up | None by default, and refused without a pref. With a pref and no catch-up, the pref is a hard hurdle. With one, the GP gets s of each dollar, the LPs the rest, until the GP's carry to date is c (the first carry rate) of all profit to date. A partial s must be above c. Profit is everything through the tiers beyond capital, LPs' and GP's. | Term (`catch_up`) | Settled (S0) |
| F9 | Tier 4, carry | Flat 0.20, or steps with rising rates, each from a higher LP multiple above 1. A rate of 1 or more, or steps out of order, is refused. | Term (`carry`) | Settled (S0) |
| F10 | The LP multiple | Net DPI: the LPs' distributions to date after carry ÷ their paid-in capital to date. Paid-in includes fees and expenses and excludes the GP commitment. Cash only, never NAV. | Fixed | Settled (S0; Jordan) |
| F11 | How a step applies | Only to profit above its threshold, with no catch-up for the profit below it. If LPs are already past a threshold when the carry tier starts, it starts at that step. | Fixed | Settled (S0; Jordan) |
| F12 | Clawback | Fund-level, at the end: when X is final, and at the NAV point. The GP's entitlement is one run of the tiers on the fund's totals: all LP paid-in as capital, the pref on the hurdle balance (paid-in less every distribution that ran the tiers, never below zero), and all distributions, X included. Owed: carry paid to date less the entitlement, when positive, to the LPs. One way only, gross of tax, no interest. | Fixed | Settled (S0; Jordan, and the test's form on Claude's recommendation) |
| F13 | A distribution in kind | Counts at its stated value. | Fixed | Settled (S0) |
| F14 | The x-axis | X is one more distribution on D, every earlier cash flow fixed, so every v1 term is piecewise linear in X. X = NAV is a marked point, final by definition. | Fixed | Settled (S0) |
| F15 | Breakpoints | Where a tier of this distribution ends (`capital_returned`, `pref_met`, `catch_up_done`, `carry_step`), whether or not the split changes. When final, also where the clawback bends (`clawback_cleared`, `clawback_starts`, `clawback_changes`). One X can carry several reasons. | Fixed | Settled (S0) |
| F16 | Outputs at each X | This distribution and the fund to date, each by tier; the GP commitment's line; when final, the entitlement and the clawback owed. Also the LPs' and GP commitment's paid-in, and the pref accrued to D. | Fixed | Settled (S0) |
| F17 | Numbers | The engine at 40 digits with decimal.js; the reference in exact fractions. Whole days. Cases compared as spillpoint's are. | Fixed | Settled (S0) |
| F18 | Refusals | A kind (unsupported or input), a term and the path into the input. The terms are listed in `SPEC.md`. | Fixed | Settled (S0) |

## The LPs (S1)

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| F19 | The LPs | Optional, in the order the GP lists them, each a name and a commitment. Every LP is on the same terms: the same fees, the same carry, every call pro rata to commitments. LP *i*'s share is its commitment over the sum of all the LPs' commitments, exactly. Commitments only divide: they aren't checked against the calls. The GP commitment isn't an LP. Left out, `null` or an empty list: no per-LP amounts. | Input (`lps`) | Settled (S1; Jordan) |
| F20 | Each LP's amounts | At each X and at the NAV point, in the input's order: its commitment and share; its share of the LPs' paid-in, of the LPs' total from X and of their total to date; when final, its share of the clawback owed, zero when nothing is. All exact. Nothing else changes. | Fixed | Settled (S1; Jordan) |
| F21 | The LPs' refusals | `lps` not a list, or an LP not an object: `bad_field`. A field other than `name` and `commitment`: unsupported, named by the field. A name or commitment missing or null: `missing_field`. A name not text, or blank: `bad_field`. A commitment not an exact string, or not above 0: `bad_number`. A name an earlier LP has: `lp_name_repeated`, at the later LP's `name`. Checked after everything else, one LP at a time in order: its shape and fields, that the name and commitment are there, the name, the commitment, then whether the name repeats. | Fixed | Settled (S1; Jordan) |

## Added in f01a

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| FA1 | Does the GP's catch-up count as carry in the clawback test (F12)? | Yes. The carry paid to date is the GP's catch-up plus its carry by step, and the entitlement is the same two from the run on the fund's totals. A catch-up is carry paid early: leaving it out would let a GP keep a catch-up the fund's totals don't give it. Case 11 turns on it: at X = 0 its GP has $2,000,000, $400,547.95 of it catch-up, against an entitlement of $1,000,000. | Fixed | Confirmed (f01a review) |
| FA2 | Which refusal comes first when an input has several problems (F18) | Three stages, each stopping at the first problem. **1. Unsupported terms:** the keys under `terms` in the file's order, then each term's own keys in the file's order; a compounding that isn't `"simple"`. **2. The fields:** unknown and missing top-level fields; then `as_of`; `terms` (carry, pref, catch-up, GP commitment, then the terms against each other: `catch_up_without_pref`, `catch_up_share_not_above_carry`); each cash flow in the list's order (unknown fields, missing fields, date, type, kind, amount); `distribution_date`; `final`; `nav`. **3. The cash flows against each other and D:** `no_calls`, `distribution_before_call`, `cash_flow_after_distribution_date`, each naming the first flow in the list that breaks it. So carry of 100% with a full catch-up is `carry_rate_not_below_one`, not `catch_up_share_not_above_carry`. | Fixed | Confirmed (f01a review) |
| FA3 | null in the input | The same as leaving the field out, for every optional field: `pref`, `catch_up`, `gp_commitment` and its flags, `compounding`, `distribution_date`, `final`, `nav`. Except `carry`: left out, it's 20% (F9); null is refused as `bad_number`, since it could mean "no carry" or "the default". "0" is no carry. | Fixed | Confirmed (f01a review) |
| FA4 | The amount `pref_met` names (F15) | All the pref accrued to D, paid or not, not only the part this distribution pays. "LPs have their 8% pref, $2,159,342.47" in case 9, whose X pays $659,342.47 of it. | Fixed | Confirmed (f01a review) |
| FA5 | "Every distribution that ran the tiers", and "all distributions" in the run on the fund's totals (F12) | The part of each distribution that ran the tiers: the distribution less the GP commitment's g. The GP commitment's line never enters the clawback test. | Fixed | Confirmed (f01a review) |
| FA6 | When LPs reach a step's multiple (F10, F11) | At exactly it: from the X where the LPs' distributions to date equal the multiple × paid-in, the higher rate applies. Their distributions count everything they've had from the tiers: capital, pref, catch-up share and carry-tier share. | Fixed | Confirmed (f01a review) |
| FA7 | Which tiers end inside X (F15) | Only a tier X pays into and then goes past. A tier that ended before X (case 9's capital, returned by earlier distributions), one with nothing to pay (a catch-up when the GP already has c of the profit), and the top step, which never ends, give no breakpoint. Where a tier ends and the next has nothing to pay, only the tier that ended is named. | Fixed | Confirmed (f01a review) |
| FA8 | A change with nothing to report | Not a breakpoint. The run on the fund's totals can move to its next tier while nothing is owed on either side, or without changing the GP's rate. Carry paid less entitlement can rise from below zero to zero, as in case 11 at its catch-up. Neither bends anything F15 reports. A `clawback_changes` names the fund-total run only where that run's GP rate changes there. | Fixed | Confirmed (f01a review) |
| FA9 | A clawback that rises as X grows | F15 words only a clawback that falls or holds. The reference stops, unworded, if one ever rises. In v1 none can, so `clawback_starts` never occurs as X grows; the argument is in `notes/review-f01a.md`. F15 keeps it for later terms (f01a review). The reference's random funds check it. The engine keeps its guard as a plain Error saying it's a bug to report, not a FundRefusal: a refusal is about the input, this would be about the engine (f01c review). | Fixed | Confirmed (f01a review) |
| FA10 | NAV | Any amount from 0 up; 0 is a fund worth nothing. The NAV point reports the entitlement and the clawback owed, final by definition (F14). In a fund whose X isn't final, the clawback's breakpoints aren't listed, only that point. | Fixed | Confirmed (f01a review) |
| FA11 | `as_of` | Only D's default. It isn't checked against the cash flows; F4 checks D. | Fixed | Confirmed (f01a review) |
| FA12 | Cash flows in the input | They may be listed in any order; F4 orders them by date, calls first. A distribution has no `kind`: one given is refused as `unknown_field`. A refusal's path is the flow's place in the list as given. | Fixed | Confirmed (f01a review) |

## Added in f01b

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| FA13 | What X can be | An exact amount from 0 up: an exact string (FC1) or a Decimal. Anything else is refused as `bad_number` at the path `x`, through the same FundRefusal. X = 0 is a distribution of nothing, as cases 10, 11 and 13 report. | Fixed | Confirmed (f01b review) |
| FA14 | Showing an amount to the cent (FC8) | Round to 20 places first, then half away from zero to the cent. 40-digit arithmetic can land a hair below an amount that is exactly half a cent: 699,291.385 worked out as 699,291.38499…9, which would show a cent low. The first rounding puts it back. An amount whose exact denominator is under about 10^18 can't sit within 10^-20 of a half cent without being on it, so only true ties move. Amounts themselves stay at 40 digits; this is for showing only. No fund case has such a tie. Comparing with the reference on 300 random funds found 3 in 77,785 amounts. | Fixed | Confirmed (f01b review) |

## Added in f01c

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| FA15 | How close is the same point (F15) | Within 10^-18 of a dollar. Two breakpoints that close are one, with all their reasons. A tier smaller than that has nothing to pay, so it has no end of its own (FA7). Carry paid less entitlement that close to zero is zero. At 40 digits, two ways of working out one exact amount agree to about 10^-30. Two different breakpoints are fractions whose difference is at least 1 over the product of their denominators, so they can't come within 10^-18 while that product is under 10^18. Spillpoint's engine uses 10^-12 for its ties (E14); this is finer, since nothing here is a choice between equals. | Fixed | Confirmed (f01c review) |

## Added in f01e

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| FA16 | The LPs' multiple in the split | The split gives F10's LP multiple: the LPs' distributions to date, X's included, after carry, over their paid-in to date. The page shows it under the split and does no fund arithmetic of its own (f01d review, answer 9). The case files don't record it (FC4 unchanged): the tests hold it to each case's LPs to date over their paid-in, to the cent. | Fixed | New |

## Added in f02a

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| FA17 | What a blank name is, and how names compare (F19, F21) | Blank is empty or nothing but whitespace, as JavaScript's `trim` takes it off: tab, line feed, vertical tab, form feed, carriage return, the line and paragraph separators (U+2028, U+2029), U+FEFF, and every space separator (U+0020, U+00A0, U+1680, U+2000 to U+200A, U+202F, U+205F, U+3000). The reference lists exactly these, so it and the engine agree where Python's own idea of whitespace differs (U+001C to U+001F and U+0085 are whitespace to Python, not to `trim`; U+FEFF the other way round). A name that isn't blank is kept as written, not trimmed, case-folded or Unicode-normalized, and compared as written (F19): "Alder" and "Alder " are two LPs, and so are "Alder" and "alder". The engine stays exact; the page trims leading and trailing spaces from a name as it reads one, typed or pasted, so "Alder " never reaches the engine and `lp_name_repeated` catches real repeats (f02c; f02a review, answer 2). | Fixed | Confirmed (f02a review) |
| FA18 | An LP's other fields (F21) | Any key but `name` and `commitment` is unsupported, named by the key, whatever its value, null included, as an unknown key under `terms` is. With two, the first in the file's order, as FA2 takes a term's own keys. A commitment is read as every number is (F17, FC1): an integer, a terminating decimal, or `"a/b"`. | Fixed | Confirmed (f02a review) |
| FA19 | The order of checks with LPs (F21, FA2) | A fourth stage after FA2's three, so a fund with any other problem is refused for that first, even when an LP has a field v1 doesn't model: an unsupported term comes before everything (FA2 stage 1), an unsupported LP field after everything. The stage opens with `lps` itself (not a list), then takes each LP in F21's order. Where F21 leaves a tie: a missing name comes before a missing commitment, and of two unknown fields the first in the file's order (FA18). An LP is checked through before the next one starts, so a repeated name at `lps[1]` comes before a bad commitment at `lps[2]`. The LPs last, since a side letter's term doesn't change the waterfall, so the fund's own problems come first (f02a review, answer 3). | Fixed | Confirmed (f02a review) |

## Added in f02b

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| FA20 | Working each LP's amounts in the split (F20) | Each is the LPs' amount times the LP's commitment, divided by all the LPs' commitments: multiplied first, so a share like 11/21 is never rounded before it's used (Jordan, f02b). The split also gives `share`, the commitment over all of them at 40 digits, for showing; no amount goes through it. The clawback share is zero where nothing is owed and null where the split has no clawback, as `clawback` itself is. A `Fund` built by hand without `lps`, as 0.1.0 built one, splits as a fund with no LPs. | Fixed | New |

## Later

Each rule's later work, as the spec gives it. None is refused today unless F18 says so.

- **American (deal-by-deal) carry (F1).**
- **Per-LP accounts, where LPs differ (F3, F19):** later closes and equalization, side-letter fee or carry breaks, defaulted or excused LPs.
- **Capital in tier 1 (F5):** invested capital only; committed capital.
- **Compounding pref (F7):** per call or as an IRR hurdle, built to a real fund's wording and checked against its model. Refused as `compounded_pref` until then.
- **A step's higher rate on all profit, with a GP catch-up (F11),** since terms vary.
- **Clawback (F12):** an after-tax cap; carry holdback or escrow; interim clawback tests.
- **The same total on different dates (F14),** shown as a table, since timing is a curve, not lines.

## Case file conventions

| ID | Question | Default | Status |
|---|---|---|---|
| FC1 | Exact numbers in JSON | Strings: an integer, a terminating decimal, or `"a/b"` when the decimal repeats, as spillpoint's C1. An amount in `expected.json` is to the cent; `exact` fields are exact. | Confirmed (f01a review) |
| FC2 | Fund case folders | `packages/fund/cases/fund-NN-<name>/`, numbered from 01. They sit in the fund package, not `cases/`, so the engine's tests, the page's and spillpoint's reference never see them (Jordan, f01a). They're locked as `cases/` is (hard rule 1): `cases-locked.yml` fails a PR that touches them without Jordan's label, and `.claude/settings.json` denies `Edit(packages/fund/cases/**)`. `inputs.json` is `{case, description, xs, fund}`: `fund` is the input `SPEC.md` describes, and `xs` the distributions on D to report. `expected.json` comes from the fund reference, `packages/fund/reference/generate.py`. `DERIVATION.md` works the case by hand. The refusals are a case each set: `fund-14-refused` for F18's, and `fund-21-lps-refused` for F21's (FC7, FC10). | Confirmed (f01a review; the LPs' refusals added in f02a) |
| FC3 | `expected.json`, at the top | `case`, `generated_by`, `distribution_date` (D), `final`, and `lps_paid_in`. With a GP commitment, `gp_commitment_paid_in`. With a pref, `pref_accrued_to_d` (F6's, paid or not), and, when final or with a NAV, `pref_on_fund_totals` (F12's hurdle pref). F16's paid-in and pref to D don't change with X, so they're given once here. Then `breakpoints` and `points`. | Confirmed (f01a review) |
| FC4 | A point | `x` to the cent, `exact`, and `tags`: `listed` (from `xs`), `breakpoint` and `nav`, in that order. Then `distribution` (X) and `to_date` (every distribution, X included), each a block: `amount`; `gp_commitment`, with one; `lps`: `capital`, `pref` with one, `catch_up` with one (the LPs' share of the catch-up tier), `carry_tier`, `total`; `gp`: `catch_up` with one, `carry` by step (`rate`, `from_lp_multiple` on later steps, `amount`), `total`. A tier the terms don't have isn't listed. When final, and at the NAV point, `clawback`: `carry_paid`, `entitlement`, `owed`. | Confirmed (f01a review) |
| FC5 | A breakpoint | `x` to the cent, `exact`, and `reasons`: X's own tier first, then the clawback's. Each reason has its `code` and `text`, and: `capital_returned`: `amount`, the LPs' paid-in. `pref_met`: `rate` and `amount` (FA4). `catch_up_done`: `carry`, c. `carry_step`: `lp_multiple` and `rate`. `clawback_changes`: `change` (`starts_to_fall`, `stops_falling`, `falls_faster` or `falls_more_slowly`), and `fund_totals`, the code of the totals' tier that ended, when that run is the cause. | Confirmed (f01a review) |
| FC6 | Reasons' text | F15's wording. Dollars without cents when whole ("$10,890,000"), to the cent otherwise ("$4,004,383.56"). Rates as percents ("8%", "7.5%"). Multiples to at least one place ("3.0x", "2.25x"). A `clawback_changes` caused by the run on the fund's totals reads "the clawback owed <change>: on the fund's totals, <tier>", where the tier that ended reads "LPs have their capital back", "LPs have their pref", "the GP has 25% of the profit" (c, the first carry rate) or "LPs reach 2.0x: carry is 30% from here" (the step reached). No amounts: the totals' run isn't a distribution. Case 15 pins the capital wording, case 16 the pref and catch-up wordings, and case 13 the step's (f01c review; cases 15 and 16 in f01e). | Confirmed (f01a review; the totals' tiers added after the f01c review) |
| FC7 | Refusal fixtures | `fixtures/<id>.json`, each `{base, about, change}`: a base fund case, a sentence saying what's changed, and the change to its `fund` input. `set` replaces the value at each path; `del` removes the value at a path. Paths are dotted with list places in brackets: `terms.catch_up.gp_share`, `cash_flows[0].amount`. `expected.json` is `{case, generated_by, fixtures}`, each fixture's file name giving `{refused: {kind, term, field}}`. A case file's `field` is the error's `path`: `FundRefusal` uses the engine's word (f01e review), and the case files keep `field`, as case files keep their own names. | Confirmed (f01a review) |
| FC8 | How the engine is held to a case (F17) | Every amount to the cent, rounded half away from zero, as `expected.json` gives it, and every breakpoint at its exact value: the engine's 40-digit amounts round the same. | Confirmed (f01a review) |
| FC9 | The LPs in `expected.json` (F20) | Only when the input has LPs, so cases 01 to 16 are as they were. **At the top,** after FC3's paid-in and pref and before `breakpoints`, `lps`: one entry an LP, in the input's order, with `name` as written, `commitment` and `share` exact (FC1), and `paid_in`; these don't change with X, as FC3's don't. **At each point,** after `clawback` (or `to_date` without one), `by_lp`: one entry an LP, in the same order, with `name`, `distribution` (its share of the LPs' total from X), `to_date`, and, at a point that has FC4's `clawback`, `clawback` (its share of the owed). Each amount is `{amount, exact}`: `amount` to the cent, half away from zero, as every amount in a case is (FC1, FC8), and `exact` the exact value, since F20's amounts are exact and a share like 1/3 rarely gives whole cents. The page rounds down to the cent (f02c), which `amount` alone can't give. The LPs divide the LPs' line and aren't a tier, so they stay out of `distribution` and `to_date`, and 0.1.0's shapes don't change (f02a review, answer 1). | Confirmed (f02a review) |
| FC10 | The LPs' refusals | `fund-21-lps-refused`, in FC7's shape: eleven fixtures, each one change to case 1's input (which has no LPs) setting `lps`. Each line of F21 has at least one: two for a missing name or commitment, two for a name (not text, blank), and three for a commitment (zero, negative, a JSON number). A `null` name or commitment is refused as missing, as the line says; the reference's unit tests cover it, not a fixture. | Confirmed (f02a review) |
