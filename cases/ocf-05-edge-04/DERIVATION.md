# OCF case 05, edge case 4 in OCF: derivation

Edge case 4's cap table, written by hand as an OCF 1.2 package as of Jan 1, 2024 (`package/`). Its import, worked out below, is **the locked case's cap table**, so the locked case's payouts and breakpoints are this import's too: from 04d the engine pays the imported table at the locked case's exit values and checks it against that case's `expected.json`.

| OCF | Cap table |
|---|---|
| Stakeholders Founder A, Founder B, Investor X, Investor Y | the four holders, with the locked case's ids |
| Common Stock (COMMON) | `common` |
| Seed Preferred: $1.50 a share, 1x preference, **participation cap 3**, converting 1 for 1 at $1.50, seniority 2 | `seed`: OIP $1.50, CP $1.50, 1x, **participating, capped at 3x**: a cap above the preference (O4) |
| Founders' issuances: 6,000,000 and 2,000,000 common | the same positions |
| X 1,500,000 and Y 500,000 Seed at $1.50 | the same positions |

**Anti-dilution** "none", as the locked case's is; OCF has no field for it.

**The report:**
- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Notes:** one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date. And three for Seed: no anti-dilution field, its cap read as including the preference, and its conversion rounding not modeled.
