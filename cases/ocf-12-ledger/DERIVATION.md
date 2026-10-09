# OCF case 12, Quillfern Labs' ledger: derivation

A fictional company, written by hand as an OCF 1.2 package as of **Dec 31, 2025** (`package/`). Its 34 transactions cover five years:
- the founders' stock split 2 for 1
- a stock plan whose options are granted, exercised, cancelled back into the pool and repriced
- a SAFE converting in the Seed
- a down-round Series A that lowers the Seed's conversion price
- a retraction, a repurchase and two transfers

Case 01 tests reading and leaves terms blank. This one settles every term, so its import can be paid. The import is **edge case 25's cap table**, so edge case 25's payouts and breakpoints, from the reference, are this import's too (C16). From 04d the engine imports this package and pays it at edge case 25's exit values.

## The ledger, in date order

| Date | Transactions | What happens | What it leaves |
|---|---|---|---|
| Jan 15, 2021 | tx-01, tx-02 | Founder A 3,000,000 common (`cs-a1`), Founder B 2,000,000 (`cs-b1`) | |
| Mar 1, 2021 | tx-03 | Employee C 400,000 common (`cs-c1`) | |
| Mar 1, 2021 | tx-04 | Employee D 400,000 common (`cs-d0`) | |
| Mar 8, 2021 | tx-05 | `cs-d0` retracted: entered in error | void, as if never issued (O5). The split doesn't touch it. |
| Sep 1, 2021 | tx-06 | common splits 2 for 1 | `cs-a1` 6,000,000, `cs-b1` 4,000,000, `cs-c1` 800,000. There are no options, warrants or preferred yet, so the split is read (O5). No reissuance: the securities are multiplied in place. |
| Oct 1, 2021 | the plan | the 2021 Stock Plan reserves 1,000,000; cancelled grants return to the pool | |
| Oct 1, 2021 | tx-07 to tx-09 | options at $0.10: C 100,000 (`opt-c1`), D 200,000 (`opt-d1`), E 150,000 (`opt-e1`) | |
| Feb 1, 2022 | tx-10 | Angel S's SAFE: $250,000, a 20% discount, no cap, an exit multiple of 1 | |
| Aug 1, 2022 | tx-11 | the pool rises to 2,000,000 | |
| Aug 1, 2022 | tx-12 | the Seed: Seed Fund T 2,500,000 at $1.20 (`ps-t1`) | |
| Aug 1, 2022 | tx-13, tx-14 | the SAFE converts: Angel S 260,416 Seed at $0.96 (`ps-s1`) | $250,000 ÷ $0.96 = 260,416.67, rounded down. The SAFE is closed. |
| Nov 15, 2022 | tx-15 | D 300,000 options at $0.40 (`opt-d2`) | |
| Mar 1, 2023 | tx-16 | 100,000 of `opt-e1` cancelled, unvested when E left | No balance security, so `opt-e1` keeps the other 50,000 (O5, O6). The 100,000 return to the pool. |
| Apr 15, 2023 | tx-17, tx-18 | E exercises `opt-e1`'s 50,000: E 50,000 common (`cs-e1`) | `opt-e1` closed |
| Jun 1, 2023 | tx-19 | `opt-d2` repriced from $0.40 to $0.25 | |
| Sep 1, 2023 | tx-20 to tx-22 | A transfers 500,000 of `cs-a1` to Trust V (`cs-v1`); the balance is `cs-a2`, 5,500,000 | `cs-a1` closed. It reconciles after the split: 6,000,000 − 500,000 = 5,500,000. |
| Dec 1, 2023 | tx-23 | 200,000 of `cs-c1` repurchased | No balance security, so `cs-c1` keeps 600,000. |
| Feb 1, 2024 | tx-24, tx-25 | C exercises `opt-c1`'s 100,000: C 100,000 common (`cs-c2`) | `opt-c1` closed |
| May 1, 2024 | tx-26 | the pool rises to 3,000,000 | |
| May 1, 2024 | tx-27, tx-28 | the Series A at $1.00: Fund U 3,000,000 (`pa-u1`), Seed Fund T 500,000 (`pa-t1`) | a down round from the Seed's $1.20 |
| May 1, 2024 | tx-29 | the Seed's conversion price falls to $1.00, a ratio of 6 for 5 | $1.20 ÷ $1.00 = 1.2 = 6 ÷ 5 exactly (O4) |
| Aug 1, 2024 | tx-30, tx-31 | options at $0.25: C 400,000 (`opt-c3`), F 120,000 (`opt-f1`) | |
| Jan 31, 2025 | tx-32 | all of `opt-f1` cancelled: F left before the one-year cliff | The 120,000 return to the pool. F holds nothing. |
| Mar 1, 2025 | tx-33, tx-34 | Seed Fund T transfers 300,000 of `ps-t1` to Fund U (`ps-u1`) | No balance security, so `ps-t1` keeps 2,200,000. |

## What's outstanding on Dec 31, 2025

| Holder | Securities | In the cap table |
|---|---|---|
| Founder A | `cs-a2` 5,500,000 | common 5,500,000 |
| Founder B | `cs-b1` 4,000,000 | common 4,000,000 |
| Employee C | `cs-c1` 600,000 and `cs-c2` 100,000; `opt-c3` 400,000 at $0.25 | common 700,000; $0.25 options 400,000 |
| Employee D | `opt-d1` 200,000 at $0.10; `opt-d2` 300,000 at $0.25 | $0.10 options 200,000; $0.25 options 300,000 |
| Employee E | `cs-e1` 50,000 | common 50,000 |
| Employee F | nothing | **left out, and listed** (O3) |
| Angel S | `ps-s1` 260,416 | Seed 260,416 |
| Seed Fund T | `ps-t1` 2,200,000; `pa-t1` 500,000 | Seed 2,200,000; Series A 500,000 |
| Fund U | `ps-u1` 300,000; `pa-u1` 3,000,000 | Seed 300,000; Series A 3,000,000 |
| Trust V | `cs-v1` 500,000 | common 500,000 |

**Totals:** common 10,750,000; Seed 2,760,416; Series A 3,500,000; options 200,000 at $0.10 and 700,000 at $0.25.

## Classes (O4, O6)

| Class | What OCF gives | In the cap table |
|---|---|---|
| Common Stock | common | `common` |
| Seed Preferred | $1.20; 1x; participation cap 1; converts at $1.20, 1 for 1, then $1.00, 6 for 5 (tx-29); seniority 2 | `seed`: issue price $1.20, conversion price **$1.00**, 1x, **non-participating** (a cap equal to the preference) |
| Series A Preferred | $1.00; 1x; participation cap 2.5; converts at $1.00, 1 for 1; seniority 3 | `series_a`: participating, **capped at 2.5x**, the cap including the preference (E7) |
| Seniority 3 ahead of 2 | | tiers `[series_a]`, then `[seed]` |
| Grants by exercise price | | `options_0.1` "Options ($0.1 strike)", `options_0.25` "Options ($0.25 strike)". D's `opt-d2` joins the $0.25 class from its repricing; no grant is left at $0.40. |

## The pool (O6)

The plan returns cancelled grants to the pool.

| | Shares |
|---|---:|
| Reserved: the last adjustment's total | 3,000,000 |
| − outstanding grants: 200,000 + 300,000 + 400,000 | 900,000 |
| − delivered by exercise: E's 50,000 and C's 100,000 | 150,000 |
| − cancelled and not returned | 0 |
| **Unissued pool** | **1,950,000** |

**Check:** 1,270,000 were granted in all. 220,000 came back (E's 100,000 and F's 120,000), so 1,050,000 are used, and 3,000,000 − 1,050,000 = 1,950,000. The pool is never negative along the way: the most ever used is 1,170,000, after the August 2024 grants, against 3,000,000 reserved.

## The report

- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Terms to fill in:** none.
- **Notes:**
  - one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date
  - convertible seniority ignored, since there's one SAFE
  - for the Seed and Series A each:
    - no anti-dilution field. The Seed's reset to $1.00 is carried in its conversion price; the clause that caused it isn't.
    - the cap read as including the preference
    - conversion rounding not modeled
  - Angel S's 260,416 Seed issued at $0.96 against the class's $1.20 (`issued_at_other_price`, O5). The page will say: "Angel S's 260,416 Seed Preferred were issued at $0.96 but carry Seed Preferred's $1.20 preference. If they should be a separate series with a lower preference (as a SAFE's shares often are), set that up in the editor."
  - Employee F left out, with nothing outstanding.
