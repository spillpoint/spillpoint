# Fixes for the next `cases/` unlock

`cases/` is locked, so these small fixes wait until Jordan next unlocks it, and then go in together. None of them changes an expected value.

- **`cases/millrace/DERIVATION.md`, "Checking this independently," steps 2 and 3:** "within $1" should be "within $0.01". `docs/SPEC.md` tightened the payout and breakpoint tolerances to $0.01 in M2a. (Added after the M2a review.)

- **Shadow series names: "(SAFE shadow)" becomes "(from SAFEs)".** "Shadow" is jargon founders won't know. The name comes from the reference calculator's round builder (`reference/spillpoint_ref/rounds.py`), so the fix is there, plus regenerating the cases that record it: Millrace's "Seed Preferred (SAFE shadow)" and edge case 15's "Series A Preferred (SAFE shadow)". The engine's own round builder (M4) should use the new name from the start. No value changes. (Added after the M3a review.)

## New cases to add

- **A pivotal voter indifferent over a range (E13).** A conversion group whose pivotal voter gets nothing either way until the senior preferences are paid, and then does better converting, so the vote flips where its two outcomes separate rather than where they cross. Example found in M2c's check: s0 and s2 convert together by at least 50%; s1 ($7.5M, 1x) and s0 ($15M, 3x, capped at 4x) share the senior tier, s2 ($9M, 3x) is junior; the group converts just above $7.5M. (Added after the M2c review.)
