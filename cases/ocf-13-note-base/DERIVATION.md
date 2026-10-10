# OCF case 13, a note's base that counts other converting securities: derivation

**The rule (O9; Jordan's 0.5.0 answer 11):** a note's capitalization rules can count other converting securities (`include_other_converting_securities`). Neither base spillpoint models counts them, "with pool" or "without pool".
- **With another SAFE or note outstanding beside it,** the base would differ from both, so the note is refused by name. That fixture is in case 03, `note-base-counts-other-convertibles`, on Larkspur, whose two SAFEs and note are outstanding.
- **With nothing else outstanding,** there's nothing for the flag to count, so it changes nothing. The rest of the rules are read, with a report line saying so. That's this case.

The fixture is added to case 12's package, Quillfern Labs, as a file of its own. Quillfern's only SAFE converted in its ledger, so on Dec 31, 2025 no SAFE or note is outstanding.

## The fixture

`note-alone-counts-other-convertibles` issues a note to Fund U on Sep 30, 2025:
- $500,000 at 8% simple interest, Actual/365, accruing daily, deferred to conversion
- a $30,000,000 cap and a 20% discount
- an exit multiple of 1
- capitalization rules that count:
  - the outstanding shares
  - the outstanding options
  - the unissued pool
  - other converting securities

  and nothing else.

## What it adds to Quillfern's import

- **Read:** one more `TX_CONVERTIBLE_ISSUANCE`.
- **The note,** in the cap table:
  - **Its base is `with_pool`:** shares, options and the unissued pool, the rest of its rules, as O9 reads them.
  - **Its cap is pre-money,** the only kind spillpoint models for a note.
  - **Its repayment multiple is 1,** its exit multiple.
- **Nothing to fill in.**
- **Three report lines:**
  - `not_in_manifest`: Quillfern's manifest doesn't list the file (O2)
  - `note_cap_read_as_pre_money` (O9)
  - **`note_base_other_convertibles_ignored`, the new one:** the note's rules count other converting securities, and there are none outstanding beside it, so they change nothing

Everything else stays case 12's.

**The engine reads this rule from 05c2.** Until then, it leaves the note's base blank, to fill in, as it does for any rules it can't read, and its tests say so by name.
