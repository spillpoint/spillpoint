# Edge case 13e: derivation

This is edge case 13a's company: 9,000,000 common (Founder A 6,000,000, Founder B 3,000,000), 500,000 options at $5.00, and a 1,000,000-share unissued pool.

Investor X's note has **no valuation cap**, a **20% discount**, and is **repaid at 1x** principal plus interest:
- **Principal:** $1,000,000.
- **Interest:** 6% simple, Actual/365, from 2022-01-01 to the 2024-01-01 sale. That is 730 days and **$120,000**, so **$1,120,000** of principal plus interest.

## The rule

At a sale the note's holder gets the **greater** of two amounts (`ASSUMPTIONS.md` X3, X12):
- **Repayment:** 1 × $1,120,000 = **$1,120,000**, paid ahead of all equity as debt.
- **Conversion:** with no cap, $1,120,000 converts at the sale's common price per share **less its discount**, solved as a fixed point (the price depends on the note's shares, and the shares on the price), and is paid alongside common.

As for the SAFE in edge case 12c, the conversion is always worth the same. The note gets $1,120,000 ÷ (0.8p) shares, each worth the common price p. That is $1,120,000 ÷ 0.8 = **$1,400,000**, wherever a consistent price exists: where the exit value, all of it left for common and the note here, is more than $1,400,000.

At 2x repayment, conversion ($1,400,000) would never beat repayment ($2,240,000). So this case uses 1x, as edge case 13d does.

## Below $1,400,000: the literal reading

Where no conversion price exists, the greater-of has only repayment to take. So:
- **Up to $1,120,000,** the note takes every dollar.
- **From $1,120,000 to $1,400,000,** it stays at $1,120,000 and common takes the rest.
- **Just above $1,400,000,** conversion becomes possible and pays $1,400,000, so the note converts.

**At $1,400,000 the payouts jump.** The note's payout jumps from $1,120,000 to $1,400,000, and common's drops from $280,000 to nothing. This is where conversion first becomes possible. At exactly $1,400,000 the outcome from below still applies.

`ASSUMPTIONS.md` X12 records the other defensible reading: conversion takes everything left up to $1,400,000, so the note would get min(exit value, $1,400,000), with no jump.

## Breakpoints

| Exit value | Why |
|---:|---|
| $1,120,000 | The repayment is fully paid. Above this, the next dollar goes to common. |
| $1,400,000 | Payouts jump. Conversion first becomes possible here, and is worth $1,400,000. Below, the note is repaid $1,120,000; above, it converts. |

**The options never come into the money in this range.** With the note converted, common's price is (exit value + $2.5M of strike cash − $1,400,000) ÷ 9,500,000. That passes $5.00 only above $46,400,000, outside this case's $0 to $40M range.

## Payouts

| Exit | Founder A | Founder B | Employee C | Investor X (note) | Note takes |
|---:|---:|---:|---:|---:|---|
| $1M | 0 | 0 | 0 | 1,000,000 | repayment |
| $1.12M | 0 | 0 | 0 | 1,120,000 | repayment |
| $1.3M | 120,000 | 60,000 | 0 | 1,120,000 | repayment |
| $1.4M | 186,666.67 | 93,333.33 | 0 | 1,120,000 | repayment (the jump is just above) |
| $2M | 400,000 | 200,000 | 0 | 1,400,000 | conversion |
| $10M | 5,733,333.33 | 2,866,666.67 | 0 | 1,400,000 | conversion |
| $40M | 25,733,333.33 | 12,866,666.67 | 0 | 1,400,000 | conversion |
