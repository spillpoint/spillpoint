# Edge case 12f: derivation

This is edge case 12's company: 9,000,000 common (Founder A 6,000,000, Founder B 3,000,000), 500,000 options at $5.00 held by Employee C, and a 1,000,000-share unissued pool.

**Two post-money SAFEs** are outstanding at the sale:
- **Investor X:** $1,000,000 at a $10,000,000 cap, 1/10 of its cap.
- **Investor Y:** $500,000 at a $4,000,000 cap, 1/8 of its cap.

## The rules (`ASSUMPTIONS.md` X1, X13)

Each SAFE gets the greater of its Cash-Out Amount, its purchase amount, or its Conversion Amount: its purchase amount ÷ its Liquidity Price, in common.

- **Cash-Out Amounts share a shortfall.** SAFEs taking their Cash-Out Amount are paid ahead of common, "with equal priority and pro rata" by purchase amount, in the YC text.
- **One Liquidity Capitalization for the company.** It counts:
  - all issued stock and options: 9,500,000
  - every SAFE taking its Conversion Amount, each at purchase amount ÷ its own Liquidity Price

  It leaves out the unissued pool and any SAFE taking its Cash-Out Amount.
- **Each SAFE's Liquidity Price** is its own cap ÷ that one count. So each converting SAFE's shares are a fixed fraction of the count: X's 1/10, Y's 1/8.
- **The count therefore depends on which SAFEs convert:**
  - **Y alone:** 9,500,000 ÷ (1 − 1/8) = **10,857,142.86**. Y's shares are 1/8 of it: **1,357,142.86**, at $0.368421.
  - **Both:** 9,500,000 ÷ (1 − 1/10 − 1/8) = **12,258,064.52** (exactly 380,000,000/31). X's shares are 1,225,806.45, at $0.815789; Y's 1,532,258.06, at $0.326316.

**The options never come into the money in this range.** They count in the Liquidity Capitalization, vested or not, but don't share in the proceeds. With both SAFEs converted, they would be exercised above $58,790,322.58.

## Stage by stage

1. **Up to $1,500,000:** both SAFEs take their Cash-Out Amounts, sharing every dollar pro rata: X two thirds, Y one third. At $1M, X has $666,666.67 and Y $333,333.33.
2. **$1,500,000 to $4,815,789.47:** both are paid in full, and the founders share the rest.
3. **Y converts at $4,815,789.47.**
   - **Its share:** converting, Y's 1,357,142.86 shares join common's 9,000,000 in what is left after X's $1,000,000 cash-out. That is 19/145 of (exit value − $1,000,000).
   - **The switch:** that equals Y's $500,000 at $1,000,000 + $500,000 × 145/19 = **$4,815,789.47** (exactly 91,500,000/19).
   - **X doesn't follow yet.** With Y converting, X's Conversion Amount would be 1,225,806.45 ÷ 11,758,064.52 of the exit value. That is less than $1,000,000 until $9,592,105.26.
4. **X converts at $9,592,105.26.**
   - **Its share:** with both converting, 11,758,064.52 shares share the whole exit value, and X's 1,225,806.45 are 0.104252 of it.
   - **The switch:** that equals X's $1,000,000 at **$9,592,105.26** (exactly 182,250,000/19).

## At $9,592,105.26 the payouts jump

When X converts, the Liquidity Capitalization grows from 10,857,142.86 to 12,258,064.52, because it now counts X's own shares. Y's shares are 1/8 of that count, so they grow too, from 1,357,142.86 to 1,532,258.06, though Y has decided nothing new.

- **X:** gets $1,000,000 either way. At this exit value it is indifferent.
- **Y:** jumps from $1,125,862.07, with X taking cash, to $1,250,000.00, with X converting.
- **The founders:** drop by the same $124,137.93.

**X doesn't choose for Y.** At exactly $9,592,105.26 it takes its Cash-Out Amount: a SAFE takes its Conversion Amount only when that strictly pays more (`ASSUMPTIONS.md` X16). So the outcome from below holds there, and the jump happens just above it, as for a class vote (E13).

This is how the YC text works when two post-money SAFEs are both outstanding at a sale. Each one's Liquidity Price falls as more SAFEs convert, so a SAFE gains when another converts.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,500,000 | Both Cash-Out Amounts are paid in full, $1,500,000 in all. Above this, the next dollar goes to common. |
| $4,815,789.47 | Y converts: 19/145 of (exit value − $1,000,000) equals its $500,000. |
| $9,592,105.26 | X converts: 1,225,806.45 ÷ 11,758,064.52 of the exit value equals its $1,000,000. **Payouts jump:** Y's shares grow with the Liquidity Capitalization. |

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (SAFE) | Investor Y (SAFE) |
|---:|---:|---:|---:|---:|---:|
| $1M | 0 | 0 | 0 | 666,666.67 | 333,333.33 |
| $1.5M | 0 | 0 | 0 | 1,000,000 | 500,000 |
| $3M | 1,000,000 | 500,000 | 0 | 1,000,000 | 500,000 |
| $4,815,789.47 | 2,210,526.32 | 1,105,263.16 | 0 | 1,000,000 | 500,000 |
| $6M | 2,896,551.72 | 1,448,275.86 | 0 | 1,000,000 | 655,172.41 |
| $9M | 4,634,482.76 | 2,317,241.38 | 0 | 1,000,000 | 1,048,275.86 |
| $9,592,105.26 | 4,977,495.46 | 2,488,747.73 | 0 | 1,000,000 | 1,125,862.07 |
| $10M | 5,102,880.66 | 2,551,440.33 | 0 | 1,042,524.01 | 1,303,155.01 |
| $20M | 10,205,761.32 | 5,102,880.66 | 0 | 2,085,048.01 | 2,606,310.01 |
| $40M | 20,411,522.63 | 10,205,761.32 | 0 | 4,170,096.02 | 5,212,620.03 |

At $9,592,105.26 the table shows the outcome from below. One cent above, Y has $1,250,000 and the founders $124,137.93 less between them.
