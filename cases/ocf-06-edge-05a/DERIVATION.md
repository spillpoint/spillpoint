# OCF case 06, edge case 5a in OCF: derivation

Edge case 5a's cap table, written by hand as an OCF 1.2 package as of Jan 1, 2024 (`package/`). Its import, worked out below, is **the locked case's cap table**, so the locked case's payouts and breakpoints are this import's too: from 04d the engine pays the imported table at the locked case's exit values and checks it against that case's `expected.json`.

| OCF | Cap table |
|---|---|
| Stakeholders Founder A, Founder B, Investor X, Investor Y | the four holders |
| Common Stock | `common` |
| Series A Preferred: $2.00, 1x, **participation cap 1**, 1 for 1 at $2.00, seniority 2 | `series_a`: **non-participating**, a cap equal to the preference (O4) |
| Series B Preferred: $4.00, 1x, participation cap 1, 1 for 1 at $4.00, **seniority 3** | `series_b`, non-participating |
| Seniority 3 ahead of 2 | tiers `[series_b]`, then `[series_a]`: stacked |
| Founders 6,000,000 and 2,000,000; X 1,000,000 Series A; Y 1,000,000 Series B | the same positions |

**The report:**
- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Notes:** one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date. And three each for Series A and Series B.
