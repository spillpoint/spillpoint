# Edge case 28: derivation

Two non-participating series that must convert together, beside a post-money SAFE. Where the group converts, the SAFE switches to its Conversion Amount with it, and payouts jump. No other case has a group's conversion moving a SAFE. The table is 10j's random table many-11-0006, cut down in 10k, where it showed the reference's crash wording the SAFE's reason. `expected.json` comes from the reference, as for every exit case. Every figure below can be worked from the table here, without it.

## The company

- **Common:** Founder A 5,000,000 and Founder B 1,000,000, so 6,000,000 shares.
- **Series 0 Preferred, the senior tier:** Investor 0, 4,000,000 shares at $1.00. A 1x preference of $4,000,000, non-participating, converting one for one.
- **Series 1 Preferred, the junior tier:** Investor 1, 500,000 shares at $2.00. A 1x preference of $1,000,000, non-participating, converting one for one.
- **The group:** Series 0 and Series 1 must convert together, `"conversion_groups": [["series_0", "series_1"]]`. A bare list means the default vote, more than 50% of the group's as-converted shares (E11). Investor 0 holds 4,000,000 of its 4,500,000 shares, 88.89%, so it carries the vote alone.
- **SAFE Investor 1's post-money SAFE:** $75,000 at a $10,000,000 cap, no discount. $75,000 ÷ $10,000,000 is 0.75%.
- **No options and no pool.** The range is $0 to $20M.

## The rules (`ASSUMPTIONS.md` E11, E13, E17, E20, X1, X9)

- **The group decides first** (E17). Each voter compares the group's two settled outcomes, with the SAFE settled under each, and votes to convert only if that pays it strictly more (E11).
- **The SAFE's greater-of comes last** (E20): its Cash-Out Amount, its $75,000 purchase amount, or its Conversion Amount, $75,000 ÷ its Liquidity Price, in common.
- **Its Cash-Out Amount ranks with the most junior tier,** Series 1, sharing it pro rata (X9).
- **Its Liquidity Capitalization (LC)** counts common, its own conversion shares, and a series that has converted. A series keeping its preference is left out (X1). So the SAFE converts into a fixed 0.75% of LC: its shares n are 0.0075 × (everything else + n).

## Stage by stage

1. **Up to $4,000,000:** Series 0's preference. At $3,000,000, Investor 0 has all of it.
2. **$4,000,000 to $5,075,000:** the junior tier, $1,075,000 in all: Series 1's $1,000,000 and the SAFE's $75,000, pro rata. Paid in full at **$5,075,000**.
3. **Above $5,075,000, while the group keeps its preferences,** common has the rest: the exit value − $5,075,000.
   - **The SAFE stays in cash.** Converting, its LC would be 6,000,000 + n, the group left out. So it would hold 0.75% of the shares sharing what is left after the preferences, 0.75% × (the exit value − $5,000,000). That beats $75,000 only above $15,000,000, and the group converts well before.
4. **The group converts at 4,200,000,000/397 = $10,579,345.09,** and the SAFE with it.
   - **Converting, everyone is common.** LC is 10,500,000 + n, and n = 0.0075 × (10,500,000 + n), so n = 78,750 ÷ 0.9925 = **79,345.09 shares**. LC is 10,500,000 ÷ 0.9925 = 10,579,345.09 shares.
   - **The SAFE follows the group** (E20). Its shares are 0.75% of every share, so it has 0.75% of the exit value, more than its $75,000 above $10,000,000.
   - **The common price** is the exit value ÷ LC: the exit value × 0.9925 ÷ 10,500,000.
   - **Investor 0** compares $4,000,000 staying with 4,000,000 × the exit value × 0.9925 ÷ 10,500,000 converting. They're equal at 10,500,000 ÷ 0.9925 = **4,200,000,000/397**, where the common price is exactly $1.00. Above it, converting pays more, and its 88.89% carries the vote.
   - **Investor 1** would get 500,000 × $1.00 = $500,000 there, less than its $1,000,000 preference, so it votes to stay. Its vote doesn't change the result.
5. **Nothing else bends below $20,000,000.** With the group converted, everyone shares every dollar at one price, the SAFE its 0.75%.

## The jump (E13)

At exactly 4,200,000,000/397, Investor 0 is indifferent and votes to stay, so the outcome from below holds. Just above, the group has converted and the SAFE with it:

| | At the jump | Just above |
|---|---:|---:|
| Common price | $0.917391 | $1.000000 |
| Founder A | $4,586,954.24 | $5,000,000.00 |
| Founder B | $917,390.85 | $1,000,000.00 |
| Investor 0 | $4,000,000.00 | $4,000,000.00 |
| Investor 1 | $1,000,000.00 | $500,000.00 |
| SAFE Investor 1 | $75,000.00 | $79,345.09 |

Common rises from $5,504,345.09 to $6,000,000, by $495,654.91. Series 1 drops by $500,000, and the SAFE rises by $4,345.09. The three changes sum to zero. Series 0 is continuous: Investor 0 was indifferent.

## Breakpoints

| Exit value | Why |
|---:|---|
| $4,000,000 | Series 0's $4,000,000 preference is paid in full. Above it, the next dollar goes to the junior tier. |
| $5,075,000 | The junior tier is paid in full: Series 1's $1,000,000 preference and the SAFE's $75,000 Cash-Out Amount. Above it, the next dollar goes to common. |
| $10,579,345.09 | The group converts, and the SAFE switches from its Cash-Out Amount to its Conversion Amount, following Series 0 and Series 1 (SPEC, Breakpoints). **Payouts jump here instead of bending.** Exactly 4,200,000,000/397. |

## Payouts

| Exit value | Common price | Founder A | Founder B | Investor 0 | Investor 1 | SAFE Investor 1 | The group | The SAFE |
|---:|---:|---:|---:|---:|---:|---:|---|---|
| $3,000,000 | $0 | $0 | $0 | $3,000,000.00 | $0 | $0 | keeps its preferences | Cash-Out Amount |
| $5,075,000 | $0 | $0 | $0 | $4,000,000.00 | $1,000,000.00 | $75,000.00 | keeps its preferences | Cash-Out Amount |
| $10,579,345.08 | $0.917391 | $4,586,954.23 | $917,390.85 | $4,000,000.00 | $1,000,000.00 | $75,000.00 | keeps its preferences | Cash-Out Amount |
| $10,579,345.09 | $1.000000 | $5,000,000.00 | $1,000,000.00 | $4,000,000.00 | $500,000.00 | $79,345.09 | converts | Conversion Amount |
| $15,000,000 | $1.417857 | $7,089,285.71 | $1,417,857.14 | $5,671,428.57 | $708,928.57 | $112,500.00 | converts | Conversion Amount |

- **$10,579,345.08** is just below the jump: common has $10,579,345.08 − $5,075,000 = $5,504,345.08, five sixths to Founder A and one sixth to Founder B.
- **$10,579,345.09** is just above it: the common price is $10,579,345.09 × 0.9925 ÷ 10,500,000, a hair over $1.00, and the SAFE has 0.75% × $10,579,345.09 = $79,345.09.
- **$15,000,000:** the common price is $15,000,000 × 0.9925 ÷ 10,500,000 = $1.417857, and the SAFE has 0.75% × $15,000,000 = $112,500. Investor 1's $708,928.57 is less than its $1,000,000 preference, but Investor 0 carries the vote.
