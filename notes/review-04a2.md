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

## Case 03, refused (`cases/ocf-03-refused`): 36 files

Each has exactly one problem, so the result is one refusal: its kind, a term, and the object it names.

**22 unsupported**, valid OCF that spillpoint doesn't model yet:
- **The package:** OCF 2.0, a currency other than dollars, an unknown object type.
- **Splits:** of a preferred class; of common while options, warrants and convertible preferred are outstanding.
- **Grants:** a stock appreciation right; a return-to-pool transaction under a plan that already returns grants by its own rule.
- **SAFEs:** a cap without a timing, an exit multiple of 2, a differing seniority, a convertible of OCF's general kind, two triggers with different caps.
- **Notes:** two rate periods, 30/360, compounding, cash interest, monthly accrual, MFN.
- **Warrants:** one converting by a valuation cap.
- **Classes:** a fixed-amount conversion, two conversion rights, conversion into a preferred class.

**14 malformed**, where the files disagree with each other or with OCF:
- **The package:** a manifest listing a missing file; a transaction after the package's date; a repeated id.
- **References:** to an unknown stakeholder, class, plan or security; a cancellation of a security already closed.
- **Quantities:** a transfer whose balance doesn't reconcile (3,400,000 − 400,000 issued as 3,100,000); a grant that overdraws the pool (1,500,000 − 2,280,000 − 60,000); a warrant whose quantity and conversion disagree.
- **Mismatches:** a SAFE carrying a note's mechanism; a class whose ratio disagrees with its prices; a participation cap below the preference.

**Kept unambiguous on purpose:**
- **The two splits** are dated June 15, 2025, after everything outstanding.
- **The pool fixture** overdraws the 2023 plan only.
- **The class fixtures** add classes with no shares issued in them, so only the class is at issue.

## Decisions I made, for you to check

1. **The terms.** They're the fixture names in snake case, except `ocf_version` for OCF 2.0. The engine will carry them on its refusals: an `UnsupportedTermError`'s `term` for the unsupported, and named in the error for the malformed.
2. **Unsupported or malformed.** I called these unsupported, since each is valid OCF we could model one day:
   - a SAFE cap without a timing
   - a return-to-pool under a plan that already decides it

   Malformed is for files that disagree with each other or with OCF.
3. **Pointing at the base.** A fixture result says "the base's import, plus this" (`adds`). That avoids repeating Larkspur's whole cap table 17 times. C16 now describes it.

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

- **Engine:** 1,558 tests pass, 65 more, all checking the case files.
- **Dashboard:** 322 tests pass.
- **Reference:** 55 unit tests pass, and all 75 cases match.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Open questions

None. Next is 04b: our locked cases written as OCF packages. I'm stopping here.
