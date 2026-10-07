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

A breakpoint is any exit value where any holder's payout formula changes, which on a straight stretch is a slope change. Payouts are usually straight lines between breakpoints; where one curves, as when a carve-out paid alongside the preferences shares a tier that isn't paid in full (`ASSUMPTIONS.md` X17), the curved stretch is flagged. Report every breakpoint in the analysis range, exact to $0.01, each with a plain-English reason. Possible reasons:
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
  - The SAFE converts into a series of its own, named for the new series "(from SAFEs)", with the new series' rights and preference multiple. Its per-share preference and conversion price are based on the SAFE's own conversion price.
- **Pre-money SAFEs and convertible notes.** Inputs: principal, simple interest, cap, and discount.
  - A note converts principal plus simple interest, at the lower of its cap price and its discount price. Its pre-money cap divides by the share count just before the round, with the pool as it stood then; what that count includes is a toggle.
  - A pre-money SAFE follows the YC text: its Company Capitalization counts the pool including the increase made in the financing, and no SAFE or note.
  - Each converts into a series of its own, with the new series' rights, priced at its conversion price.
- **Pro-rata rights.** NVCA definition: the investor may buy a share of the new round equal to its pre-round fully diluted percentage. It is not the amount needed to hold that percentage after the round. When a pool top-up sits in the pre-money, the investor ends below its pre-round percentage.
- **Anti-dilution.**
  - Broad-based weighted average is the default. Narrow-based weighted average and full ratchet are the alternatives.
  - Weighted average uses the NVCA formula: CP2 = CP1 × (A + B) ÷ (A + C), where:
    - CP1 is the conversion price in effect immediately before the new issue.
    - A is the number of common shares outstanding immediately before the new issue, as converted. It counts outstanding common, all outstanding options (as if exercised), and all outstanding preferred and other convertible securities (as if converted). It excludes the unissued pool, including any pool increase made in the same financing. Toggle: include the unissued pool in A.
    - B is the aggregate consideration received for the new issue ÷ CP1.
    - C is the number of new shares issued, as converted.
    - Narrow-based A counts only the outstanding preferred, as converted.
  - Anti-dilution changes the conversion ratio, never the preference amount.
- **Pay-to-play.** Holders who don't take their pro-rata at the round have their preferred converted to common at a ratio given as an input, one per series.
  - A holder's pro-rata is its share, as converted, of the listed series' shares × the amount the round offers them. A holder in several listed series has one total requirement.
  - A holder that buys only part of its pro-rata converts all its preferred of the listed series, or, under a toggle, the fraction it didn't buy.
  - The conversion comes before anti-dilution: holders who convert get no adjustment, and A counts the cap table after the conversion.

## Exit terms (M5)

- **Cumulative dividends.** Inputs: rate, simple or compounding, accrual start date, and exit date. Unpaid dividends add to the preference. By default they're forfeited on conversion, as a toggle.
- **Warrants.** Treated like options, but can be for common or for a preferred series.
- **Management carve-out.** A percentage of proceeds, flat or tiered by exit value, paid to listed people before preferences. Toggle: paid alongside preferences instead.
- **Escrow and earnouts.** Proceeds come as a schedule: a closing payment plus later payments. Run the waterfall on cumulative proceeds, so each later payment goes where it would have gone if it had been paid at closing. Show each holder's take per payment.
- **Unconverted post-money SAFE at exit (Liquidity Event).** The holder gets the greater of the purchase amount or the as-converted value at the Liquidity Price. Take the priority order from the YC text.
- **Unconverted note at exit.** Repayment (a multiple of principal plus interest) or conversion, per the note's terms, which are inputs.

## Rounding

- Prices are exact.
- Share counts round down to whole shares at every issuance and conversion in a financing.
- At exit, as-converted shares are exact (fractional), with no rounding. This is economically the same as an actual conversion, which rounds down and pays cash in lieu of the fraction. Rounding down without cash in lieu would short the holder by up to one share's value, which exceeds the $0.01 tolerance.
- Payouts stay exact internally and display to the cent.
- Test tolerances: payouts within $0.01, shares within 1, breakpoints within $0.01.

## Edge cases (M1)

Each edge case isolates one behavior before Millrace combines them. Where a case has variants, it uses the same inputs with one term changed.

1. Common stock only.
2. One series, 1x non-participating: the conversion point.
3. One series, 1x participating, uncapped.
4. One series, participating and capped: the cap is hit, then the series converts.
5. Two series, stacked vs. pari passu.
6. Two non-participating series in one tier with different per-share preferences: per-series conversion vs. forced class conversion. 6d: a conversion group whose pivotal voter is indifferent over a range, then prefers converting (E13).
7. Options at several strikes: in-the-money thresholds and strike cash.
8. A warrant for preferred.
9. Cumulative dividends: they accrue, then are forfeited on conversion. 9b compounds them; 9c pays them on conversion.
10. A management carve-out. 10b pays it alongside the preferences.
11. An earnout: a closing payment plus one later payment.
12. An unconverted post-money SAFE at exit. 12b adds a discount to the cap; 12c has a discount and no cap; 12d sits alongside two tiers of preferred, and 12e ranks its Cash-Out Amount with the senior one. 12f has two SAFEs; 12g is a pre-money SAFE, built from rounds; 12h is an MFN SAFE.
13. A convertible note at exit, before conversion, with its cap's base counted with the pool (13a), without it (13b), and as common only (13c). 13d adds a discount to the cap; 13e has a discount and no cap; 13f sits alongside preferred. 13g has two notes.
14. An option pool top-up in the pre-money.
15. A post-money SAFE converting in a round that tops up the pool, with a discount that beats the cap.
16. One down round under three anti-dilution methods: broad-based, narrow-based, and full ratchet. 16e counts the unissued pool in A; 16f rounds the adjusted conversion price to $0.0001.
17. Pay-to-play: a holder that doesn't pay (17a, 17b), one that pays part of its pro-rata (17c, 17d), in a round that triggers anti-dilution (17e, 17f), and on two series (17g, 17h).
18. Pro-rata rights in a round that converts a SAFE. 18b counts the unissued pool in the pro-rata base; 18c invests beyond the entitlement as an ordinary investment.
19. A convertible note converting in a priced round, with its cap's base counted with the pool (19a), without it (19b), and as common only (19c).
20. A pre-money SAFE converting in a priced round.
21. A note and a pre-money SAFE converting in the same round.
22. Warrants issued, counted like options in a priced round's price, its pool top-up and a converting SAFE's Company Capitalization.
23. Cumulative dividends on a priced round's series, carried by its series from SAFEs on its own issue price, followed by a sale.

Cases 14–23 are round cases, so their expected outputs are cap tables; 23 also runs an exit on its last one, as Millrace and 12g do. The rest are exit cases. Each exit case lists its exit values in `inputs.json` and expects a payout per holder at each value, plus the full breakpoint list.
