# OCF case 08, edge case 8 in OCF: derivation

Edge case 8's cap table, written by hand as an OCF 1.2 package as of Jan 1, 2024 (`package/`). Its import, worked out below, is **the locked case's cap table**, with one difference: the warrant class's name, so the locked case's payouts and breakpoints are this import's too: from 04d the engine pays the imported table at the locked case's exit values and checks it against that case's `expected.json`.

| OCF | Cap table |
|---|---|
| Stakeholders Founder A, Founder B, Investor X, Lender L | the four holders |
| Common Stock; Seed Preferred: $1.00, 1x, participation cap 1, 1 for 1 at $1.00, seniority 2 | `common`; `seed`, non-participating |
| Founders 6,000,000 and 2,000,000; X 2,000,000 Seed | the same positions |
| Lender L's warrant: 200,000, at $0.50, a fixed-amount conversion into Seed Preferred | a warrant class for `seed` at $0.50: L 200,000 (O7) |

**The one difference.** The locked case names the warrant class by hand: `warrant_seed`, "Warrant for Seed Preferred ($0.50 strike)". An import takes the engine's own name, as a company built from its rounds does: `warrants_seed_0.5`, "Warrants for Seed Preferred ($0.5 strike)" (O7). The class is the same in every term, so the payouts are the same, under the other name.

**The report:**
- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Notes:** one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date. And three for Seed.
