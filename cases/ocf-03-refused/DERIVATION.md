# OCF case 03, refused: derivation

One small OCF file for each thing the importer refuses: 35 in all, 22 unsupported and 13 malformed. A SAFE whose cap gives no pre- or post-money timing was here, but OCF makes the timing optional, so it's now a term to fill in, in case 04 (Jordan, 04a2 review). Each fixture is added to case 01's package, Larkspur Instruments, as a file of its own; the two manifests here replace Larkspur's. Each has exactly one problem, so each result is one refusal: its kind, a term naming it, and the object it's about.

**Two kinds of refusal:**
- **Unsupported:** valid OCF that spillpoint doesn't model yet, so an import would change payouts without saying so. On the later list where the plan says.
- **Malformed:** the files disagree with each other or with OCF, so there's no single cap table to build.

## The package (O1, O2)

| Fixture | The problem | Refused |
|---|---|---|
| `version-2` | the manifest says OCF 2.0.0 | unsupported: versions 1.0 to 1.2 only |
| `missing-file` | the manifest lists `Financings.ocf.json`, which isn't given | malformed |
| `currency` | a stock issuance priced in Canadian dollars | unsupported: US dollars only, on the later list |
| `after-as-of` | an issuance on July 15, 2025, after the package's June 30 | malformed |
| `unknown-object-type` | `TX_STOCK_GIFT`, no OCF type | unsupported, by name |
| `duplicate-id` | a second object with id `tx-01` | malformed |

## References and the ledger (O5)

| Fixture | The problem | Refused |
|---|---|---|
| `unknown-stakeholder` | an issuance to `sh-nobody` | malformed |
| `unknown-stock-class` | an issuance in `cls-nothing` | malformed |
| `unknown-stock-plan` | a grant under `plan-1999` | malformed |
| `unknown-security` | a cancellation of `sec-zz` | malformed |
| `closed-security` | a cancellation of sec-a1 on June 1, 2024, after its transfer closed it on Jan 15, 2024 | malformed |
| `quantities-dont-reconcile` | Founder B transfers 400,000 of sec-b5's 3,400,000, but the balance is issued as 3,100,000, not 3,000,000 | malformed |
| `split-of-preferred` | a 2-for-1 split of Series A | unsupported: a split of a preferred class, on the later list |
| `split-with-derivatives` | a 2-for-1 split of common on June 15, 2025, with options, warrants and convertible preferred outstanding on it | unsupported: OCF doesn't record how they adjust, on the later list |

## Grants and the pool (O6)

| Fixture | The problem | Refused |
|---|---|---|
| `stock-appreciation-right` | a cash-settled stock appreciation right | unsupported |
| `return-to-pool-conflict` | a return-to-pool for opt-e1 under the 2023 plan, which already returns cancelled grants by its own rule | unsupported: which governs would be a guess |
| `pool-overdrawn` | a grant of 2,000,000 under the 2023 plan, whose pool had 1,160,000 left | malformed: 1,500,000 − 2,280,000 − 60,000 is negative |

## SAFEs and notes (O8, O9)

| Fixture | The problem | Refused |
|---|---|---|
| `safe-exit-multiple` | a SAFE with an exit multiple of 2 | unsupported |
| `convertible-seniority` | a SAFE of seniority 2 beside convertibles of seniority 1 | unsupported, on the later list |
| `convertible-mechanism-mismatch` | a SAFE carrying a note's conversion mechanism | malformed |
| `convertible-security` | a convertible of OCF's general kind | unsupported |
| `convertible-triggers-differ` | a SAFE whose two triggers have different caps | unsupported |
| `note-rate-periods` | a note at 6% for 2025, then 8% | unsupported, on the later list |
| `note-day-count` | a note on 30/360 | unsupported, on the later list |
| `note-compounding` | a compounding note | unsupported, on the later list |
| `note-cash-interest` | a note paying interest in cash | unsupported, on the later list |
| `note-accrual-period` | a note accruing monthly | unsupported, on the later list |
| `note-mfn` | an MFN note | unsupported, on the later list |

## Warrants (O7)

| Fixture | The problem | Refused |
|---|---|---|
| `warrant-mechanism` | a warrant converting by a valuation cap into a future round | unsupported |
| `warrant-quantity` | a warrant for 10,000 whose conversion gives 12,000 | malformed |

## Stock classes (O4)

Each adds a preferred class, with no shares issued in it, so only the class itself is at issue.

| Fixture | The problem | Refused |
|---|---|---|
| `class-conversion-mechanism` | conversion by a fixed amount, not a ratio | unsupported |
| `several-conversion-rights` | two conversion rights | unsupported |
| `conversion-into-preferred` | converts into Seed Preferred | unsupported |
| `conversion-ratio-mismatch` | price and conversion price $1.50, ratio 2 for 1, where $1.50 ÷ $1.50 is 1 | malformed |
| `cap-below-preference` | a 2x preference with a participation cap of 1.5x | unsupported, on the later list. OCF doesn't say whether the cap includes the preference. This class only makes sense if it excludes it, and spillpoint reads caps as including it (O4, E7), so it can't be read either way without a guess. |
