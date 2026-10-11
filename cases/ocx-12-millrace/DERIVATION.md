# OCX case 12: Millrace written as OCX 0.5

Millrace's cap table after its Series B, the table `millrace`'s exit pays on, written as an OCX 0.5 workbook. With its four blanks answered, it imports to that table (C18, 06e5).
- **Prices** are read to OCX's 15 significant digits.
- **Anti-dilution** is read as none.

Only the format's tab names, headers and row labels come from the Coalition's reference. The titles and footnotes are our own. Every holder, class and number is Millrace's.

## The workbook

- **Layout 0.4/0.5,** label 0.5 (`version_label`, field `0.5`).
- **The as-of date:** "As of 2025.03.31", the Series B's date. So `as_of` is 2025-03-31, as the OCF Millrace import's is.
- **Five classes:** Common Stock; under `Preferred Stock`, Seed Preferred (from SAFEs), Seed Preferred, Series A Preferred and Series B Preferred. `read.share_classes` is 5.

### Financing History

| Round | Initial Closing Date | Original Issue Price (stored) | Adjusted Conversion Price (stored) | Conversion Ratio (stored) | Multiple | Participating | Cap |
|---|---|---:|---:|---:|---:|---|---:|
| Seed Preferred (from SAFEs) | 2022.06.30 | 0.38493003156426259 | 0.38493003156426259 | 1 | 1.5 | N | N/A |
| Seed | 2022.06.30 | 0.46351485033889622 | 0.46351485033889622 | 1 | 1.5 | N | N/A |
| Series A | 2023.09.30 | 2.0754715977033578 | 1.8247520241780557 | 1.1373992576543306 | 1.25 | Y | 2.75 |
| Series B | 2025.03.31 | 1.0821118249932409 | 1.0821118249932409 | 1 | 2 | Y | N/A |

- **Each price is the binary double nearest Millrace's exact price,** written to 17 significant digits, as Excel writes it.
- **The rounds match the classes** (OX14). "Seed" is "Seed Preferred" less "Preferred". "Seed Preferred (from SAFEs)" has no trailing "Preferred", so its round carries its whole name. "Series A" and "Series B" are their classes less "Preferred". `read.financing_rounds` is 4.

### The holders

| Stakeholder | Common Stock | Seed Preferred (from SAFEs) (outstanding) (1.0000) | Seed Preferred (outstanding) (1.0000) | Series A Preferred (outstanding) (1.1374) | Series A Preferred (as converted) | Series B Preferred (outstanding) (1.0000) | 2021 Stock Plan Options | 2022 Stock Plan Options | 2023 Stock Plan Options |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ana Ortiz | 5,500,000 | | | | | | | | |
| Dev Patel | 4,500,000 | | | | | | | | 250,000 |
| Lena Fischer | 638,297 | | | | | | 40,000 | | 300,000 |
| Other employees | | | | | | | 450,000 | 1,100,000 | 2,250,000 |
| Priya Shah | | 779,362 | | | | | | | |
| Marcus Lee | | 389,681 | | | | | | | |
| Harbor Lane Ventures Fund I | | | 5,393,570 | 1,445,454 | 1,644,058 | | | | |
| Ridgeline Capital Fund III | | | | 4,336,363 | 4,932,176 | | | | |
| Cobalt Family Office LLC | | | | | | 9,241,189 | | | |
| *Options Remaining for Issuance* | | | | | | | | | 5,101,136 |

Blank cells are 0 in the workbook. `Non-Plan Awards` is empty throughout, so it makes no class.
- `read.stakeholders` is 9, and `read.pool_rows` 1.

**One plan per strike,** as in case 09: Millrace's grants are at $0.05, $0.11 and $0.42, and 0.4/0.5 heads option columns by plan, never strike (OX14). So the workbook writes three plans:
- **2021:** the $0.05 grants, 490,000
- **2022:** the $0.11 grants, 1,100,000
- **2023:** the $0.42 grants, 2,800,000, and the 5,101,136 left to grant

Stock Plan Details lists the three. `read.stock_plans` is 3.

## The import (OX14)

**The prices, read to 15 significant digits** (OX5):

| Class | Issue price | Conversion price | Ratio |
|---|---:|---:|---:|
| Seed Preferred (from SAFEs) | 0.384930031564263 | 0.384930031564263 | 1 |
| Seed Preferred | 0.463514850338896 | 0.463514850338896 | 1 |
| Series A Preferred | 2.07547159770336 | 1.82475202417806 | 1.13739925765433 |
| Series B Preferred | 1.08211182499324 | 1.08211182499324 | 1 |

**The ratio checks** (O4, with 15 digits):
- **The seeds and Series B:** the two prices read the same, so their quotient is exactly 1, the ratio, a whole number. Exact, with no line.
- **Series A:** all 15 digits of each price are written, so each may be off by half a unit in its 15th.
  - The issue price is 2.075471597703355 to 2.075471597703365.
  - The conversion price is 1.824752024178055 to 1.824752024178065.
  - So the quotient can be anything from 1.137399257654323 to 1.137399257654335.
  - **The ratio,** written to 15 digits, is 1.137399257654325 to 1.137399257654335.
  - They overlap, so it passes. 2.07547159770336 ÷ 1.82475202417806 isn't exactly 1.13739925765433, so it's read with a `conversion_ratio_rounded` line.

**The other terms:**
- **The seeds:** multiple 1.5, "N", so non-participating.
- **Series A:** multiple 1.25, "Y" with a cap of 2.75, so `participating_capped` with `cap_multiple` "2.75", and a `participation_cap_includes_preference` line.
- **Series B:** multiple 2, "Y" with "N/A", so `participating` with no cap.
- **Every series:** anti-dilution "none", a `no_anti_dilution_field` line each. Seniority is blank, with `no_seniority_field`.

**The options:** `options_1` (2021), `options_2` (2022) and `options_3` (2023), each named by its heading, its strike blank (`no_strike_field`).

**The pool:** 5,101,136, summed across the three option columns, against 5,101,136 summed across the three plans.

**The checks:**
- **Totals:**
  - **The per-holder `Total` row's holdings columns:** 10,638,297 common; 1,169,043, 5,393,570, 5,781,817 and 9,241,189 preferred outstanding; Series A's 6,576,234 as converted. Under the plans: 490,000, 1,100,000, and 2,800,000 + 5,101,136 = 7,901,136.
  - **The Summary's `Outstanding Shares`:** they agree with each column's holders.
- **`(as converted)`,** within a share of outstanding × 2.07547159770336 ÷ 1.82475202417806:
  - Harbor Lane's 1,445,454 gives 1,644,058.31…, against 1,644,058.
  - Ridgeline's 4,336,363 gives 4,932,176.06…, against 4,932,176.
- **The liquidation preferences,** within a cent of outstanding × issue price × multiple:

  | Class | Summary (stored) | Outstanding × price × multiple |
  |---|---:|---:|
  | Seed Preferred (from SAFEs) | 674,999.63833497034 | 674,999.638334971… |
  | Seed Preferred | 3,749,999.6870135404 | 3,749,999.687013538… |
  | Series A Preferred | 14,999,996.208273044 | 14,999,996.208273059… |
  | Series B Preferred | 19,999,999.787794925 | 19,999,999.787794909… |

  Each differs by billionths of a dollar: the spreadsheet multiplies the stored binary prices, and the check the 15-digit ones.

**The issue order:** by closing date. The two seed rounds share 30 June 2022, so they go in Financing History's order (OX14): `["seed_preferred_from_safes", "seed_preferred", "series_a_preferred", "series_b_preferred"]`.

**The report:**
- **`read`:** stakeholders 9, pool rows 1, share classes 5, stock plans 3, financing rounds 4. Nothing set aside.
- **The notes:**
  - `version_label`
  - O11's four
  - `no_seniority_field`
  - Series A's `conversion_ratio_rounded` and `participation_cap_includes_preference`
  - four `no_anti_dilution_field`
  - three `no_strike_field`

## The blanks, answered

| Blank | Answer | Why |
|---|---|---|
| `options_1`'s strike | "0.05" | the 2021 plan's grants are Millrace's $0.05 options |
| `options_2`'s strike | "0.11" | the 2022 plan's, its $0.11 options |
| `options_3`'s strike | "0.42" | the 2023 plan's, its $0.42 options |
| seniority | `[["series_b_preferred"], ["series_a_preferred"], ["seed_preferred_from_safes", "seed_preferred"]]` | Millrace's: Series B senior, then Series A, then the two seed classes pari passu |

## Against the locked table

**Renamed:**
- **The holders**, named in full: `ana` to `ana_ortiz`, `dev` to `dev_patel`, `lena` to `lena_fischer`, `priya` to `priya_shah`, `marcus` to `marcus_lee`, `harbor_lane` to `harbor_lane_ventures_fund_i`, `ridgeline` to `ridgeline_capital_fund_iii`, and `cobalt` to `cobalt_family_office_llc`. "Other employees" keeps `other_employees`.
- **The classes:** `common` to `common_stock`, `seed_safes` to `seed_preferred_from_safes`, `seed` to `seed_preferred`, `series_a` to `series_a_preferred`, and `series_b` to `series_b_preferred`.
- **The options:** `options_0.05` to `options_1`, `options_0.11` to `options_2`, and `options_0.42` to `options_3`.

**The prices** (`price_digits` 15): each locked price, an exact fraction, rounded half up to 15 significant digits, is the price the import reads:
- 455000/1182033 is 0.384930031564263
- 518700000/1119057997 is 0.463514850338896
- Series A's 3900000/1879091 is 2.07547159770336, and its conversion price is 1.82475202417806
- 12003689592480000/11092836539841877 is 1.08211182499324

**With the answers, the import is the locked table.** Every holder and name, every position, the pool, each series' multiple, participation and cap, the strikes and the seniority tiers agree. **Compared as OCX carries them:**
- **Series A's anti-dilution,** "broad_based" in the locked table, is read as "none" (OX7). At a sale it changes nothing: the conversion price already holds the 2023 adjustment.
- **The option classes' names** come from their columns' headings.

**That the import pays as Millrace does,** within a cent, as 04b2 showed for OCF's 10-place prices, comes with `readOcx` in 06f.
