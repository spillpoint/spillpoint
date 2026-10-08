# OCF case 11, Millrace in OCF: derivation

Millrace's cap table after its Series B (`cases/millrace`), written by hand as an OCF 1.2 package as of Mar 31, 2025 (`package/`).

OCF carries what was issued, not the terms of the rounds that issued it. So the package writes what Millrace's rounds produced:
- each issuance, at the price its round set
- the SAFEs' conversions at the Seed
- the option grants
- the pool's size after each round
- Series A's new conversion price after the Series B's anti-dilution

Its import, worked out below, is **the locked cap table with each price rounded to 10 places**. From 04d the engine pays it at Millrace's locked exit values and breakpoints and checks it against Millrace's `expected.json`, within a cent.

## Prices to 10 places

OCF writes numbers to at most 10 decimal places, and none of Millrace's prices terminates. So the package writes each one to 10 places, rounded to nearest, as an export would (Jordan, 04b review). Everything else is written exactly.

| Price | Exact, in the locked table | Written | Written − exact |
|---|---|---|---|
| Seed Preferred (from SAFEs) | $455,000 ÷ 1,182,033 | 0.3849300316 | +3.6 × 10⁻¹¹ |
| Seed Preferred | $518,700,000 ÷ 1,119,057,997 | 0.4635148503 | −3.9 × 10⁻¹¹ |
| Series A, issue price | $3,900,000 ÷ 1,879,091 | 2.0754715977 | −3.4 × 10⁻¹² |
| Series A, conversion price after the Series B | a 30-digit fraction | 1.8247520242 | +2.2 × 10⁻¹¹ |
| Series B | a 17-digit fraction | 1.0821118250 | +6.8 × 10⁻¹² |

## The package and its import

| OCF | Cap table |
|---|---|
| Nine stakeholders | the nine holders, with Millrace's names and ids |
| Common Stock: Ana 5,500,000, Dev 4,500,000, Lena 638,297 | `common`, the same positions |
| Priya's and Marcus's SAFEs: $300,000 and $150,000, post-money, a $5,000,000 cap, an exit multiple of 1, both seniority 1 | converted at the Seed (below), so none is outstanding |
| The SAFEs' conversions at the Seed: 779,362 and 389,681 shares of Seed Preferred (from SAFEs) | Priya 779,362 and Marcus 389,681 `seed_shadow` |
| Seed Preferred (from SAFEs): 0.3849300316, 1.5x, participation cap 1.5, 1 for 1, seniority 2 | `seed_shadow`: non-participating, a cap equal to the preference (O4) |
| Seed Preferred: 0.4635148503, 1.5x, participation cap 1.5, 1 for 1, seniority 2. Harbor Lane 5,393,570 | `seed`, non-participating, the same position |
| Series A Preferred: 2.0754715977, 1.25x, participation cap 2.75, 1 for 1, seniority 3. Ridgeline 4,336,363, Harbor Lane 1,445,454 | `series_a`: participating, capped at 2.75x |
| Series A's conversion ratio adjustment, Mar 31, 2025: conversion price 1.8247520242, ratio 1.1373992577 for 1 | Series A converts at 1.8247520242 (O4; the ratio below) |
| Series B Preferred: 1.0821118250, 2x, no participation cap, 1 for 1, seniority 4. Cobalt 9,241,189 | `series_b`: participation **blank, to fill in** (O4) |
| Seniority 4, then 3, then 2 | tiers `[series_b]`, `[series_a]`, then `[seed_shadow, seed]` pari passu |
| The 2021 plan: 1,182,033 reserved, raised to 4,373,370 at the Seed, 5,926,363 at the Series A and 9,491,136 at the Series B | |
| Grants at $0.05: Lena 40,000, other employees 450,000 | `options_0.05` |
| Grants at $0.11: other employees 1,100,000 | `options_0.11` |
| Grants at $0.42: Dev 250,000, Lena 300,000, other employees 2,250,000 | `options_0.42` |
| | the pool: 9,491,136 − 4,390,000 granted = **5,101,136** |

**Where the import differs from the locked table, and why none of it changes a payout:**
- **Prices:** to 10 places, as above.
- **Series B's participation:** blank. OCF has no participation flag, and a class with no participation cap could be non-participating or participating without a cap (O4; answer 3). The check fills it in as "participating", as you would on the page.
- **Series A's anti-dilution:** none, since OCF has no field for it (O11). The locked table says broad-based. At an exit only the conversion price it produced matters, and that's written.
- **Conversion ratios:** not carried. The engine converts at the conversion price.
- **The order of classes:** the import lists them as the package defines them, the locked table as the rounds created them. Order doesn't change a payout, so the check compares them in no order.

## Series A's ratio (O4)

The conversion price governs: the ratio should be the issue price ÷ the conversion price.
- **As written,** 2.0754715977 ÷ 1.8247520242 = 1.13739925764, to 11 places.
- **The written ratio** is 1.1373992577, 6.1 × 10⁻¹¹ more.

Each of the three numbers is written to 10 places, so each could be off by half a unit in its tenth place, 5 × 10⁻¹¹. Within those bounds:
- the quotient can be anything from 1.1373992575802 to 1.1373992576974
- the ratio from 1.13739925765 to 1.13739925775

**The two ranges overlap,** so the ratio agrees with the conversion price as far as the written numbers can say, and the class is read. It isn't exact, so the report says so (`conversion_ratio_rounded`).

## The report

- **Read:** a count of each object in the package.
- **Not needed:** nothing.
- **Notes:**
  - one line each for the four terms OCF has no field for: dividends, conversion groups, a carve-out, the sale's date
  - convertible seniority ignored, since the two SAFEs share seniority 1
  - for each of the four preferred classes:
    - no anti-dilution field
    - conversion rounding not modeled
  - the cap read as including the preference, for the three classes with a cap
  - Series A's ratio, rounded

## Paying it, from 04d

The engine fills in Series B's participation as "participating" and pays the import at Millrace's 19 locked points: nine listed exit values and ten breakpoints.

**What's compared:**
- **Payouts,** each line and each holder's and class's total: within one cent of Millrace's `expected.json`.
- **Breakpoints:** the same ten, each within a cent of the locked one, with the same reasons and the same jump flags.
- **Decisions:** the same as Millrace's at every listed exit value and at every breakpoint, with one adjustment at breakpoints, below.
- **The cap table:** the same as the locked one apart from the differences above, exactly.

**Where the cent comes from.** Every case's payouts are recorded to the cent, so every case is already checked to within a cent (E14). Beyond that recording, the only difference here comes from rounding the prices. Measured against the engine's exact answer for Millrace's own table, the rounding moves:
- a payout line by at most **$0.00043** (Ridgeline's Series A, at $300M)
- a holder's or class's total by at most **$0.00058**
- a breakpoint by at most **$0.0021** (Seed converting, at $59,687,473.06)

Against Millrace's recorded cents, the largest difference is **$0.0050** (Lena's common, at $75M). Almost all of that is the recording to the cent.

**Decisions at a breakpoint.** At four of the ten breakpoints a decision changes:
- the three option strikes coming into the money ($40,747,781.34, $42,364,524.56, $51,058,697.87)
- Seed converting ($59,687,473.06)

Rounding puts each of these between $0.00016 and $0.0021 *below* the locked one. So at the locked exit value itself, the import is just past its own breakpoint: those options are exercised, or Seed converts. Millrace records the tie-break's choice there instead: no exercise, no conversion (E5).

At a breakpoint both choices pay the same, so the payouts still agree to within $0.0004. Decisions at the breakpoints are therefore compared at the import's own breakpoints, where all ten give Millrace's.
