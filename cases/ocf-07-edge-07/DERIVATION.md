# OCF case 07, edge case 7 in OCF: derivation

Edge case 7's cap table, written by hand as an OCF 1.2 package as of Jan 1, 2024 (`package/`). Its import, worked out below, is **the locked case's cap table**, so the locked case's payouts and breakpoints are this import's too: from 04d the engine pays the imported table at the locked case's exit values and checks it against that case's `expected.json`.

| OCF | Cap table |
|---|---|
| Stakeholders Founder A, Founder B, Employees C, D, E | the five holders |
| Common Stock | `common` |
| A stock plan reserving 2,000,000 | the pool: 2,000,000 reserved − 2,000,000 granted = **0** (O6) |
| C 400,000 at $0.25; C 200,000 at $3.00; D 600,000 at $1.00; E 800,000 at $3.00 (NSOs) | classes by strike (O6): `options_0.25` C 400,000; `options_1` D 600,000; `options_3` C 200,000 and E 800,000 |

The option classes take the engine's names, `options_<strike>` and "Options ($<strike> strike)": the locked case's own.

**The report:**
- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Notes:** one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date.
