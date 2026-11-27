# spillpoint 1.0: the stability release

1.0 has 0.7.0's API, which 0.7.0's naming review settled (`notes/plan-0.7.0.md`). From 1.0, nothing breaks code written for it before a 2.0: a minor release can add, and a patch release only fixes (the engine README's "Versions"). Since 0.7.0:
- **Four behaviors change, all fixes** (below).
- **One import reads more.**
- **The breakpoint search is faster,** with no answer changed.

The version in `packages/engine/package.json` is 1.0.0; it is published from there.

Open Cap Format (OCF) is developed by the Open Cap Table Coalition: https://open-cap-table-coalition.github.io/Open-Cap-Format-OCF/. spillpoint reads files in that format.

OCX is developed by the Open Cap Table Coalition: https://github.com/Open-Cap-Table-Coalition/ocx. spillpoint reads files in that format.

## Its two gates

1. **An outside waterfall that matches ours: met** (10i). spillpoint reproduces a published outside waterfall exactly: Hustle Fund's worked example in Brian Nichols, ["Waterfall modeling for startup exits: A step-by-step guide"](https://www.hustlefund.vc/post/exit-waterfall-modeling) (August 10, 2026), all 20 payouts and all five breakpoints. It's the locked case `outside-01-hustle-fund`.
2. **A few outside users: open.** 1.0 is ready on main from 10m. It goes on npm, from 10m's merge commit, once a few outside users have tried it. Until then npm has 0.7.0, while the page at spillpoint.io already runs this code, and its footer says 1.0.0.

## Changed answers

**None in the locked cases.** Every exit and round case, OCF case and OCX case gives the same payouts, breakpoints, reasons and tables as 0.7.0, to the cent, the three added since 0.7.0 among them (How it's tested). Each item below says what it changes:
- **`prepare`'s frozen copy:** nothing, for code that doesn't change a table after preparing it.
- **`toCents`:** shows a cent more on an amount that's exactly a half cent and came out a hair under it. No amount in the cases does.
- **The two refusals:** an `InputError` where 0.7.0 paid common a negative amount, or read a blank as an answer.
- **`readOcx`:** blanks to fill where it refused or guessed.
- **The faster search:** a breakpoint can differ past about its 27th significant digit, with no cent changed.

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
3. **Post-money SAFEs that own the whole company or more are refused at a sale** (08b0).
   - **What was wrong:** a post-money SAFE owns its purchase amount ÷ its cap of the company. Where those add up to 100% or more, no Liquidity Capitalization exists, and a sale paid common a negative amount, each row still adding up to the sale. A cap mistyped low enough does this. On 0.7.0, two $100,000 SAFEs and 1,000,000 common, at a $20,000,000 sale:

     | Caps | Together | Founder on 0.7.0 | SAFEs on 0.7.0 | Now |
     |---|---:|---:|---|---|
     | $8,000 and $8,000,000 | 1,251.25% | −$230,250,000.00 | $250,000,000.00, $250,000.00 | refused |
     | $100,000 and $8,000,000 | 101.25% | −$250,000.00 | $20,000,000.00, $250,000.00 | refused |
     | $150,000 and $200,000 | 116.67% | −$3,333,333.33 | $13,333,333.33, $10,000,000.00 | refused |
     | $200,000 and $200,000 | 100% | $9,950,000.00 | $9,950,000.00, $100,000.00 | refused |
     | $200,001 and $200,001 | 99.9995% | $100.00 | $9,999,950.00, $9,999,950.00 | the same: it's right |

   - **Now:** `readCapTable`, `readExit` and `readInputs` throw an `InputError` at the sale, on a table given in full or built from rounds, worded as a priced round's refusal is: "the post-money SAFEs would own the whole company at their caps". It names each SAFE, with its amount, cap and share, gives the total, and says a cap may be mistyped. There's no new term.
     - **The test:** 1 or more over all open post-money SAFEs, whoever would convert. SAFEs with a pre-money cap or no cap aren't counted.
     - **A starting table** isn't a sale, so it reads as it did, and a round refuses them itself.
     - **`prepare` refuses them too,** in the same words, and so do `solve`, `payout`, `findBreakpoints` and `paySchedule` on a prepared table written by hand. A table from `buildCapTables` reaches `prepare` with no reader on the way: on 0.7.0 that path paid the founder −$230,000,000.00 on a $100,000 SAFE at an $8,000 cap. The sale's other limits stay with the readers: they refuse what isn't modeled yet, and this table has no answer.
   - **The same gap at a priced round, closed:** both add the shares up exactly now. Three SAFEs at a third of the company each are exactly 100%, and in 40 digits they came to 0.999…, so on 0.7.0 a priced round converted them, and a sale paid the founder $0.00.
   - **TypeScript reports:** nothing. No type changed.
   - **JavaScript sees:** an `InputError` where a table like those above was read or prepared.
   - **What to change:** correct the cap.
   - **Changed answers:** none in the locked cases. The largest total in `cases/` is 45%, and every case gives the same results as 0.7.0.
4. **An explicit null `unissued_pool`, `conversion_price` or `conversion_base` is refused** (08b0). This one can stop an input that worked on 0.7.0.
   - **What was wrong:** null is how `readOcf` and `readOcx` mark a term to fill in. Most blanks stop `readCapTable`, but these three were read as answers: a null pool as none, a null conversion price as the issue price, and a note's null `conversion_base` as `with_pool`. So a table with them unfilled passed, on a guess nobody made.
   - **Now:** each is an `InputError`, "is blank", saying to give the value or leave the field out. **Left out,** each means what it did: no pool, the issue price, and `with_pool`. So `readCapTable` refuses a table with any blank left.
   - **TypeScript reports:** nothing. No type changed, and a cap table's input is JSON.
   - **JavaScript sees:** an `InputError` from `readCapTable`, `readExit` and `readInputs`, on a `start` event's table, and on a note in a `notes` event, where a null was read.
   - **What to change:** code that fills an import's `to_fill` needs nothing: every null is listed there but a `cap_multiple`, which only capped participation has, and an import never leaves the pool null. An input written by hand with one of the three as `null` should give the value or leave the field out.
   - **Changed answers:** none. No input in the locked cases has one as null, and the page's one-click "Conversion price = issue price" writes the price.

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

## Faster since 0.7.0

1. **The breakpoint search is faster on tables with many SAFEs and option strikes,** with no answer changed (10j): 26 SAFEs of their own amounts beside 5 option strikes take about 3 seconds on a laptop, where they took 26. It takes less memory too: the search lets go what it has passed, and never keeps more of its payout lines than 0.7.0 did. A made-up table of 26 SAFEs at three caps beside 12 option strikes needed about 1.7 GB, near Node's default heap of 2,096 MB, and now about 0.8 GB. Every case gives the same breakpoints, reasons, decisions and payouts to the cent. A breakpoint's exit value can differ from 0.7.0's past about its 27th significant digit, with no cent changed.

## The API, against npm 0.7.0

Checked on the packed build (10m) against npm's 0.7.0 tarball. Its shasum, `93d801e0e9357c706768ed7c20794a71bf4b4a44`, is the one 0.7.0's release step recorded, and a build from the `v0.7.0` tag gives the same.
- **The exports are 0.7.0's:** 18 at runtime, and the same type names. `dist/index.js`, `dist/index.d.ts` and `dist/model.d.ts` are 0.7.0's, byte for byte.
- **One type changes:** `PreparedCapTable`'s `capTable` and `exitDate` are `readonly` (fix 1, above).
- **One name is added to a list:** the report-note code `no_participation_column` (10f, 10g). Stable from 1.0's report-note codes are 34. Its other four lists are as in 0.7.0: 11 terms, 50 OCF terms, 34 OCX terms and 13 reason codes.
- **Nothing is removed.**
- **The README adds "Versions":** from 1.0, spillpoint follows semantic versioning.
- **Everything else that differs in `dist/` is internal.** It's in modules the package's one entry point doesn't re-export, and `exports` lists only that one, so no code can import it.

## On the page

- **Payouts as they'd be paid** (10a, P1). Every payment the page shows to the cent is the engine's exact amount rounded down to the cent, as a paying agent pays. A holder's and a class's totals are the sums of those. The cents left over have a row of their own, "Left over from rounding down".
- **The logo** (10b), in the header and as the tab's icon.
- **Half-up for reading** (10d, P2). Every amount, percentage and price the page rounds half-up rounds as `toCents` now does.
- **Short amounts never read "$1000K"** (10e). $999,999.99 reads "$1M".
- **At spillpoint.io** (10h). spillpoint.github.io/spillpoint redirects there.
  - **An opt-in link** in the header and footer leaves an email for news of releases, on a form of its own.
  - **The page sends nothing itself:** the link opens the form, and nothing from the page goes with it.
- **The fund waterfall** is at spillpoint.io/fund/, with its own package on npm, `spillpoint-fund`, and its own releases. The footer links to it.
- **The footer** says spillpoint 1.0.0, from 10m's merge.
- **Saved files** are version 7, as in 0.7.0.
- **A first visit explains itself** (10l). "Open a cap table export" is a way to start of its own, the first thing under the title, with "or" between it and "Start from", so no one picks a blank table first. A line beside it says what it opens, Carta's OCX report (an Excel file) or an OCF export, and that the file is read in the browser and never uploaded. "Open", which opens only a file saved from the page, is now "Open a saved file". Where an import is refused, a line says "Copy a summary to share" holds no names, amounts or dates and is safe to post, and links to a new GitHub issue from a template for an export that won't open. The template asks for the summary and which tool made the file, and says not to attach the export or paste anything from it, since an issue is public. The page still sends nothing: the link's address names the template and nothing else, and the founder pastes the summary in.

## How it's tested

- **Every locked case:** the 86 exit and round cases, the 13 OCF and the 12 OCX. The three added since 0.7.0 are:
  - `outside-01-hustle-fund` (10i)
  - edge-12m, six post-money SAFEs at two caps (08b0)
  - edge-28, a group's conversion moving a SAFE (10k)
- **The reference** matches all 86. 10k closed three gaps in its breakpoints at jumps, with six unit tests of their own. No case file has changed since 0.7.0: `cases/` has only gained the three new cases' 10 files.
- **Each change's own tests,** as its review note sets out:
  - 10c's frozen copies
  - 10d's half cents
  - 08b0's tables and nulls
  - 10f and 10g's columns
  - 10j's timing and memory rows, before and after
- **The packed build, beside 0.7.0's** (10m), each on a build of its own outside the repo:
  - **Every case with an exit,** 51 of them, pays the same at all 500 of their exit values, holder by holder, to the cent, and finds the same 178 breakpoints with the same reasons, on both. That includes the three new cases: 0.7.0 gives them too.
  - **Each of the 18 whole OCF packages and OCX workbooks** reads to its case's result on both.
  - **Each change above shows on 1.0, and not on 0.7.0,** in the figures these notes give:
    - edge-02 changed after `prepare`, at $5M: Founder A gets $15,000,000.00 on 0.7.0 and $1,500,000.00 on 1.0, and assigning to the prepared table throws a `TypeError`
    - the four half cents
    - the five SAFE tables
    - the two nulls
    - Hollis Mill without its `Participating (Y/N)` column
  - **The README's five examples,** from the packed README, each print exactly their Output block.
  - **Code written for 1.0 typechecks under `nodenext`.** The same file against 0.7.0's declarations has one error, where it marks the readonly assignment as an error that 0.7.0 doesn't raise.

## Still refused

Unchanged from 0.7.0: the engine's list (its README's "What it refuses") and the OCF and OCX deferrals. 08b0's two refusals, above, are `InputError`s, for tables that have no right answer.
