# Review: M5i (escrow and earnouts, in the engine)

Branch `m5i-earnouts`. The engine now pays escrow and earnout schedules (C7, X8), through a new function, `paySchedule`. Each payment's take is the cumulative payout after it less before it, with every decision re-made at the cumulative amount.

- **Case 11:** runs through every exit test, and every take in both its schedules matches to the cent.
- **Your negative-take example:** in the engine's tests, and in "Owed before release" as case 11b.

**Every exit case now runs in the engine.** Nothing is refused as M5 any more.

## Run it

```bash
pnpm payouts edge-11-earnout --all
```

This prints "6 of 6 exit values match expected.json". The schedules are checked in `test/payments.test.ts`.

## How to check it by behavior

1. **Case 11, schedule A,** a closing below the preference:
   - **Closing, $2M:** all to Seed.
   - **Earnout, $3M:** Seed $1,000,000 and common $2,000,000.
2. **Case 11, schedule B,** where the earnout pushes Seed into converting:
   - **Closing, $10M:** common $7,000,000 and Seed $3,000,000.
   - **Earnout, $10M:** common $9,000,000 and Seed $1,000,000. Seed converts at the cumulative $20M.
3. **The negative take,** in case 6b's company with a $29M closing and a $2M earnout:
   - **Closing:** the group stays preferred. Founder A $18,750,000, Founder B $6,250,000, Seed-1 $1,000,000, Seed-2 $3,000,000.
   - **Earnout:** at the cumulative $31M the group converts. The takes are Founder A −$150,000, Founder B −$50,000, Seed-1 +$2,100,000 and Seed-2 +$100,000, which add up to the $2M payment.
   - **`lowered`** names Founder A and Founder B, the holders whose running total falls. That is what M5l's payment view will warn about (X8).

   The reference calculator gives the same figures, to the cent.

## How the engine handles schedules

- **Reading them** (C7):
  - **Each schedule** has an `id`, an optional `description`, and at least one payment, each a `label` and a positive `amount`.
  - **Refused, as malformed:** a schedule listed twice, or a field it doesn't read.
- **`paySchedule(table, schedule)`** returns a `PaymentTake` for each payment, in order:
  - the label, amount and cumulative
  - the decisions at the cumulative
  - the take for each holder × security, in the same order as a payout's lines
  - holder and class totals
  - `lowered`
- **Takes are exact.** The caller rounds them to the cent, as X8 says. A take is reported as is, negative or not.
- **Multiple answers.** If the cumulative amount has more than one stable answer, the takes aren't settled, and it stops with a clear error.

## What changed

- **Engine** (`packages/engine/src/`):
  - **`payments.ts`** (new): `paySchedule` and `PaymentTake`.
  - **`model.ts`:** `PaymentSchedule`, and an optional `ExitInput.paymentSchedules`.
  - **`input.ts`:** reads the schedules (C7). The refusal is gone.
  - **`index.ts`:** exports `paySchedule`.
- **Engine tests:**
  - **`api.test.ts`:** the pinned export list gains `paySchedule`, deliberately.
  - **Case 11** joins `EXIT_CASES`, which now holds every exit case.
  - **`input.test.ts`:** its refused-case list is now empty, so its per-case check runs only when a case is listed.
  - **`test/payments.test.ts`** (new):
    - both of case 11's schedules, every take, decision and total, against `expected.json`
    - the negative take
    - four malformed schedules
- **Docs:**
  - **The engine README:**
    - escrow and earnouts, `paySchedule` and the input field, marked *(0.2.0)*
    - the "Not modeled yet" list is gone, since it's empty
    - the milestone note: nothing is refused as M5 any more
  - **`docs/ASSUMPTIONS.md`:**
    - **X8 and C7:** in the engine.
    - **C12:** no M5 refusals left.
    - **"Owed before release":** case 11b, with your figures.
  - **`notes/release-0.2.0.md`:**
    - escrow and earnouts
    - `paySchedule`
    - the new types and field
    - the empty M5 list, and why the `Milestone` type keeps `"M5"`

## Checks

- **Engine:** 1,301 tests pass, 23 more than after M5h.
- **Dashboard:** 182 tests pass, unchanged. The page doesn't run schedules yet; the payments view is M5l.
- **Reference:** 47 unit tests pass, and all 61 cases match.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.

## Assumptions added

**No new IDs.** Updates:
- **X8 and C7:** in the engine.
- **C12:** updated.
- **"Owed before release":** case 11b.

## Decisions I made, for you to check

1. **The name `paySchedule`.** It's a new public function, so the pinned API list grows by one.
2. **`lowered` is computed in the engine,** not left to the page. The X8 warning then has one definition: a holder's take below −$0.005.
3. **`Milestone` keeps `"M5"`,** though nothing uses it. Removing it would break 0.1.0 code that compares with it. It can go in a later release, if you like.

## Open questions

None. M5j is next: release 0.2.0. Its notes are drafted in `notes/release-0.2.0.md`. I'm stopping here.
