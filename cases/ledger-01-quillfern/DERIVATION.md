# Ledger case 01, Quillfern Labs: derivation

Quillfern Labs is fictional. OCF case 12 (`ocf-12-ledger`) writes its five years as 34 OCF transactions, and its import is edge case 25's cap table. This case records the same five years as a ledger (`docs/ASSUMPTIONS.md` L1 to L22): 18 dated events, with the company, its holders and its plan.

`expected.json` gives, for each event:
- the cap table after it (L21)
- what it moved, lot by lot (L22), and the pool's change
- its warnings (L15)

It's worked here by hand (C21); the reference doesn't read ledgers yet.

**The last table is edge case 25's cap table** (`locked_case`): every holder, class, position, the seniority and the pool, in edge case 25's own order too. So edge case 25's payouts and breakpoints, from the reference, are this ledger's.

## The company and its plan

From OCF case 12's package, and the papers a founder has:
- **The company:** Quillfern Labs, Inc., a Delaware corporation incorporated on Jan 15, 2021 (the package's formation date), with a $0.00001 par value.
- **Authorized shares:** 30,000,000 common, the package's. The Seed's 4,000,000 and Series A's 5,000,000, also the package's, come with each round's series (L16).
- **Holders:** ten, each a person or an organization as the package's stakeholders are (L20). Employee F is among them, though F ends with nothing.
- **The plan:** the 2021 Stock Plan, under which cancelled grants go back to the pool (`returns_to_pool`, the package's `RETURN_TO_POOL`). It reserves 1,000,000 on Oct 1, 2021, the package's board approval date, and is raised to 2,000,000 at the Seed and 3,000,000 at the Series A.

## The ledger

Lots keep OCF case 12's security ids, so each can be followed there.

| # | Date | Event | What it records | Moves | Pool change | Pool after |
|---:|---|---|---|---|---:|---:|
| 1 | Jan 15, 2021 | `founders` | Founder A 3,000,000 common, Founder B 2,000,000 | `cs-a1` +3,000,000; `cs-b1` +2,000,000 | | 0 |
| 2 | Mar 1, 2021 | `employee_c_stock` | Employee C 400,000 common | `cs-c1` +400,000 | | 0 |
| 3 | Sep 1, 2021 | `split` | common splits 2 for 1 | `cs-a1` +3,000,000 to 6,000,000; `cs-b1` +2,000,000 to 4,000,000; `cs-c1` +400,000 to 800,000 | | 0 |
| 4 | Oct 1, 2021 | `plan_adopted` | the plan reserves 1,000,000 | | +1,000,000 | 1,000,000 |
| 5 | Oct 1, 2021 | `first_grants` | options at $0.10: C 100,000, D 200,000, E 150,000 | `opt-c1` +100,000; `opt-d1` +200,000; `opt-e1` +150,000 | −450,000 | 550,000 |
| 6 | Feb 1, 2022 | `safe_s` | Angel S's SAFE: $250,000, no cap, a 20% discount | `safe-s1` +$250,000 | | 550,000 |
| 7 | Aug 1, 2022 | `seed` | the Seed, recorded at $1.20; the plan to 2,000,000 | `ps-t1` +2,500,000; `safe-s1` −$250,000, closed; `ps-s1` +260,416 | +1,000,000 | 1,550,000 |
| 8 | Nov 15, 2022 | `grant_d2` | D 300,000 options at $0.40 | `opt-d2` +300,000 | −300,000 | 1,250,000 |
| 9 | Mar 1, 2023 | `cancel_e1` | 100,000 of E's grant cancelled | `opt-e1` −100,000 to 50,000 | +100,000 | 1,350,000 |
| 10 | Apr 15, 2023 | `exercise_e1` | E exercises its 50,000 | `opt-e1` −50,000 to 0; `cs-e1` +50,000 | | 1,350,000 |
| 11 | Jun 1, 2023 | `reprice_d2` | D's $0.40 grant repriced to $0.25 | `opt-d2` −300,000 at $0.40, +300,000 at $0.25 | | 1,350,000 |
| 12 | Sep 1, 2023 | `transfer_a_v` | Founder A transfers 500,000 to Trust V | `cs-a1` −500,000 to 5,500,000; `cs-v1` +500,000 | | 1,350,000 |
| 13 | Dec 1, 2023 | `repurchase_c1` | 200,000 of C's common repurchased | `cs-c1` −200,000 to 600,000 | | 1,350,000 |
| 14 | Feb 1, 2024 | `exercise_c1` | C exercises its 100,000 | `opt-c1` −100,000 to 0; `cs-c2` +100,000 | | 1,350,000 |
| 15 | May 1, 2024 | `series_a` | the Series A, recorded at $1.00; the plan to 3,000,000; the Seed's conversion price to $1.00 | `pa-u1` +3,000,000; `pa-t1` +500,000 | +1,000,000 | 2,350,000 |
| 16 | Aug 1, 2024 | `grants_c3_f1` | options at $0.25: C 400,000, F 120,000 | `opt-c3` +400,000; `opt-f1` +120,000 | −520,000 | 1,830,000 |
| 17 | Jan 31, 2025 | `cancel_f1` | all of F's grant cancelled | `opt-f1` −120,000 to 0 | +120,000 | 1,950,000 |
| 18 | Mar 1, 2025 | `transfer_t_u` | Seed Fund T transfers 300,000 Seed to Fund U | `ps-t1` −300,000 to 2,200,000; `ps-u1` +300,000 | | 1,950,000 |

**What each line follows:**
- **The split** (3) multiplies every lot of common: there are no options, warrants, SAFEs, notes, preferred or plan reserve yet, so nothing else would need adjusting (L10).
- **A grant** draws on the pool (4 to 5, 8, 16). A cancellation returns its shares, since the plan says so (9, 17; L6).
- **An exercise** (10, 14) turns options into common in a new lot. The pool doesn't move: the shares go from outstanding grants to delivered, both counted against the plan (L5).
- **The repricing** (11) moves `opt-d2` from the $0.40 class to the $0.25 class (L7). No grant is left at $0.40, so that class leaves the table (L21).
- **The repurchase** (13) is of `cs-c1`, issued in March 2021, before the plan: not plan stock, so the 200,000 are retired and the pool doesn't move (L8).
- **A transfer** (12, 18) moves part of a lot into a new one for its new holder. The rest stays in the old lot: Founder A's 5,500,000 stay in `cs-a1`, where OCF closed it and wrote the balance as `cs-a2` (L3, L9).

## The pool

The plan returns cancelled grants (L4). After the last event:

| | Shares |
|---|---:|
| Reserved: the Series A's new total | 3,000,000 |
| − grants outstanding: D's 200,000 at $0.10, D's 300,000 and C's 400,000 at $0.25 | 900,000 |
| − delivered by exercise: E's 50,000 and C's 100,000 | 150,000 |
| − cancelled and not returned | 0 |
| **Unissued pool** | **1,950,000** |

**Check, event by event:** the pool after each event in the ledger's table adds its pool changes: 1,000,000 − 450,000 + 1,000,000 − 300,000 + 100,000 + 1,000,000 − 520,000 + 120,000 = 1,950,000. It's never short: the most the plan ever has out is 1,170,000, after event 16, against 3,000,000 reserved. So there's no `over_pool`.

## The rounds, as recorded

### The Seed (event 7)

**What's recorded:**
- the series, 1x non-participating, no anti-dilution, 4,000,000 authorized
- $1.20 a share, the purchase agreement's price
- Seed Fund T's $3,000,000 for 2,500,000 shares (`ps-t1`)
- Angel S's SAFE converting into 260,416 Seed (`ps-s1`)
- the plan's new total, 2,000,000

**The table:** the Seed's issue and conversion price are both the stated $1.20 (L13). The SAFE's shares go into the Seed itself, as recorded, not into a series of their own.

**The check at $1.20** (L14):
- **Seed Fund T:** $3,000,000 ÷ $1.20 = 2,500,000, as recorded.
- **Angel S's SAFE:** no cap, so its price is its discount price, $1.20 × (1 − 20%) = $0.96. $250,000 ÷ $0.96 = 260,416.67, rounded down to 260,416, as recorded.
- **Nothing else to compare:** no pool target or pre-money is given, and there's no earlier series.

So there's no `recorded_differs`.

**Its warning, `conversion_preference_above_price`,** subject `ps-s1`. The 260,416 shares are in the Seed, whose preference is $1.20 × 1 = $1.20 a share, above the $0.96 the SAFE converted at (L14). These are O5's report line's facts, in the ledger's wording:

> Angel S's 260,416 Seed Preferred, from its SAFE, were issued at $0.96 a share but carry Seed Preferred's $1.20 preference. A SAFE's shares often go into a series of their own, with a preference at the price they converted at. If these did, record that series in the round.

### The Series A (event 15)

**What's recorded:**
- the series: 1x, participating with a 2.5x cap, no anti-dilution, 5,000,000 authorized, senior to the Seed
- $1.00 a share
- Fund U's $3,000,000 for 3,000,000 shares (`pa-u1`), and Seed Fund T's $500,000 for 500,000 (`pa-t1`)
- the plan's new total, 3,000,000
- the Seed's conversion price after the round, $1.00

**The table:** Series A at $1.00 issue and conversion price, the seniority `[series_a]` then `[seed]`, and the Seed's conversion price $1.00. The Seed's issue price stays $1.20, so its preference doesn't change: each Seed share now converts into $1.20 ÷ $1.00 = 1.2 common.

**The check at $1.00:**
- **The purchases:** $3,000,000 ÷ $1.00 = 3,000,000 and $500,000 ÷ $1.00 = 500,000, as recorded.
- **The Seed's conversion price:** the Seed has no anti-dilution, so working the round out leaves it at $1.20. Its recorded $1.00 is therefore not a difference but its own warning (L14).

**Its warning, `conversion_price_without_anti_dilution`,** subject `seed`. These are R31's words, for a ledger:

> Seed Preferred's conversion price is recorded as falling from $1.20 to $1.00 in this round, but Seed Preferred has no anti-dilution recorded. A conversion price usually changes in a round only under the series' anti-dilution. If its charter gives it some, record it.

## No other warning

Each other code, and why it doesn't apply:
- `undated_event`: every event has a date.
- `over_pool`: the pool is never short (above).
- `over_authorized`:
  - **Common:** the most counted against its 30,000,000 is 20,412,499.2, after event 15: common 10,750,000 + options 500,000 + the pool 2,350,000 + the Seed as converted, 2,760,416 × 1.2 = 3,312,499.2, + Series A 3,500,000. Events 16 to 18 move shares between the pool and options, or between holders, so the total stays 20,412,499.2.
  - **The Seed:** 2,760,416 of its 4,000,000 authorized.
  - **Series A:** 3,500,000 of 5,000,000.
- `no_authorized`: common's, the Seed's and Series A's are all given.
- `safe_without_cap_or_discount`: Angel S's SAFE has a discount.
- `mfn_later_terms`: no SAFE is marked MFN, and there's no later SAFE.
- `not_converted_in_round`: the one SAFE converts in the Seed; no note.
- `worked_out_round`: both rounds are recorded.
- `recorded_differs`: none, by both checks above.
- `grant_past_expiry`: the tables after each event don't apply expiry, and every grant expires after 2030 (L18).
- `note_past_maturity`: no notes.

## The tables

Each table lists the holders holding something after its event, the classes in use, the seniority, each holder's positions (the sum of their lots in each class), the unissued pool, and Angel S's SAFE while it's outstanding (L21). In each line below, a holder's positions read common, then the Seed, Series A, and the options by strike.

| After | Positions | Pool |
|---:|---|---:|
| 1 | A 3,000,000 common; B 2,000,000 | 0 |
| 2 | A 3,000,000; B 2,000,000; C 400,000 | 0 |
| 3 | A 6,000,000; B 4,000,000; C 800,000 | 0 |
| 4 | as 3 | 1,000,000 |
| 5 | A 6,000,000; B 4,000,000; C 800,000 and 100,000 at $0.10; D 200,000 at $0.10; E 150,000 at $0.10 | 550,000 |
| 6 | as 5, and Angel S's $250,000 SAFE outstanding | 550,000 |
| 7 | as 5; S 260,416 Seed; T 2,500,000 Seed. The SAFE is gone. | 1,550,000 |
| 8 | as 7, and D 300,000 at $0.40 | 1,250,000 |
| 9 | as 8, but E 50,000 at $0.10 | 1,350,000 |
| 10 | as 9, but E 50,000 common in place of its options | 1,350,000 |
| 11 | as 10, but D's 300,000 at $0.25, not $0.40 | 1,350,000 |
| 12 | as 11, but A 5,500,000; and V 500,000 common | 1,350,000 |
| 13 | as 12, but C 600,000 common | 1,350,000 |
| 14 | as 13, but C 700,000 common and no options; D 200,000 at $0.10 and 300,000 at $0.25 | 1,350,000 |
| 15 | as 14; T 500,000 Series A beside its 2,500,000 Seed; U 3,000,000 Series A | 2,350,000 |
| 16 | as 15; C 400,000 at $0.25; F 120,000 at $0.25 | 1,830,000 |
| 17 | as 16, without F | 1,950,000 |
| 18 | as 17, but T 2,200,000 Seed; U 300,000 Seed beside its 3,000,000 Series A | 1,950,000 |

**Holders in each table:**
- A and B from event 1, C from 2.
- D and E from 5, both holding options.
- Angel S from 6, by its SAFE, and then by its Seed.
- T from 7, V from 12 and U from 15.
- F only in event 16's table: after event 17, F holds nothing, as OCF case 12's import leaves F out (O3).

**Classes in each table:**
- Common throughout.
- The $0.10 options from event 5.
- The Seed from 7 and Series A from 15.
- The $0.40 options in events 8 to 10 only.
- The $0.25 options from 11.

**Seniority:** none until the Seed, then `[seed]`, then `[series_a]` above `[seed]` from 15.

**After event 18, against edge case 25:**

| Holder | Here | Edge case 25 |
|---|---|---|
| Founder A | 5,500,000 common | 5,500,000 common |
| Founder B | 4,000,000 common | 4,000,000 common |
| Employee C | 700,000 common (`cs-c1` 600,000, `cs-c2` 100,000); 400,000 at $0.25 | 700,000 common; 400,000 at $0.25 |
| Employee D | 200,000 at $0.10; 300,000 at $0.25 | 200,000 at $0.10; 300,000 at $0.25 |
| Employee E | 50,000 common | 50,000 common |
| Angel S | 260,416 Seed | 260,416 Seed |
| Seed Fund T | 2,200,000 Seed; 500,000 Series A | 2,200,000 Seed; 500,000 Series A |
| Fund U | 300,000 Seed; 3,000,000 Series A | 300,000 Seed; 3,000,000 Series A |
| Trust V | 500,000 common | 500,000 common |
| Unissued pool | 1,950,000 | 1,950,000 |

Its classes and terms are edge case 25's too:
- **The Seed:** $1.20 issue price, $1.00 conversion price, 1x non-participating, no anti-dilution.
- **Series A:** $1.00 and $1.00, 1x participating with a 2.5x cap, no anti-dilution.
- **The options:** "Options ($0.10 strike)" and "Options ($0.25 strike)".
- **Seniority:** `[series_a]`, then `[seed]`.

## What differs from OCF case 12, and why

- **Employee D's 400,000 common, entered on Mar 1, 2021 and retracted a week later** (OCF's `cs-d0`, tx-04 and tx-05), isn't here. A ledger corrects a mistake by deleting the event (`notes/plan-2.0.md`, section 1).
- **No balance lots:**
  - Founder A's transfer leaves the rest in `cs-a1`, where OCF closes it and writes the balance as `cs-a2`.
  - C's repurchase leaves the rest in `cs-c1`, as OCF does too.
  - Seed Fund T's transfer leaves the rest in `ps-t1`, as OCF does too.
- **Each plan increase is inside its round** (`plan_shares_reserved`), where OCF has it as a pool adjustment on the same date (tx-11, tx-26). Recording it as its own `plan_increase` on that date, just before the round, would give the same tables, but for one more event's table between.
- **The Seed's conversion price is recorded in the round** (`conversion_prices`), where OCF has it as a conversion ratio adjustment on the same date (tx-29).
- **The company record and the holders' kinds** come from the package's issuer, stock classes and stakeholders.
