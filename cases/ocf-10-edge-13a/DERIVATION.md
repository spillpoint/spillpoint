# OCF case 10, edge case 13a in OCF: derivation

Edge case 13a's cap table, written by hand as an OCF 1.2 package as of Jan 1, 2024 (`package/`). Its import, worked out below, is **the locked case's cap table**, so the locked case's payouts and breakpoints are this import's too: from 04d the engine pays the imported table at the locked case's exit values and checks it against that case's `expected.json`.

| OCF | Cap table |
|---|---|
| Stakeholders, common, plan and options | as case 09: `options_5` C 500,000, the pool 1,000,000 |
| X's note: $1,000,000, 6% simple, Actual/365, accruing daily from Jan 1, 2022, deferred; an $8,000,000 cap; **no discount given**; an exit multiple of 2; capitalization rules counting shares, options and the unissued pool | `note_x`: principal $1,000,000, 6%, issued Jan 1, 2022, an $8,000,000 pre-money cap, "with pool", **discount 0**, repayment 2x (O9) |

**No discount given.** OCF gives a note's discount only where one applies, so an absent discount is none (O9). It's the locked case's 0.

The exit's date, Jan 1, 2024, isn't in OCF (O11): the locked case's exit gives it, as the page will ask for it.

**The report:**
- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Notes:** one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date. And one each for convertible seniority, ignored, and the cap read as pre-money.
