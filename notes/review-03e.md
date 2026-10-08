# Review: 03e (engine: the carve-out on the sale, 12i and 13h, and the wording)

Branch `03e-engine`. The first engine PR of 0.3.0. The engine now runs three of the cases you re-derived in 03a, payouts and breakpoints:
- **24:** a carve-out given on the sale.
- **12i:** a SAFE with no cap beside capped participating preferred.
- **13h:** the same with a note.

It also uses your 03a wording. No case changed: the `cases/` rule is back on, and this PR doesn't touch `cases/`.

11b was already in the engine since 03a, and needed nothing more.

## What changed

### The carve-out as a term of the sale (your answer 1)

- **The exit input takes `carve_out`,** beside `exit_date` and `payment_schedules`, in the same fields as the cap table's. It works on any cap table, one built from rounds included, which is case 24.
- **On both the cap table and the exit:** refused with an `InputError`: "the carve-out is on both the cap table and the exit; give it once". The reference's words are the same.
- **It's read exactly as one on the cap table:**
  - the same checks
  - its recipients must be holders
  - a note at the sale beside it is still refused (X12)
  - it's then paid exactly as one on the cap table
- **The page** doesn't use it yet. It keeps the Exit terms card's carve-out beside the events (file version 4) until 03i moves it to the sale (version 5).

### A SAFE or note with no cap beside capped participating preferred (12i, 13h; X9, X12)

The engine had solved the conversion's shares as if the whole residual were shared at one price. A capped series stopping at its cap breaks that, which is why it refused. It now does what the reference does since 03a:
- **Converting is worth exactly** amount ÷ (1 − discount), and it takes that out of what is left after the preferences first.
- **The rest is shared,** the capped series stopping at its cap.
- **Its shares,** for the report, are amount ÷ ((1 − discount) × the price the rest is shared at).

**With no capped series, this gives the same answer as before.** The two formulas are algebraically equal, and every earlier case still matches to 30 digits.

**A unit test shows where they differ:**
- **The company:** 1,000,000 common; a 1,000,000-share Seed at $1.00, participating and capped at 2x; and a $100,000 SAFE at a 20% discount with no cap.
- **At $3,500,000:**
  - the SAFE takes **$125,000**
  - the Seed stops at **$2,000,000**
  - common gets **$1,375,000**
- **The old formula** would have paid the SAFE $142,857.14.

A second test checks the same for a note.

### The wording (your 03a review)

At 12i's $4,250,000 and 13h's $4,400,000, the switch reason now says the conversion needs room in **"what is left after the preferences"**, wherever there is preferred stock. With no preferred it still says "what is left for common and the SAFE" (or the note), as in 12c and 13e. A test pins both breakpoints.

### Also fixed: `pnpm payouts`

The script crashed with a `TypeError` on every case with a carve-out, a SAFE or a note at the sale, since M5f. It named each payout line's security from the cap table's securities, and those three aren't securities. It now names them "Management carve-out", "SAFE (id)" and "Convertible note (id)". The engine itself was never affected; only this review script was.

## How to check it by behavior

Run these from the repo:

```bash
pnpm payouts edge-24-carve-out-on-the-sale 10000000
```

At $10,000,000 the Seed takes its $3,000,000 preference after Manager M's $1,000,000, and the founders split $6,000,000 at $0.75 a share. Every line matches `expected.json`.

```bash
pnpm payouts edge-12i-discount-safe-with-capped-participation 10000000
```

Investor Z's SAFE gets **$1,250,000**, its $1,000,000 ÷ 0.8.

```bash
pnpm payouts edge-13h-discount-note-with-capped-participation 34400000
```

The note gets **$1,400,000**, its $1,120,000 ÷ 0.8, and the Seed stops at its $9,000,000 cap.

```bash
pnpm breakpoints edge-12i-discount-safe-with-capped-participation
```

It lists the case's four breakpoints, $4,000,000, $4,250,000 (where payouts jump), $34,250,000 and $46,250,000, and says they match `expected.json`. The reason at $4,250,000 reads "what is left after the preferences".

## Decisions I made, for you to check

1. **The exit's carve-out is merged into the cap table when the input is read.** Everything downstream (`prepare`, `payout`, `findBreakpoints`, `paySchedule`) sees one carve-out, as before. So `readExit(...).capTable.carveOut` holds it, wherever it was given. The input doesn't record where it came from; the page will need that in 03i, and it can tell from its own file.
2. **A note at the sale beside an exit carve-out** is refused as `note_with_safe_or_carve_out`, the same refusal as for one on the cap table.

## Also in this PR

- **`docs/ASSUMPTIONS.md`:**
  - **A new "Later" section:** the list you've been referring to. It holds R25's two refusals and R17's possible toggle, each pointing to its assumption. The engine README's "Not settled yet" list stays the user-facing list of what's refused. The new section also holds choices that aren't refusals, like the toggle.
  - **R17:** "new money only" recorded as the default, with the toggle on the later list (your 03d2 answer).
  - **C6, X9, X12** and the owed list: the engine reads these since 03e.
- **The engine README:**
  - the exit's `carve_out`
  - the no-cap rule beside capped participation
  - two items removed from the refusal list
  - *(0.3.0)* marks
- **`notes/release-0.3.0.md`, started:**
  - what's new in 03e
  - the changed wording
  - your sentence on 16i, under 03h
  - what's to come

## The tests

- **Engine:** **1,459 tests pass**, 67 more. 24, 12i and 13h run through every exit test: payouts at every listed value, breakpoints, reasons, and inputs.
- **What replaced the refusal tests:** the two hand-checked payout tests, four `exit.carve_out` tests, and the wording test.
- **Dashboard:** **310 tests pass.** 12i and 13h now open as files with the case's payouts, in place of the two refusal tests.
- **Reference:** 54 unit tests pass, and all 75 cases match. Unchanged.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.**

## Assumptions added

**No new IDs.** R17, C6, X9 and X12 updated, and the "Later" section added.

## Open questions

None. Next is 03f: the warrant on a curve (8b). I'm stopping here.
