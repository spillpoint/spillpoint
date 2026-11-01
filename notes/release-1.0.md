# spillpoint 1.0

Started in 10c. The release step finishes it.

## Fixed since 0.7.0

1. **`prepare` works on its own frozen copy of the cap table** (10c).
   - **What was wrong:** `prepare` worked out, once, the quantities every waterfall run needs, such as each series' shares and preference, and kept them with the table it returned. That table held your own cap table, so a change to your table after `prepare` left `solve`, `payout`, `findBreakpoints` and `paySchedule` mixing the old quantities with the new positions. On 0.7.0, take edge-02 with Founder A's common multiplied by 10 after `prepare`. At $5M, common was paid $0.25 a share where $0.0323 is right, and Founder A got $15,000,000 out of a $5,000,000 sale.
   - **The same bug in two other places:**
     - **A table written by hand,** `{ capTable, exitDate }`, had its quantities kept the same way on first use.
     - **A post-money SAFE's share of the Liquidity Capitalization** was kept with the SAFE's own object. So a changed purchase amount or cap was missed even by a fresh `prepare`.
   - **Now:**
     - **`prepare` copies the cap table it's given and freezes the copy,** down to every Decimal, and freezes the table it returns. Your table is never frozen or changed, and changing it changes nothing a prepared table gives. To run a changed table, edit yours and prepare it again.
     - **A table written by hand still works,** worked out afresh on each call, so a change between calls is always seen.
     - **Each answer's decisions are its own copies.** On 0.7.0 an answer could hand back a set the solver kept for the next exit value, so adding to one answer's `exercised` changed the next answer.
   - **TypeScript reports:** an assignment to a prepared table's `capTable` or `exitDate`: "Cannot assign to 'capTable' because it is a read-only property" (TS2540). `PreparedCapTable`'s two fields are now `readonly`.
     - **Nothing deeper is marked.** A deeply readonly cap table couldn't be passed where a `CapTable` is expected, so `pc.capTable` still can be.
     - **An assignment inside the table still compiles,** to a position's shares for example, and throws when it runs.
   - **JavaScript sees:**
     - Assigning to a prepared table, or to anything in it, throws a `TypeError`.
     - A prepared table's `capTable` is a copy of the table you passed: equal to it, but not the same object.
   - **What to change:** code that changed a table after preparing it should prepare it again after the change. Until now it was getting wrong payouts.
   - **Changed answers:** none, for code that doesn't change a table after preparing it. Every exit case gives the same breakpoints, reasons, answers and payment takes as 0.7.0, to every digit.
2. **`toCents` can't show an amount that's exactly a half cent a cent low** (10d).
   - **What was wrong:** 40-digit arithmetic can leave an amount that's exactly a half cent in exact arithmetic a hair under it, and `toCents`, rounding half-up straight to the cent, then showed it a cent low. On 0.7.0, two holders of common, A and B, each paid exit value × shares ÷ total:

     | Exit value | A's shares | B's shares | A's exact amount | `toCents` on 0.7.0 | Now |
     |---|---:|---:|---|---|---|
     | $203,850,394.65 | 45 | 117 | $56,625,109.625 | 56625109.62 | 56625109.63 |
     | $534,108,039.85 | 459 | 3 | $530,639,805.825 | 530639805.82 | 530639805.83 |
     | $21,408,024.33 | 33 | 129 | $4,360,893.845 | 4360893.84 | 4360893.85 |
     | $21,408,024.33 | 45 | 117 | $5,946,673.425 | 5946673.42 | 5946673.43 |

     The first comes out of the engine as 56625109.62499999999999999999999999999998.
   - **Now:** `toCents` rounds to 20 places, half-up, then to the cent, half-up. An amount whose exact denominator is under about 10^18 can't sit within 10^-20 of a half cent without being on it, so only true ties move. The engine's reasons and messages round the same way. So does the page: every amount, percentage and price it shows half-up, and a price it shows to the cent when it's exact.
   - **Rounding down, too:** a round's refusal of a pro-rata investment above the entitlement says what to mark as pro-rata, the entitlement rounded down to the cent. It now treats an amount within 10^-20 under a cent as that cent. Before, an investor with a third of the shares before a $3,000,000 round was told to mark $999,999.99, a cent less than its $1,000,000.00 entitlement.
   - **TypeScript reports:** nothing. No type changed.
   - **JavaScript sees:** `toCents` gives the cent above where it gave the cent below, for an amount that's exactly a half cent and came out a hair under. Nothing else it gives changes. The pro-rata refusal's message can say a cent more, the whole entitlement.
   - **What to change:** nothing.
   - **Changed answers:** none in the locked cases. Of the 9,322 amounts the exit cases give, none rounds differently, and every case matches the reference as before. The amounts themselves are unchanged: only how they're shown.

## Reads more since 0.7.0

1. **`readOcx` reads a workbook whose Financing History lacks a participation column** (10f, 10g).
   - **What was wrong:**
     - **In the 0.4/0.5 layout,** 0.7.0 required both `Participating (Y/N)` and `Participation Cap` in Context's Financing History, and refused a workbook without either: `missing_header`, "Context: Participating (Y/N)". The one Carta export tried so far, in the 0.4/0.5 layout, had no `Participating (Y/N)`. It had every header checked before that one: those the layout needs on `Summary Snapshot` and `Stakeholder Snapshot`, and Financing History's `Round` through `Liquidation Multiple`. Whether it has `Participation Cap` and Stock Plan Details' headers, which are checked after it, isn't known.
     - **In the 0.7 layout,** where a workbook has a Financing History, neither column was required. But with `Participating (Y/N)` there and no `Participation Cap`, a "Y" was read as uncapped participating. That's a guess: the cap may only be missing.
   - **Now:** in either layout, a Financing History without one of the two columns is read without either.
     - **Each preferred series' participation is blank to fill,** never guessed (O1). Its other terms are read as before.
     - **A new report note, `no_participation_column`,** names each missing column as its subject. It's listed under Stable from 1.0.
     - **A header in its place that isn't OCX's** is still an `unrecognized_field` note.
     - **A 0.7 workbook with no Financing History** is unchanged: everything it would give is blank, with `no_financing_history`.
   - **TypeScript reports:** nothing. No type changed, and an import note's `code` is a string.
   - **JavaScript sees:** `readOcx` returns an import with blanks where it threw an `ImportRefusal`. A 0.7 workbook with a Y/N column and no cap column now returns participation blank to fill, where it returned uncapped participating.
   - **What to change:** nothing. Code that fills an import's blanks, as the page does, asks for participation as it does for any blank. Code that matches report notes may meet the new code.
   - **Changed answers:** none. No locked case or fixture is changed by it, and every case gives the same results as 0.7.0.
