# Assumptions

Every modeling choice that `SPEC.md` or a case doesn't settle is listed here with its default. "Toggle" means the engine will expose it as an option. "Fixed" means there is one behavior. IDs are stable; later milestones add to this file and never renumber.

Status:
- **Confirmed**: Jordan answered it on 2026-10-04, either before M1a was built (item N) or in his decisions on the M1a review (M1a review, item N).
- **Default**: Jordan accepted the proposed default without changing it.
- **New**: added while building, not yet reviewed. Each one is listed in the review note.

## Rounds and cap tables

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| R1 | "X% of the company immediately after the issuance" (Lena Fischer's 6%) | X% of all issued stock after the issuance. There were no options, pool, or SAFEs yet. x = p·N ÷ (1 − p), rounded down: 638,297 shares. | Fixed | New |
| R2 | Pool created at X% of fully diluted shares | Fully diluted = issued stock + issued options + the pool. SAFEs are excluded, as the Millrace case states. Size = p·N ÷ (1 − p), rounded down. | Fixed | New |
| R3 | Circular round math and share rounding | The price is solved exactly, treating new shares, SAFE shares, the pool target, and anti-dilution shares as fractional. Only the counts actually issued are then rounded down: each investor's shares, each SAFE's shares, and the pool, which is set to floor(target % × solved post-money FD). The price stays the exact solved value, so the pool can land a fraction of a share under target. | Fixed | Default (item 4) |
| R4 | Post-money SAFE Company Capitalization | Follows the YC text. It counts all issued stock, issued options, promised options, the unissued pool as it stood before the financing, and the converting SAFEs themselves: each capped SAFE counts as purchase amount ÷ post-money cap of Company Capitalization, so CC = (stock + options + pool) ÷ (1 − Σ purchase ÷ cap). It excludes the pool increase made in the financing and the new money. | Fixed | Default (item 6) |
| R5 | SAFE shadow series | One shadow series per distinct SAFE conversion price. Its original issue price and conversion price both equal the SAFE's exact conversion price. It copies the new series' preference multiple, participation, cap, and anti-dilution. Preference = shares × that price × multiple. For Millrace that is $674,999.64, slightly under $675,000 because shares round down. | Fixed | Default (item 7) |
| R6 | Pro-rata rights | NVCA definition. The entitlement is the investor's pre-round fully diluted percentage × the round size. The fully diluted base counts outstanding stock, outstanding options and outstanding convertible securities, all as converted, and leaves out the unissued pool. The entitlement is the most the investor may buy; the amount actually bought is an input. Millrace: Harbor Lane held 5,393,570 of 18,790,910 shares before Series A, or 28.703080%. That makes its entitlement $3,444,369.64, and its $3,000,000 is a partial take-up. | Toggle: include the unissued pool in the base, which gives Harbor Lane 25.000000% and $3,000,000.00 | Confirmed (M1a review, item 1) |
| R7 | Broad-based weighted average: what counts in A | NVCA: outstanding common, outstanding options as exercised, and outstanding preferred as converted. The unissued pool is excluded, including the increase made in the same round. | Toggle: include the unissued pool in A | Confirmed (item 2) |
| R8 | Broad-based weighted average: B and C | B = the cash actually paid for the whole shares issued (shares issued × price) ÷ CP1. It is not the headline round size. C = the shares actually issued, after rounding down. That is how the charter computes it after closing. Millrace Series B: B uses $9,999,999.89 (9,241,189 shares × $1.082112), not $10,000,000. | Fixed | Confirmed (M1a review, item 5) |
| R9 | CP2 rounding | Exact, with no rounding. | Toggle (M4): round CP2 to $0.0001 or $0.01 | Default (item 3) |
| R10 | Anti-dilution shares inside the round's own price | The post-money FD count used to solve the price includes the anti-dilution adjustment shares, computed from the solved (fractional) new-share count. The final CP2 uses the shares actually issued (R8), so the two differ by a fraction of a share. | Fixed | New |
| R11 | Anti-dilution on Seed Preferred, the Seed shadow series, and Series B | None, because the case doesn't give any. It wouldn't matter for Millrace: the Seed price (about $0.4635) and the shadow price (about $0.3849) are both below the Series B price (about $1.0821), and nothing comes after Series B. | Fixed for Millrace | Default (item 13) |
| R12 | Seniority before Series B | The case states only the final order. After Series A, Series A is senior to the Seed tier, consistent with that final order. Exit values use the post–Series B table, so this doesn't change any expected payout. | Fixed for Millrace | New |
| R13 | Who invests in Series B | Cobalt's $10,000,000 is the whole round. Harbor Lane doesn't exercise pro-rata. Ridgeline has no stated pro-rata rights. | Fixed for Millrace | Default (item 12) |
| R14 | Grants between rounds | They have no dates in the case, so `date` is null. All grants come out of the unissued pool. | Fixed | New |
| R15 | Narrow-based weighted average: what counts in A | Outstanding preferred only, as converted. Common, options and the unissued pool are left out. Edge case 16's inputs name the definition each variant uses. | Toggle: the definition of A | Confirmed (M1a review, item 2) |

## Exit waterfall

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| E1 | Vesting | Options and restricted stock are fully vested. | Fixed (`SPEC.md`) | Default (item 11) |
| E2 | As-converted shares at exit | Exact (fractional), with no rounding. This is economically equal to rounding down plus cash in lieu (see `SPEC.md`, Rounding). | Fixed | Confirmed (item 5) |
| E3 | Option payouts and the exit-value axis | The exit value is proceeds to equity before strike cash. Exercised options pay their strike, which is added to proceeds. An option holder's payout is reported net of strike, so the holder × security lines sum exactly to the exit value. | Fixed | Default (item 10) |
| E4 | Who decides to exercise | One decision per option strike price, since every option at a strike has the same economics. Each warrant decides for itself. | Fixed | New |
| E5 | Exits where converting or exercising pays exactly the same | When several stable decision sets pay every holder the same, the reported decisions are the ones with the fewest conversions and exercises: a series converts, or an option is exercised, only when that strictly pays more. Payouts are unaffected. | Fixed | New |
| E6 | Conversion decisions | Each series decides for itself. There is no forced class conversion in Millrace. | Toggle: series that must convert together (`SPEC.md`) | Default (item 8) |
| E7 | Capped participation after anti-dilution | Cap = cap multiple × original issue price × shares, and the preference counts toward it. Anti-dilution changes neither the cap nor the preference, only the as-converted shares used for participation and conversion. | Fixed | Default (item 9) |
| E8 | More than one stable answer | Every distinct stable payout outcome is reported, and the point is flagged `multiple_equilibria`. A breakpoint is also logged wherever the set of outcomes changes. Millrace has none. | Fixed (`SPEC.md`) | Default (item 14) |
| E9 | Reporting granularity | `expected.json` records payouts by holder × security, e.g. Harbor Lane's Seed and its Series A as separate lines. Holder and class totals are derived from those lines. Classes are: common, options by strike, each preferred series, and each shadow series. Converted preferred stays under its original class. | Fixed | Confirmed (item 15) |
| E10 | Breakpoint precision | Each breakpoint is given to the cent (half-up), with its exact fraction alongside. | Fixed | New |
| E11 | Series that must convert together: how the group decides | The group converts when converting pays its members more **in total** than keeping their preferences. This is the per-series greater-of test applied to the group's combined payout. A member can end up worse off than it would be alone. In edge case 6b, Seed-2 gets $2.5M at $25M instead of its $3M preference. | The group itself is the `SPEC.md` toggle. The decision rule is fixed for now; an alternative would be a majority vote, with each holder voting its own interest. | New |
| E12 | Warrant for preferred | Exercised warrant shares become shares of that series. They carry its per-share preference (the series' original issue price × multiple, not the strike), participation, cap, and conversion, and they convert with the series. The warrant is exercised when the shares it buys are worth more than the strike, and the strike cash is added to proceeds. Its payout is reported net of strike on its own holder × security line. | Fixed | New |
| E13 | Payouts that jump | `SPEC.md` defines a breakpoint as a slope change. A conversion group (E11) can make some members' payouts jump instead. A jump is reported as a breakpoint flagged `payouts_jump`, located where the decision-maker is indifferent. At that exact exit value both outcomes are stable, so both are reported and the point is flagged `multiple_equilibria`. | Fixed | New |

## Edge cases (applied in M1b)

| ID | Question | Default | Toggle? | Status |
|---|---|---|---|---|
| X1 | Unconverted post-money SAFE at a Liquidity Event (case 12) | Follow the YC Liquidity Event and Liquidity Capitalization text literally. M1b will quote the text in that case's `DERIVATION.md` and check the claim that SAFEs and preferred taking cash-out or preference payments are excluded from Liquidity Capitalization. | Fixed | Confirmed (item 16), to be checked against the text |
| X2 | Cumulative dividends (case 9) | Simple interest, Actual/365 day count, and a fixed exit date in `inputs.json`. | Rate type is a toggle (`SPEC.md`) | Default (item 17) |
| X3 | Convertible note at exit (case 13) | Simple interest at Actual/365. The holder takes the greater of 2× (principal + interest) or conversion at the cap. Those terms are written into the inputs. | Terms are inputs | Default (item 18) |

## Case file conventions

| ID | Question | Default |
|---|---|---|
| C1 | Exact numbers in JSON | Strings: an integer, a terminating decimal, or `"a/b"` when the decimal repeats. `approx` fields are for reading only; tests use the exact fields. |
| C2 | Millrace's exit cap table | `inputs.json` builds Millrace from its events. Its `exit.cap_table_after_event` points at the post–Series B table in `expected.json` → `cap_tables`, which is the M2 exit input. In M4, building from the rounds must reproduce that table exactly. |
| C3 | Edge case folders | `cases/edge-NN-<name>`, numbered as in `SPEC.md`'s list. A case with variants gets one folder per variant (`edge-05a-stacked`, `edge-05b-pari-passu`), each with its own inputs and identical except for the one changed term. |
| C4 | New cap table fields | `conversion_groups`: a list of series groups that must convert together (E11). Warrant securities: `"kind": "warrant"`, a `strike`, and an `underlying`, which is `"common"` or a preferred series ID (E12). |
