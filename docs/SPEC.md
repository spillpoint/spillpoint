# spillpoint math spec

These are the defaults. Wherever a charter or an instrument could reasonably differ, the default becomes a toggle and is listed in `ASSUMPTIONS.md`. Follow the actual NVCA model documents and the YC post-money SAFE text where they apply, and quote the clause in a comment.

## Exit waterfall

- **Tiers.** Preferred series are grouped into seniority tiers and paid top-down. Series within a tier are pari passu: if the tier can't be paid in full, it is split pro rata by preference amount.
- **Preference amount.** Shares × original issue price × multiple. In M5, accrued unpaid cumulative dividends are added on top.
- **Participation types.**
  - **Non-participating.** The series takes its preference or converts to common.
  - **Participating.** The series takes its preference and then shares pro rata as converted to common, with no limit. It never converts.
  - **Participating, capped.** The series takes its preference and shares pro rata until its total reaches the cap. The cap is a multiple of the original issue price, and the preference counts toward it. Past the cap, the series converts if converting pays more.
- **Conversion decisions.** Each series that can convert decides on its own, using the charter's greater-of test: whichever pays more, its preference (plus any capped participation) or its payout as converted to common.
  - One series' choice changes everyone else's payout, so solve until no series wants to switch.
  - If more than one stable answer exists, report all of them and flag it. Never pick one silently.
  - Toggle: a group of series that must convert together, as when a class vote forces conversion.
- **Options and warrants.**
  - Full vesting is assumed.
  - An instrument is exercised if it's in the money, and the strike cash is added to proceeds.
  - Out-of-the-money options and warrants get nothing.
  - Whether an option is in the money depends on the common payout, which depends on who exercises. Solve this together with the conversion decisions.
- **Who shares the residual.** Common stock, exercised options and warrants, converted preferred, and participating preferred on an as-converted basis.
- **The unissued pool never participates.**

## Breakpoints

A breakpoint is any exit value where any holder's payoff slope changes. Report every breakpoint in the analysis range, exact to $0.01, each with a plain-English reason. Possible reasons:
- a tier's preference is fully paid
- a series converts
- a capped series hits its cap
- an option or warrant strike goes into the money
- a carve-out tier starts or ends
- an unconverted SAFE or note switches between payout methods

## Rounds (M4)

- **Priced round.** Price = post-money valuation ÷ post-money fully diluted shares. Post-money fully diluted shares include:
  - existing stock and issued options
  - the unissued pool at its target size
  - converting SAFEs and notes
  - the new shares
  - by default, any anti-dilution adjustment shares the round triggers

  The price depends on the share count and the share count depends on the price, so solve the circularity.
- **Pool top-up.** The target is stated as the unissued pool's percentage of post-money fully diluted shares. The increase sits in the pre-money, so it dilutes only existing holders.
- **Post-money SAFE (YC).**
  - It converts at the lower of the cap price and the discount price. Cap price = post-money valuation cap ÷ Company Capitalization.
  - Company Capitalization includes all stock, converting securities, issued and promised options, and the unissued pool. It excludes any pool increase made in the financing, except to the extent promised options exceed the pool that existed before.
  - The SAFE converts into a shadow series that has the new series' rights and preference multiple. Its per-share preference and conversion price are based on the SAFE's own conversion price.
- **Pre-money SAFEs and convertible notes.** Inputs: principal, simple interest, cap, and discount.
- **Pro-rata rights.** The investor buys enough of the new round to keep its pre-round fully diluted percentage.
- **Anti-dilution.**
  - Broad-based weighted average is the default. Narrow-based weighted average and full ratchet are the alternatives.
  - Weighted average uses the NVCA formula: CP2 = CP1 × (A + B) ÷ (A + C).
  - Anti-dilution changes the conversion ratio, never the preference amount.
- **Pay-to-play.** Holders who don't take their pro-rata at the round have their preferred converted to common at a ratio given as an input.

## Exit terms (M5)

- **Cumulative dividends.** Inputs: rate, simple or compounding, accrual start date, and exit date. Unpaid dividends add to the preference. By default they're forfeited on conversion, as a toggle.
- **Warrants.** Treated like options, but can be for common or for a preferred series.
- **Management carve-out.** A percentage of proceeds, flat or tiered by exit value, paid to listed people before preferences. Toggle: paid alongside preferences instead.
- **Escrow and earnouts.** Proceeds come as a schedule: a closing payment plus later payments. Run the waterfall on cumulative proceeds, so each later payment goes where it would have gone if it had been paid at closing. Show each holder's take per payment.
- **Unconverted post-money SAFE at exit (Liquidity Event).** The holder gets the greater of the purchase amount or the as-converted value at the Liquidity Price. Take the priority order from the YC text.
- **Unconverted note at exit.** Repayment (a multiple of principal plus interest) or conversion, per the note's terms, which are inputs.

## Rounding

- Prices are exact.
- Share counts round down to whole shares at every issuance and conversion.
- Payouts stay exact internally and display to the cent.
- Test tolerances: payouts within $1, shares within 1, breakpoints within $1.

## Edge cases (M1)

Each edge case isolates one behavior before Millrace combines them. Where a case has variants, it uses the same inputs with one term changed.

1. Common stock only.
2. One series, 1x non-participating: the conversion point.
3. One series, 1x participating, uncapped.
4. One series, participating and capped: the cap is hit, then the series converts.
5. Two series, stacked vs. pari passu.
6. Two non-participating series in one tier with different per-share preferences: per-series conversion vs. forced class conversion.
7. Options at several strikes: in-the-money thresholds and strike cash.
8. A warrant for preferred.
9. Cumulative dividends: they accrue, then are forfeited on conversion.
10. A management carve-out.
11. An earnout: a closing payment plus one later payment.
12. An unconverted post-money SAFE at exit.
13. A convertible note at exit, before conversion.
14. An option pool top-up in the pre-money.
15. A post-money SAFE converting in a round that tops up the pool, with a discount that beats the cap.
16. One down round under three anti-dilution methods: broad-based, narrow-based, and full ratchet.
17. Pay-to-play.

Cases 14–17 are round cases, so their expected outputs are cap tables. The rest are exit cases. Each exit case lists its exit values in `inputs.json` and expects a payout per holder at each value, plus the full breakpoint list.
