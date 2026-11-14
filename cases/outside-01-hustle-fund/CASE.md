# Outside case 1: Hustle Fund's published waterfall

An exit waterfall someone else worked out and published, entered as they state it: Hustle Fund's example in Brian Nichols, ["Waterfall modeling for startup exits: A step-by-step guide"](https://www.hustlefund.vc/post/exit-waterfall-modeling), August 10, 2026. Its payouts and breakpoints are set beside ours in `DERIVATION.md`. Hustle Fund published the example; it has not reviewed spillpoint.

| Holder | Security | Shares |
|---|---|---:|
| Founders | Common | 5,400,000 |
| Employees | Common | 600,000 |
| Seed Investors | Seed Preferred | 2,000,000 |
| Series A Investors | Series A Preferred | 2,000,000 |

**Employees** are the article's simplification: 600,000 common shares standing for the awards that would share in the proceeds. No strikes, vesting or unallocated pool, so `unissued_pool` is 0.

**Seed Preferred** ($2,000,000 invested):
- original issue price $1.00
- 1x preference ($2,000,000), non-participating
- junior to Series A
- converts 1:1

**Series A Preferred** ($6,000,000 invested):
- original issue price $3.00
- 1x preference ($6,000,000), senior
- participating, with its total preferred payout, the preference included, capped at 2x its original issue price: 2 × $3.00 × 2,000,000 = $12,000,000
- converts 1:1

Each series chooses for itself between its preferred payout and converting, as the engine does by default (no conversion group). The exit values are the article's five: $5M, $10M, $20M, $45M and $100M, and the range runs to $120M.
