# OCF case 04, terms to fill in: derivation

Valid OCF that leaves a term open, so the import leaves it blank and asks, rather than guess or refuse (O1; answer 4). Each fixture is added to case 01's package, Larkspur Instruments, as a file of its own.

**What each adds to Larkspur's import:**
- a count of 1 under "read"
- the instrument, in the cap table
- its blank term, in the terms to fill in
- a note that Larkspur's manifest doesn't list the file (O2)

Everything else stays case 01's.

## `safe-cap-without-timing`

Investor S's SAFE: $100,000, a $12,000,000 cap, a 20% discount, an exit multiple of 1, issued June 15, 2025.
- **What's missing:** its SAFE conversion mechanism gives no conversion timing, which OCF makes optional. So the cap could be pre-money or post-money.
- **How it's read:** the SAFE keeps its cap's amount as `valuation_cap`, with `cap_type` blank (C16). It doesn't take a pre-money or post-money cap field yet: both blank would mean a SAFE with no cap at all.
- **The page asks:** "Is this SAFE's cap pre-money or post-money?" (Jordan, 04a2 review; O8.)
- **Seniority:** its seniority, 1, matches every other convertible's, so it's still ignored.
- **Exit multiple:** given as 1, so it has no note for that.

## `note-base-unreadable`

Investor N's note: $200,000 at 5% simple, accruing daily from June 15, 2025, payable at conversion. A $15,000,000 cap, a 15% discount and an exit multiple of 1.5, so its repayment multiple is 1.5.
- **What's missing:** its capitalization rules count the shares, options and unissued pool, and the new money too. That matches neither "with pool" (no new money) nor "without pool". So what the cap divides by is blank (O9; answer 8).
- **The cap is read as pre-money,** with its note, as for Larkspur's note.

This fixture wasn't on your list for 04a2. It covers answer 8's blank base, which no other fixture reaches: Larkspur's note has rules that read as "with pool".
