# Review: 04a2 (OCF fixtures: what's set aside, and what's refused)

Branch `04a2-ocf-fixtures`. The second half of your 04a: one small OCF file for each kind of object the import sets aside, and one for each refusal. Each is added to case 01's package, Larkspur, as a file of its own. A manifest fixture replaces Larkspur's manifest instead. Every file is our own, written from the spec.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label

Each derivation is one table: one row per fixture, with its problem and its result.

## Case 02, set aside (`cases/ocf-02-not-needed`): 18 files

**17 kinds of object, each read and set aside** (O10): legends, vesting terms, a 409A valuation, a financing, a document, five acceptances (stock, grant, grant under OCF's older name, warrant, note), vesting start, vesting event, vesting acceleration, two authorized-share changes, and two stakeholder change events.

**Each adds to Larkspur's import:**
- a count of 1 under "not needed"
- a note that Larkspur's manifest doesn't list the file, which is read anyway (O2)

The cap table, the terms to fill in and the "read" counts stay case 01's. The acceptances, vesting transactions and stakeholder events point at Larkspur's real securities and people, so they read like a real export.

**The 18th is a manifest at OCF 1.0.0:** read exactly as case 01, since 1.0 to 1.2 are all read.

## Case 03, refused (`cases/ocf-03-refused`): 35 files

Each has exactly one problem, so the result is one refusal: its kind, a term, and the object it names.

**22 unsupported**, valid OCF that spillpoint doesn't model yet:
- **The package:** OCF 2.0, a currency other than dollars, an unknown object type.
- **Splits:** of a preferred class; of common while options, warrants and convertible preferred are outstanding.
- **Grants:** a stock appreciation right; a return-to-pool transaction under a plan that already returns grants by its own rule.
- **SAFEs:** an exit multiple of 2, a differing seniority, a convertible of OCF's general kind, two triggers with different caps.
- **Notes:** two rate periods, 30/360, compounding, cash interest, monthly accrual, MFN.
- **Warrants:** one converting by a valuation cap.
- **Classes:** a fixed-amount conversion, two conversion rights, conversion into a preferred class, and a participation cap below the preference.

**13 malformed**, where the files disagree with each other or with OCF:
- **The package:** a manifest listing a missing file; a transaction after the package's date; a repeated id.
- **References:** to an unknown stakeholder, class, plan or security; a cancellation of a security already closed.
- **Quantities:** a transfer whose balance doesn't reconcile (3,400,000 − 400,000 issued as 3,100,000); a grant that overdraws the pool (1,500,000 − 2,280,000 − 60,000); a warrant whose quantity and conversion disagree.
- **Mismatches:** a SAFE carrying a note's mechanism; a class whose ratio disagrees with its prices.

**Kept unambiguous on purpose:**
- **The two splits** are dated June 15, 2025, after everything outstanding.
- **The pool fixture** overdraws the 2023 plan only.
- **The class fixtures** add classes with no shares issued in them, so only the class is at issue.

## Decisions I made, for you to check

1. **The terms.** They're the fixture names in snake case, except `ocf_version` for OCF 2.0. The engine will carry them on its refusals: an `UnsupportedTermError`'s `term` for the unsupported, and named in the error for the malformed.
2. **Unsupported or malformed.** A return-to-pool under a plan that already decides it is unsupported: valid OCF we could model one day. Malformed is for files that disagree with each other or with OCF.
3. **Pointing at the base.** A fixture result says "the base's import, plus this" (`adds`). That avoids repeating Larkspur's whole cap table 17 times. C16 now describes it.

## Changes after your review

1. **A SAFE cap without a timing** is no longer refused.
   - **Why:** OCF makes the timing optional.
   - **How it's read:** the cap's kind is left blank to fill in, and the page will ask "Is this SAFE's cap pre-money or post-money?". O8 says so.
   - **The fixture** moved to a new **case 04, to fill in** (`cases/ocf-04-to-fill`). It adds the SAFE to Larkspur's import with its blank, and the term to fill in.
   - **Its shape in the cap table:** it keeps its amount as `valuation_cap`, with `cap_type` blank, as a note does (C16). Both pre- and post-money caps left blank would mean a SAFE with no cap.
2. **A cap below the preference** is now **unsupported**, on the later list.
   - **O4** and case 03's derivation give your reasoning: OCF doesn't say whether the cap includes the preference, and this class only makes sense if it excludes it.
   - **The engine's message** says the same when it's written in 04d.
3. **Every class with a cap** gets a note, `participation_cap_includes_preference`. Larkspur's report gains one for Series A, in case 01's `expected.json` and derivation. O4 and O10 list it.
4. **The 1.0c watch list:** return-to-pool transactions under a plan that already decides it, beside splits.

**One addition you didn't ask for:** case 04 has a second fixture, `note-base-unreadable`. It's a note whose capitalization rules also count the new money, so they match neither "with pool" nor "without pool", and what its cap divides by is left blank (answer 8). No other fixture reaches that. Drop it if you'd rather keep 04a2 to what you listed.

**Counts now:**
- **Case 03:** 35 refusals, 22 unsupported and 13 malformed.
- **Case 04:** 2 fixtures.
- **Engine:** 1,567 tests pass.

## How to check it by behavior

Read each derivation's table against the fixture it names. Each fixture is one short JSON file.

**New engine tests check the files against each other.** They don't check the decisions:
- every fixture is one OCF file of a known type, with exactly one result
- each set-aside result's count matches what's in its file
- each refusal's subject appears in its fixture
- only the duplicate-id fixture reuses one of Larkspur's ids

## Also in this PR

- **Your two 04a follow-ups:**
  - **Case 01's derivation** says `board_seat` is deliberately not an OCF field, so the package isn't a valid OCF example.
  - **O5** has your wording for the issued-at-another-price line. The page uses it in 04f.
- **The later list:** in the 1.0c run, count how often a split is refused because options or preferred were outstanding.
- **`docs/SPEC.md`:** OCF cases 02 and 03.
- **Tests:** the OCF case list now has three cases.

## Checks

- **Engine:** 1,567 tests pass, 74 more, all checking the case files.
- **Dashboard:** 322 tests pass.
- **Reference:** 55 unit tests pass, and all 75 cases match.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Open questions

None. Next is 04b: our locked cases written as OCF packages. I'm stopping here.
