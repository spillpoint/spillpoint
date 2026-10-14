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
   - **TypeScript reports:** nothing. No type changed.
   - **JavaScript sees:**
     - Assigning to a prepared table, or to anything in it, throws a `TypeError`.
     - A prepared table's `capTable` is a copy of the table you passed: equal to it, but not the same object.
   - **What to change:** code that changed a table after preparing it should prepare it again after the change. Until now it was getting wrong payouts.
   - **Changed answers:** none, for code that doesn't change a table after preparing it. Every exit case gives the same breakpoints, reasons, answers and payment takes as 0.7.0, to every digit.
