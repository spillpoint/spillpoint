# Review: M5 (the remaining exit terms)

M5 is complete with M5l. It set out to add the remaining exit terms, in the engine and on the page:
- warrants
- cumulative dividends
- management carve-outs
- escrow and earnouts
- SAFEs and notes still outstanding at a sale

It also took on the six SAFE and note exit cases owed before it (X9, X12), and X8's payment warning. All of that is done:
- **The engine** pays every term, released as **spillpoint 0.2.0**, which you published.
- **The page** shows every term the engine pays, and refuses nothing it pays.

Each PR has its own review note, with its figures and how to check them. This note is the whole of M5 in one place.

## The PRs

| PR | What it did |
|---|---|
| **The cases** | |
| M5a (#26) | The six owed cases for SAFEs and notes at a sale: a cap and a discount, a discount only, alongside preferred (12b–12d, 13d–13f). |
| M5b (#27) | More SAFE and note cases: a SAFE ranking with Series A (12e), two SAFEs (12f), a pre-money SAFE (12g), an MFN SAFE (12h), two notes (13g). |
| M5c (#28) | Compounding dividends (9b), dividends paid on conversion (9c), a carve-out alongside the preferences (10b), warrants issued in a round (22). |
| M5e2 (#31) | Dividends from a round (23). |
| **The engine** | |
| M5d (#29) | Warrants, for common or a preferred series, and the "Warrants issued" event (R29). |
| M5e (#30) | Cumulative dividends: simple or compounding, and forfeited or paid on conversion (X2, X5). |
| M5e3 (#32) | A round's dividends, from its date (R30). |
| M5f (#33) | Carve-outs, with the curved payouts an alongside carve-out makes (X7, X17). |
| M5g (#34) | SAFEs at a sale (X9, X13, X14, X16). |
| M5h (#35) | Notes at a sale (X12, X15). |
| M5i (#36) | Escrow and earnouts, as `paySchedule`, which names any holder a payment lowers (X8). |
| M5j (#37) | Release 0.2.0. |
| **The page** | |
| M5k (#38) | SAFEs and notes at a sale, the sale's date, and your rounds-editor items. |
| M5k2 (#39) | Warrants and cumulative dividends. |
| M5k3 (#40) | Carve-outs, curved payouts, and the X17 "For you" wording. |
| M5l | The Exit terms card, for cap tables entered directly and built from rounds, and Paid over time with X8's warning. |

## How to check M5 by behavior

1. **The cases.** Each prints whether every exit value matches `expected.json`:

   ```bash
   pnpm payouts edge-11-earnout --all
   ```

   **All 61 cases** match the reference calculator, which works them out its own way: a brute-force search over every decision. **16 are new in M5:** 9b, 9c, 10b, 12b–12h, 13d–13g, 22 and 23. You re-derived each before it was locked.
2. **The published package.** 0.2.0's README has three worked examples, the third an earnout. Its tests run each one, and each prints exactly what the README shows. You checked the packed build before publishing.
3. **The page, end to end.** Each of these is a click-through test, and each was in its PR's review note:
   - **A founder, a note and a round,** from a blank company: the payouts follow each event (M5k).
   - **Cases 12, 13a, 8, 9 and 10b, typed in on the Cap table tab:** each pays what its locked case expects at every listed exit value. 10b's curved values are included (M5k–M5k3).
   - **Case 10b's "For you" lines:** your approved X17 wording, word for word (M5k3).
   - **A carve-out on Millrace, built from its rounds:** it survives a change to the rounds and a save (M5l).
   - **Case 6b's company with a $29M closing and a $2M earnout:** the warning, and your M5i figures (M5l).
4. **Files.** Every case with a SAFE, a note, a warrant, dividends, a carve-out or a payment schedule opens as a saved file. Each gives the engine exactly the case's input, and saving it again writes the same file. Versions 1 to 3 still open; new files are version 4.

## The numbers

| | End of M4 | End of M5 |
|---|---|---|
| Engine (Vitest) | 625 | 1,304 |
| Dashboard (Vitest) | 169 | 288 |
| Reference unit tests (Python) | 33 | 47 |
| Locked cases | 45 | 61 |
| Published engine | 0.1.0 | 0.2.0 |

## Assumptions added in M5

All confirmed by you:
- **X13 to X17:**
  - X13: several SAFEs at a sale
  - X14: a pre-money SAFE at a sale
  - X15: several notes
  - X16: a strict tie rule for a SAFE or note that's indifferent
  - X17: curved payouts. Your "For you" wording is in it, with the curve-above line confirmed in the M5k3 review.
- **R29:** warrants count like options.
- **R30:** a round's dividends, from its date.
- **C15:** the warrants event.

Updated along the way: X1–X12, C5–C9, C12 and C13. C13 is the saved file, now version 4.

## Decisions you made in M5 that the code now follows

- **The "Exit terms" card** (M5 plan, item 13): the sale's terms, editable on a cap table built from rounds (M5l).
- **The payment view** (item 14): the slider and curves stay on the price in all (M5l).
- **The page refuses what it can't show in full** (M5d review): a security kind it doesn't know, or a term it doesn't carry. Since M5l no term the engine pays is left to refuse.
- **No default sale date.** You approved this in the M5k review, over the plan's "today".
- **`"M5"` stays in `Milestone`** for 0.1.0 code: deprecated, to be removed at 1.0 (M5j).

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/` in all of M5.
- **Outside the sandbox:** you gave standing permission for `pnpm screenshots` only, in the M5k2 review. Everything else still asks.

## Still open

**Owed before release** (`docs/ASSUMPTIONS.md`): terms the engine refuses with a clear error, each needing its case first:
1. **A post-money SAFE converting alongside notes or pre-money SAFEs** in one round (R24).
2. **SAFEs or notes converting in a round that triggers anti-dilution** (R25).
3. **A pay-to-play round that also converts SAFEs or notes** (R17–R22).
4. **A SAFE or note with no cap alongside capped participating preferred** (X9, X12).
5. **A warrant for a series in a tier the carve-out shares,** coming into the money on the curve (X17).
6. **Case 11b:** an earnout that crosses a group-conversion jump, with a negative take (X8). The page's test already uses its figures; the locked case doesn't exist yet.

**From M5l:**
1. **Should the engine take a carve-out as an exit term?** (`exit.carve_out`, for 0.3.0.)

**Left out of M5, as you asked:**
1. **The blank-fields polish:** mark every blank field of a new event at once.

**Not yet planned:**
1. **M6:** reading Open Cap Format files.
2. **No engine release is waiting.** Since 0.2.0 the engine's source has changed by one comment. The page runs the engine's sources, so it never waits for a release.

I'm stopping here.
