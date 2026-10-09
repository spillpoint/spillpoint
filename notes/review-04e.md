# Review: 04e (plans, options, warrants, SAFEs and notes; every OCF case in full)

Branch `04e-ocf-grants-and-convertibles`. `readOcf` now reads everything it was planned to:
- **Plans and the pool (O6).**
- **Options and RSUs:** exercises, releases, cancellations, transfers, retractions and repricings, under OCF 1.2's names and 1.0's older ones.
- **Warrants (O7).**
- **SAFEs and notes (O8, O9).**

It reads them in one pass by date with the share ledger, so a split sees what's outstanding on its class. The 04d stopgap refusal, `not_yet_read`, is gone. `cases/` is untouched.

## What changed

- **The reader:** grants and the pool, warrants, and SAFEs and notes, each in its own module. One shared record of securities holds O5's rules for every kind: balances, closing and retractions.
- **From your 04d review:**
  - **A preferred class with an outstanding warrant for it is kept,** even with no shares issued.
  - **Two files of one name in different folders are refused** as `ambiguous_file`.
  - **The later list** has fractional shares and dual-class common, both on the 1.0c watch list, and readOcf's outer names for the 1.0b review.
- **The engine README** gets its OCF section:
  - the credit line, word for word as you gave it
  - what an import gives and how it refuses
  - a worked example that the README test runs: a two-class package read, Seed's participation filled in, and paid at $20M
  - the API row and `OcfRefusal`
- **Two fixes** from running OCF's published examples, below.

## How to check it

Run `pnpm test`. Then:

1. **Every OCF package imports to its hand-worked `expected.json` exactly:** Larkspur's 66 transactions, Millrace, Quillfern, and cases 05 to 10.
2. **Every fixture:**
   - Each of case 02's 17 set-aside files adds exactly its count and its line, and the 1.0 manifest adds nothing.
   - Each of case 03's 36 refusals is refused by its kind, term and subject.
   - Case 04's two blanks are left to fill in: a SAFE's cap kind and a note's base.
3. **Every package that writes a locked case pays as that case does:** cases 05 to 12.
   - **Millrace:**
     - payouts within a cent at all 19 points
     - decisions as recorded at the nine listed exit values, and at each of its own breakpoints, as you agreed in 04b2
     - the same ten breakpoints, each within a cent, with the same reasons
   - **Quillfern** is edge case 25 exactly.
4. **Small packages written in the tests** cover rules no case reaches:
   - **The pool.** With 1,000 reserved and 100 of a 300 grant cancelled, the pool is 800 under a plan that returns cancelled grants, and 700 under one that retires them.
   - **Expiry:** a grant past its expiration date counts as cancelled.
   - **Refusals:**
     - a plan that gives no cancellation behavior, with a grant cancelled under it
     - a grant over a preferred class
     - a split of common with an option outstanding
     - two files of one name
   - **Warrants:** a warrant keeps an empty preferred class. An expired warrant is left out, and its class with it.
   - **Convertibles:** a converted SAFE's exit multiple of 2 isn't refused, but an outstanding one's is.

## OCF's published examples

Downloaded with your OK: 25 files, 87,290 bytes, from the OCF repository's main branch into `local/ocf-examples/`, inside the sandbox. Nothing from them is in git. I read them with a scratch script outside the repo. Where I changed something to read further, I changed it in memory only, and say so below.

**The two tutorial packages:**
- **Both write a placeholder,** `~~~ SAMPLE ~~~`, as their OCF version, so both are refused as `ocf_version`. That's right: it isn't a version. Read further with the version set to 1.2.0:
- **The quickstart's manifest** lists its files as `./Stakeholders.json` and so on, where the files are named `Stakeholders.ocf.json`. So it's refused as `missing_file`. With the names matched up, it reads one holder with 5,000 shares of a preferred class. The tutorial gives that class no price, preference or conversion, so all four terms are left to fill in. One issuer field, `jurisdiction_of_formation`, gets an unrecognized-field line. It isn't among the issuer fields I have for OCF 1.2.
- **The options tutorial** is dated Dec 1, 2022, but its grant, pool increase and exercise come after that. So it's refused as `after_as_of`. With its date moved past them, it reads:
  - the 5,000 preferred, its terms blank as before
  - 25,000 common from the exercise
  - the 75,000 options left at $0.10
  - a pool of 8,000,000 − 75,000 − 25,000 = 7,900,000

  Its vesting is set aside.

**The samples folder** is 13 files with 48 object types. It shows each type and variant on its own, so it isn't one company.
- **Its version, `1.2.1-alpha+main`,** was refused at first. It's now read (fix 1).
- **Its first refusal** is then a SAFE in pounds sterling.
- **Every refusal, in memory.** I dropped each refused object in turn and read again. That gave 65 refusals:
  - 49 objects that name a placeholder stakeholder, security or plan not in the folder
  - 5 security ids reused across examples
  - 7 amounts in pounds or Canadian dollars
  - 4 dated after the folder's date

  What's left then reads.
- **Every type is accounted for:** each of the 48 object types is read, set aside or refused by name. None is unknown to the reader.
- **Every field is known:** I compared each object of a type the reader reads, in the samples and both tutorials, with the reader's field lists. The only field it doesn't know is the tutorials' `jurisdiction_of_formation`, above.
- **Its Series Seed's conversion right gives no `type`.** I'd refused it as a mechanism other than a ratio. It's now read (fix 2).

**The two fixes,** each with a test and a line in ASSUMPTIONS:
1. **Versions 1.0 to 1.2 are read with a pre-release or build suffix** (O2), so `1.2.1-alpha+main` is read.
2. **A conversion right that doesn't give its type** is read as a stock class's, since it sits on one (O4). A right that gives another type is still refused.

## Decisions for you to check (all New, in ASSUMPTIONS)

1. **Only an outstanding convertible's terms are read** (O8). An exit multiple, a general convertible, triggers that differ, or a note's interest terms are refused only for a SAFE or note still outstanding on the package's date. A converted SAFE's terms no longer change who gets what, and nearly every ledger has some. Two things are checked for every convertible:
   - **its mechanism:** a SAFE carrying a note's, or a note a SAFE's, is refused either way
   - **seniority:** compared across every convertible, converted ones included, as Millrace's report needs
2. **A warrant's mechanism is checked when it's issued,** even if it's exercised later (O7). Its class and quantity come from the mechanism.
3. **A plan that gives no cancellation behavior,** with a grant cancelled or expired under it, is refused as `cancellation_behavior_missing` (O6). Whether those shares return would be a guess.
4. **A grant, or a plan, over a preferred class is refused** as `grant_of_preferred` (O6). Any grant other than an option, an RSU or a SAR is refused as `compensation_type`.
5. **Expiry** (O6): a grant is expired when its expiration date is before the package's date. On the date itself it's still outstanding.
6. **A SAFE's absent discount is written `0`,** as the locked SAFE cases write it, and as a note's already is (O8).
7. **Notes** (O9):
   - a rate with an accrual end date is refused as `note_rate_periods`
   - a note with no cap has no cap fields
   - the note's issue date is its rate's accrual start date
8. **A warrant for a common class** is a warrant for `common`, named with that class's name (O7).

## Checks

- **Engine:** 1,787 tests pass, 15 more.
- **Dashboard:** 322 tests pass.
- **Typecheck:** clean.
- **C16:** a fixture's terms to fill in are compared as a set once added to its base's, as its notes are.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing run outside the sandbox.** The download ran inside it.

## Open questions

The decisions above. Next is 04f, the page: open a .zip or loose files, show the report before use, and ask for each blank. I'm stopping here.
