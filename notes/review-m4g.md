# Review: M4g (notes converting in a round)

Branch `m4g-notes`, M4's last engine PR before release prep. **A priced round now converts convertible notes (R23):**
- principal plus simple interest, Actual/365, to the round's date
- at the lower of the cap price and the discount price
- the cap dividing by the base the note names: with the pool, without it, or common only
- each into a "… (from notes)" series, one per conversion price

Cases 19a–19c and 21 now build in full. **With that, all 26 locked round cases build in full and match.** The engine no longer refuses anything with milestone "M4".

**Also in this PR, from your M4f answers:**
- **R27** is confirmed, and now records the other reading.
- **"Owed before release"** gains a pay-to-play round that also converts SAFEs or notes.
- **A pro-rata investment in a pay-to-play round is refused permanently,** with the message you asked for (below).

**Still refused,** with milestone "later", all on "Owed before release":
- a post-money SAFE converting alongside notes or pre-money SAFEs
- SAFEs or notes converting in a down round
- a pay-to-play round that also converts SAFEs or notes

## Run it

```bash
pnpm install && pnpm rounds edge-19a-note-converts-with-pool
```

## What to check by behavior

### 1. One note, three bases (19a–19c)

`pnpm rounds edge-19a-note-converts-with-pool`, and likewise for 19b and 19c. The note is $1,000,000 at 6% for exactly 365 days, so $1,060,000 converts. Its $8,000,000 cap divides by the note's base:

| Case | Base | Base shares | Conversion price | Note shares | Round price |
|---|---|---|---|---|---|
| 19a | with the pool, as before the top-up | 10,000,000 | $0.80 | 1,325,000 | $1.6539440204 |
| 19b | without the pool | 8,500,000 | $0.941176 | 1,126,250 | $1.6880924555 |
| 19c | common only | 8,000,000 | $1.00 | 1,060,000 | $1.6997907950 |

Each prints a line such as:

```
Note note_n: $1,000,000 + $60,000 interest converts at its cap, $0.800000 (with pool base 10,000,000), into 1,325,000 series_a_notes
```

Each one's Series A says "matches expected.json, price matches".

### 2. A note and a pre-money SAFE together (21)

```bash
pnpm rounds edge-21-note-and-pre-money-safe
```

- **The SAFE** converts at its cap, $0.907305, into 1,102,165 shares of "Series A Preferred (from SAFEs)". Its Company Capitalization, 11,021,653.54, counts the pool's increase and not the note (R24).
- **The note** converts at $0.80 into 1,325,000 shares of "Series A Preferred (from notes)". Its base, 10,000,000, counts neither the SAFE nor the increase (R23).

### 3. The pro-rata message in a pay-to-play round

A pro-rata line in a pay-to-play round is now an input error, never accepted:

> Investor P's $400,000.00 is marked pro-rata, but in a pay-to-play round the pay-to-play requirement takes the place of pro-rata. Enter it as an ordinary investment in the same round.

A test checks it word for word.

## How the engine handles notes

**Notes join the SAFEs in the rule-based settling** from M4d:
- **At its cap,** a note adds a fixed number of shares: amount × base ÷ cap.
- **At its discount,** its shares grow with the post-money count, like a SAFE's.
- **Each pass re-decides** each note by comparing its two prices, and a tie goes to the cap.
- **Each solve is still one division.**

## What the tests check

- **All 26 round cases,** every cap table, field by field. 19a–19c and 21 now build in full, and the "refuses …" tests are gone. Each note's conversion is compared:
  - principal, interest and the amount converting
  - its base and base shares
  - cap or discount, and the conversion price, to within one part in 10³⁰
  - its shares and series
- **New tests:**
  - **19a–19c:** each base, conversion price and share count
  - **21:** both conversions, the five securities in order, and no note left outstanding
  - **Two notes at two prices,** one at its cap and one at its discount, with the second series named "(from notes) 2". This is checked against values from the reference calculator.
  - **Interest across a leap day:** 366 days ÷ 365 of a year's interest, $60,164.38 on 6% of $1,000,000.
  - **A converting note in a pro-rata base (R6):** Founder A's 6,000,000 of 8,500,000 + the note's 1,325,000, which is 61.068702%. This is checked against values from the reference calculator.
  - **Refusals:**
    - a round that converts notes without a date
    - a round dated before the note was issued
    - a date that doesn't exist, such as 2024-02-30
    - a note converting in a down round, or in a pay-to-play round
- **Changed:** the pay-to-play pro-rata test now checks your message word for word.

**619 engine tests in all,** 5 more than M4f: 9 new, less the 4 "refuses …" tests for 19a–19c and 21.

## What changed

- **`packages/engine/src/rounds.ts`:**
  - note conversion: the interest, the base, the cap or discount choice, and the series from notes
  - each round's details now include `noteConversions`
  - converting notes now count in the pro-rata base
- **The pay-to-play pro-rata refusal** is now an `InputError` with your message, not "later".
- **`Milestone` (public type)** loses "M4", since nothing is refused for M4 any more. No code reads it.
- **Type exports:** `NoteConversion`, types only.
- **`pnpm rounds`** prints each note's conversion.
- **`docs/ASSUMPTIONS.md`:**
  - **R27** is confirmed, with the other reading.
  - **R6** records the pay-to-play refusal.
  - **"Owed before release"** gains pay-to-play with conversions.
  - **C12** no longer lists round events as refused.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **No changes** to `cases/`.

## Assumptions added

None.

## Decisions I made, for you to check

1. **A note's issue date and the round's date** must be real calendar dates. 2024-02-30 is refused, where until now only the form YYYY-MM-DD was checked.
2. **A round converting notes must have a date.** The error says it's for their interest.
3. **A capped note whose base has no shares to divide its cap by** is refused with an input error, for instance a common-only base with no common stock.

## Open questions

None.

Next is M4h: release prep, meaning the engine README and the version bump to 0.1.0 for you to publish. I'm stopping here.
