# Review: M4 as a whole (rounds)

M4 is done with M4k. CLAUDE.md set it three goals:
- **Model the rounds:** priced rounds, pool top-ups, SAFE and note conversion, pro-rata, anti-dilution and pay-to-play.
- **Rebuild Millrace:** building Millrace from its rounds must reproduce the M1 cap table exactly.
- **Edit the rounds:** a rounds editor in the dashboard.

All three are met. Each PR had its own note (`notes/review-m4a.md` … `review-m4k.md`); this one is the overview.

## What M4 delivers

| PR | What it did |
|---|---|
| M4a (#14) | The eight owed cases: partial pay-to-play (17c, 17d), pay-to-play with anti-dilution (17e, 17f), two series (17g, 17h), pro-rata with a SAFE (18), and the voter indifferent over a range (06d). |
| M4b (#15) | Nine more: notes on each base (19a–19c), a pre-money SAFE (20), a note and a pre-money SAFE (21), the three untested toggles (16e, 16f, 18b), and buying beyond pro-rata (18c). 45 cases in all. |
| M4c (#16) | The engine builds cap tables from events: issues, a percentage issue, the pool, grants, and priced rounds with their top-ups. |
| M4d (#17) | Post-money and pre-money SAFEs, discounts, and pro-rata, with the refusal above the entitlement. |
| M4e (#18) | Anti-dilution: broad-based, narrow-based and full ratchet. **Millrace's exit runs entirely on the cap table built from its ten events.** |
| M4f (#19) | Pay-to-play. |
| M4g (#20) | Convertible notes converting in a round. Every locked round case builds and matches. |
| M4h (#21) | **spillpoint 0.1.0**, which you published: the README's rounds example, and a plain list of everything still refused. |
| M4i (#22) | The dashboard's Rounds tab. Millrace opens from its rounds; save format version 2. |
| M4j (#23) | Editing every field of every event; R28. |
| M4k | Adding, moving and removing events; a blank company; the payouts' event; the phone and keyboard pass. |

## How to check M4 by behavior

1. **The engine against every locked round case:**
   - `pnpm rounds <case>` prints each cap table and says whether it matches `expected.json`. All 26 round cases match, every event, field by field.
   - `pnpm payouts millrace --all` runs Millrace's exit on its built table: 19 of 19 exit values match.
2. **The dashboard:**
   - **Millrace:** opens from its rounds with the same answer as in M3, "At $100M you get $9.75M".
   - **The Rounds tab:** shows each event, what it did to your share, and the cap table after it.
   - **Editing:** every change goes straight to the payouts, with the engine's message next to anything it refuses.
3. **The acceptance test** in `review-m4k.md`: the README's company, built by hand from a blank one, gives the README's numbers.

## How it was kept honest

- **Every number came from three sides:**
  - **By hand:** I worked out each new case with exact fractions, without the reference calculator.
  - **The reference calculator:** extended to the same rules, it matched the hand numbers exactly. It tries every combination of choices in a round and keeps the consistent one.
  - **The engine:** it settles each choice by rule and solves once, a different method.

  You re-derived every case independently before locking it.
- **Your own checks:**
  - you rebuilt Millrace yourself and matched the engine's share counts
  - its exit agreed with your calculator within half a cent at 70 exit values
  - you hand-verified the README's rounds example
- **The dashboard is checked against the locked cases, not against itself.** Millrace's payouts on the page are compared with the locked post–Series B table at every breakpoint. Edits are compared with the engine run independently on the changed case files.
- **Anything not modeled is refused, never skipped.** Each refusal names the term.

## Tests

| | Before | End of M4 |
|---|---|---|
| Engine (Vitest) | 536, when M4c began | 625 |
| Dashboard (Vitest) | 102, at the end of M3 | 169 |
| Reference unit tests (Python) | 30, at the end of M3 | 33 |
| Locked cases | 28, at the end of M3 | 45 |

## Assumptions added in M4

All confirmed by you, unless noted:
- **R20–R24:** partial pay-to-play, pay-to-play with anti-dilution, several series, notes in a round, pre-money SAFEs.
- **R25–R28:**
  - when anti-dilution applies, and to several series
  - R7's toggle with a top-up
  - the pool top-up under pay-to-play, with the other reading recorded
  - a round's seniority without its series from SAFEs and notes
- **E19:** share counts at 40 digits.
- **C14:** the round fields for notes and the toggles. C11 gained per-series pay-to-play ratios; C12 no longer refuses round events; C13 gained save format version 2.
- **R6:** gained the refusal above the entitlement, and the permanent refusal of pro-rata in a pay-to-play round.

## Still refused, owed before a release supports them

From `docs/ASSUMPTIONS.md`, and listed in the engine README:
1. **A post-money SAFE converting in the same round as notes or pre-money SAFEs.**
2. **SAFEs or notes converting in a round that triggers anti-dilution.**
3. **A pay-to-play round that also converts SAFEs or notes.**

Each needs a case worked out by hand before the engine builds it.

## CI and permissions changes across M4

- **None** to `.github/workflows/` or `.claude/`.
- **`cases/` changed only in M4a and M4b,** under the `unlock-cases` label you added after re-deriving them.

## Carried forward to M5

- **M5's terms:** cumulative dividends, warrants, management carve-outs, escrow and earnouts, and SAFEs and notes still outstanding at a sale. Each is refused today, naming M5.
- **Exit cases owed before M5 (X9, X12):** for SAFEs and for notes, one each with a discount, with no cap, and alongside preferred stock, so every SAFE and note term the engine supports at a sale has a test.
- **X8's payment warning** for escrow and earnouts, which comes with M5.
- **The engine's next release.** It would carry R28, the README's note on it, and the grouped digits in one message. 0.1.0 is what's on npm.

## Open questions

None. The next milestone is M5, so I'm stopping here.
