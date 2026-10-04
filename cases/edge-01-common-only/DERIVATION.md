# Edge case 1: derivation

Only the 10,000,000 issued common shares share in the proceeds. The 1,000,000-share unissued pool is not stock anyone holds, so it gets nothing (`SPEC.md`: "The unissued pool never participates"). Each holder gets their share of the 10,000,000:

| Holder | Share | $1M | $10M | $12,345,678.91 | $100M |
|---|---:|---:|---:|---:|---:|
| Founder A | 50% | 500,000.00 | 5,000,000.00 | 6,172,839.46 | 50,000,000.00 |
| Founder B | 30% | 300,000.00 | 3,000,000.00 | 3,703,703.67 | 30,000,000.00 |
| Employee C | 20% | 200,000.00 | 2,000,000.00 | 2,469,135.78 | 20,000,000.00 |

At $12,345,678.91 the exact amounts are $6,172,839.455, $3,703,703.673 and $2,469,135.782. Rounded half-up to the cent, they still sum to the exit value.

**Breakpoints: none.** Every holder's payout is a straight line through zero with a constant slope (50¢, 30¢ and 20¢ per dollar of exit), so no slope ever changes.

If the pool were wrongly counted as a sharer, the base would be 11,000,000 and Founder A would get 45.45% instead of 50%. At $100M that is a $4,545,454.55 error, which this case catches.
