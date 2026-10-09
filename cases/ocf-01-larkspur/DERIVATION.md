# OCF case 01, Larkspur Instruments: derivation

A fictional company, written by hand in Open Cap Format, version 1.2, as of **June 30, 2025**. It uses every kind of OCF object the importer reads. Most transactions appear once, a few twice, so every rule in `docs/ASSUMPTIONS.md`'s OCF section (O1–O12) is exercised. The package is in `package/`. Its transactions file is deliberately out of date order: the importer applies them by date (O2).

`expected.json` is the import worked out below:
- **The cap table:** in the case-file format, with blanks (`null`) where OCF doesn't settle a term.
- **The terms to fill in.**
- **The report:** what was read, what wasn't needed, and each note.

No payouts: this case tests reading. Some terms are left blank, and its SAFEs sit beside a note, which the engine refuses at a sale (X12). So it can't be paid until you fill it in.

## Holders (O3)

Twelve stakeholders, ten kept. **Employee E** and **Advisor F** hold nothing on June 30, 2025, so they're left out and listed:
- **Employee E:** E's one option was cancelled.
- **Advisor F:** F's one option was cancelled.

## Classes (O4)

| Class | What OCF gives | In the cap table |
|---|---|---|
| **Common Stock** | common; a liquidation preference multiple of 1 | common. The preference field is ignored, with a report line. |
| **Seed Preferred** | price $1.00; preference 1x; **no participation cap**; converts at $1.00, 1 for 1, then adjusted to $0.80, 5 for 4 (tx-57); seniority 2 | OIP $1.00, CP **$0.80**, 1x. **Participation blank:** with no cap, OCF can't say whether it's non-participating or participating without a cap. |
| **Series A Preferred** | price $2.00; preference 1x; **participation cap 3**; converts at $2.00, 1 for 1; seniority 3; an unrecognized field, `board_seat` | OIP $2.00, CP $2.00, 1x, **participating, capped at 3x** (cap above the preference). OCF doesn't say whether the cap includes the preference; spillpoint reads it as including it, as E7 does, and the report says so. |

**Checking the adjusted ratio:** the conversion ratio must agree with the price over the conversion price (O4). Prices written to 2 places are exact, and so is a ratio in whole numbers: $1.00 ÷ $0.80 = 1.25 = 5 ÷ 4 exactly, so there's no report line for it.

**Seniority:** a higher number is more senior, so Series A, then Seed, each a tier of its own.

**Anti-dilution** is "none" on both: OCF has no field for it, and each gets a report line. So does each class's conversion rounding, `NORMAL`: the engine converts without rounding.

**`board_seat` on Series A is deliberately not an OCF field.** It's there to test the report's line for an unrecognized field, so don't take this package as a valid OCF example: a schema validator would reject it.

## Shares (O5), security by security

**Common Stock:**
- **Founder A.**
  - sec-a1: 3,000,000, doubled by the 2-for-1 split (tx-03) to **6,000,000**.
  - tx-13 transfers 500,000 to Founder B and closes sec-a1. The 5,500,000 left is sec-a2 (6,000,000 − 500,000 reconciles).
  - tx-54 cancels 100,000 of sec-a2 with no balance security, so sec-a2 keeps the rest: **5,400,000**.
- **Founder B.**
  - sec-b1: 1,500,000. It's reissued for the split (tx-04, naming tx-03) as sec-b2, 3,000,000 = 1,500,000 × 2, so the split isn't applied to it a second time. sec-b2 is issued on the split's own date, so it's taken as already split.
  - tx-16 repurchases 100,000 of sec-b2, leaving the balance sec-b4: 2,900,000.
  - sec-b3: 500,000, from Founder A.
  - tx-24 consolidates sec-b3 and sec-b4 into sec-b5: 3,400,000 = 500,000 + 2,900,000. Total **3,400,000**.
- **Employee C:** sec-c1, **50,000**, from exercising opt-c1.
- **Employee D:** sec-d1, **10,000**, from the RSU release.
- **Investor Y:** sec-y3, **250,000**, from converting Seed: 200,000 × 1.25.
- **Lender L:** sec-l1, **20,000**, from exercising war-l0.

Common: 9,130,000 shares.

**Seed Preferred:**
- **Investor X:** sec-x1, **2,000,000**.
- **Investor Y:**
  - sec-y0, 500,000, is retracted (tx-20): entered in error, as if never issued.
  - sec-y1, 1,000,000: tx-58 converts 200,000 to common, leaving the balance sec-y4, **800,000**.
- **Investor S:** sec-s1, **125,000**, from converting the first SAFE (tx-22). They were issued at $0.80, not the class's $1.00. They get the class's terms, $1.00 of preference each, and the report notes the other price.

Seed: 2,925,000 shares.

**Series A Preferred:** Investor Y **1,500,000**, Investor X **500,000**.

## Options and RSUs (O6)

| Grant | Its history | Outstanding |
|---|---|---|
| opt-c0, C, 25,000 at $0.05 | expired Jan 20, 2025, before June 30 | left out, and listed |
| opt-c1, C, 200,000 at $0.10 | 50,000 exercised (tx-10); repriced to **$0.08** (tx-27) | **150,000 at $0.08** |
| opt-d1, D, 100,000 at $0.10 (written with the older name `TX_PLAN_SECURITY_ISSUANCE`) | 20,000 transferred to the D Family Trust (opt-dt1), leaving the balance opt-d2 | **80,000 to D, 20,000 to the trust, at $0.10** |
| opt-e1, E, 50,000 | cancelled (tx-34) | none |
| opt-x0, X, 10,000 | retracted (tx-36) | none |
| rsu-d2, D, 40,000 RSUs | 10,000 released (tx-29) | **30,000, as $0-strike options** |
| opt-f1, F, 10,000 (the 2025 plan) | cancelled, and returned to that plan (tx-65, tx-66) | none |

**Option classes, by strike:** $0.08: C 150,000. $0.10: D 80,000 and the trust 20,000. RSUs at $0: D 30,000.

## The pool (O6)

**The 2023 plan** returns a cancelled grant to the pool. Expired is treated as cancelled, which is my decision, O6. So its pool is what's reserved, less what's outstanding and what's been delivered:
- **Reserved:** 1,000,000, raised to 1,500,000 (tx-26).
- **Outstanding grants:** 150,000 + 80,000 + 20,000 + 30,000 = 280,000.
- **Delivered:** 50,000 exercised + 10,000 released = 60,000.
- **Pool:** 1,500,000 − 280,000 − 60,000 = **1,160,000**.

**The 2025 plan** decides per grant: only a return-to-pool transaction returns a cancelled grant.
- **Reserved:** 100,000.
- **opt-f1:** its 10,000 were cancelled, and tx-66 returns all 10,000.
- **Pool:** **100,000**.

**Unissued pool: 1,260,000.**

## Warrants (O7)

- **war-l1:** Lender L, 100,000 Seed at $1.00. 25,000 transferred to Investor X (war-x1), leaving the balance war-l3, 75,000.
- **war-l0:** exercised (tx-45): closed.
- **war-l2:** cancelled in full: closed.
- **war-l4:** retracted.

**One warrant class:** Seed at $1.00, with **X 25,000** and **L 75,000**.

## SAFEs and notes (O8, O9)

**safe-s0** converted in the Seed (tx-22). **safe-s9** was retracted. **safe-s1** ($500,000):
- tx-61 transfers $250,000 to Investor X (safe-x1), leaving the balance safe-s3, $250,000 (reconciles).
- **Both outstanding:** post-money, capped at $12,000,000, with a 20% discount.
- **No `exit_multiple`:** read as 1x, a SAFE's Cash-Out Amount being its purchase amount. Each gets a report line.

**note-n0** ($50,000) was cancelled in full (repaid). **note-n1** ($250,000) is outstanding:
- **Interest:** 6% simple, Actual/365, accruing daily from Oct 1, 2024, payable at conversion.
- **The cap:** $10,000,000, divided by the shares outstanding, options and unissued pool, read from its capitalization rules, so "with pool". The cap is read as pre-money, the only kind the engine models, with a report line.
- **Discount:** 20%.
- **Repayment multiple:** blank. It has no `exit_multiple`, and you asked not to assume 1x.

Every convertible gives seniority 1, so it's ignored, with one report line (O8).

## Terms to fill in

- **Seed Preferred's participation.**
- **note-n1's repayment multiple.**

## Notes in the report

- **Fields OCF lacks** (one line each): dividends, conversion groups, a carve-out, the sale date.
- **Convertible seniority** ignored.
- **Common's preference field** ignored.
- **Series A's cap read as including its preference.**
- **No anti-dilution field** (Seed, Series A).
- **Conversion rounding not modeled** (Seed, Series A).
- **An unrecognized field** (`board_seat` on Series A).
- **Seed issued at another price** (sec-s1).
- **An expired option left out** (opt-c0).
- **An RSU read as an option** (rsu-d2).
- **A SAFE's missing exit multiple read as 1x** (safe-x1, safe-s3).
- **A note's cap read as pre-money** (note-n1).
- **Two stakeholders left out** (E, F).
