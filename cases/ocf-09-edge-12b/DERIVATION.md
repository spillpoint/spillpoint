# OCF case 09, edge case 12b in OCF: derivation

Edge case 12b's cap table, written by hand as an OCF 1.2 package as of Jan 1, 2024 (`package/`). Its import, worked out below, is **the locked case's cap table**, so the locked case's payouts and breakpoints are this import's too: from 04d the engine pays the imported table at the locked case's exit values and checks it against that case's `expected.json`.

| OCF | Cap table |
|---|---|
| Stakeholders Founder A, Founder B, Employee C, Investor X | the four holders; X holds only the SAFE |
| Common Stock | `common` |
| A stock plan reserving 1,500,000; C's 500,000 options at $5.00 | `options_5`: C 500,000; the pool 1,500,000 − 500,000 = **1,000,000** |
| Founders 6,000,000 and 3,000,000 | the same positions |
| X's SAFE: $1,000,000, a SAFE conversion mechanism, **post-money**, a $10,000,000 cap, a 20% discount, an exit multiple of 1 | `safe_x`: post-money cap $10,000,000, discount 0.2 (O8) |

**The report:**
- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Notes:** one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date. And one for convertible seniority, ignored since the one convertible can't differ from another.
