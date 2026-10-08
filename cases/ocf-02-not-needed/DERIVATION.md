# OCF case 02, set aside as not needed for payouts: derivation

One small OCF file for each kind of object the importer reads and sets aside, because it doesn't change who gets what (O10). Each fixture is added to case 01's package, Larkspur Instruments, as a file of its own. The one manifest here replaces Larkspur's.

**What every fixture but the last does:**
- **The cap table** is case 01's unchanged.
- **The terms to fill in:** the same two.
- **"Read" counts:** unchanged.
- **The report** adds two things:
  - a count of 1 for the fixture's object type under "not needed"
  - a note that Larkspur's manifest doesn't list the fixture's file (O2). The file is still read.

| Fixture | Object | Why it doesn't change payouts |
|---|---|---|
| `stock-legend-template` | a stock legend template | the text printed on certificates |
| `vesting-terms` | vesting terms | vesting is ignored: every outstanding grant counts (O6) |
| `valuation` | a 409A valuation | a tax valuation of common, not a term of any security |
| `financing` | a financing grouping two issuances | a label over issuances already read |
| `document` | a document reference | a pointer to a file |
| `stock-acceptance` | a holder accepting stock | paperwork after an issuance |
| `equity-compensation-acceptance` | accepting a grant | the same |
| `plan-security-acceptance` | accepting a grant, OCF's older name for it | the same |
| `warrant-acceptance` | accepting a warrant | the same |
| `convertible-acceptance` | accepting a note | the same |
| `vesting-start` | a grant's vesting starting | vesting is ignored |
| `vesting-event` | a vesting milestone | the same |
| `vesting-acceleration` | vesting accelerated | the same: acceleration changes when shares vest, not how many are outstanding |
| `issuer-authorized-shares` | a change in the company's authorized shares | authorized isn't issued |
| `class-authorized-shares` | a change in a class's authorized shares | the same |
| `stakeholder-relationship` | Employee E becoming an ex-employee | who someone is, not what they hold |
| `stakeholder-status` | Employee E's termination | the same |

**The last fixture, `version-1-0`,** is Larkspur's manifest with OCF version 1.0.0 in place of 1.2.0. Versions 1.0 to 1.2 are all read (O2), and it lists the same files, so nothing is added. The import is case 01's exactly.
