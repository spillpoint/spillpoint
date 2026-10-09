# Review: payouts to the cent

Branch `05-payouts-to-the-cent`, a small page PR before 05b1. The page's tables used to show whole dollars ("$9,750,990"); exact amounts now show cents ("$9,750,989.67"). Each is rounded half-up to the cent, as the engine's `toCents` and the locked cases round, so the page agrees with them.

## Which amounts changed

**To the cent now:**
- **The who-gets-what table:**
  - every payout, by holder and by class
  - the total, which stays the exit value
- **Breakpoints:**
  - each one's exit value in the breakpoint list ("$19,999,999.79 ($20M)")
  - each mark on the slider: its name for a screen reader, and its tooltip ("Breakpoint 3: $39,424,995.32")
- **The exit value's box:** to the cent whenever the value has cents. That's once a breakpoint is chosen, from the list or a mark, or once an amount with cents is typed. A whole-dollar value still shows as whole dollars ("$62,400,000"), so a breakpoint that falls on a whole dollar does too.
- **A jump in your payout** in the breakpoint list's "For you" line: its size, and the amounts it goes from and to ("jumps $2,500,000.20 here, from $1,000,000.40 to $3,500,000.60"). Before, these were whole dollars, unless two amounts would round to the same figure.

**Unchanged, still short or whole dollars:**
- **Headlines:** "At $100M you get $9.75M".
- **Chart axes and labels:**
  - the curves' legend values and hover readout
  - the zoom boxes
- **The slider's ends.**
- **The per-$1M rates** in "For you", such as "each extra $1M now adds $250,000". They stay whole dollars, unless two would round to the same figure. I've counted every rate here as one of your "approximate per-$1M rates", the exact ones included. Tell me if you meant only the curved ones, marked "about".
- **Amounts outside your list:**
  - the round lines on the Rounds tab
  - "Paid over time"
  - the editor's "In all"

## When the rounded payouts don't add up

**The total row stays the exit value.** When the payouts, each rounded to the cent, add up to something else, a quiet line under the table says so: "Each payout is rounded to the cent, so together they come to $62,400,000.01, 1 cent from the total."

**It counts the rows on view,** by holder or by class. **Otherwise there's no line.**

## How to check it

`pnpm dev`, on Millrace:
- **The table:** Ana Ortiz's payout at $100M reads $9,750,989.67, and the total $100,000,000.00.
- **A breakpoint:** choose breakpoint 3 in the list or on the slider. The box reads $39,424,995.32.
- **A rounding gap:** type an exit value like 62400001 to see the line under the table, if the payouts' cents don't add up there. The tests find one such value and pin the line's wording.

**The tests:**
- **`test/cents.test.tsx`, new:**
  - Millrace's payouts on the page equal the engine's `toCents`, line by line
  - the rounding line appears when the cents don't add up, and doesn't when they do
  - the box keeps cents once an amount with cents is typed
- **Stricter comparisons.** The editor tests that compare the page's payouts with a case's `expected.json` now compare to the cent: cases 6b, 8, 9, 10b, 12 and 13a, typed in by hand. Before, they compared whole dollars.
- **Updated text:** the pinned strings that showed whole dollars:
  - Millrace's breakpoints and marks
  - case 8b's kink
  - 6b's jump
  - the README rounds example's breakpoints, now $5,999,998.36, $14,099,998.36 and $22,499,998.27, as the engine README prints them

**Screenshots,** the eleven that show these amounts, retaken:
- **The overview:** `m3a-overview`, `m3a-by-class`, `m3a-simple-example`, `m3a-phone`.
- **The slider's marks:** `m3b-tick`, `m3e-phone-tick`.
- **The breakpoint list:** `m3b-breakpoints`, `m3c-6b-curves`, `m5k3-for-you`.
- **The table:** `m3e-phone-table`, `m5k-payouts`.

![The table by class, to the cent](screenshots/m5k-payouts.webp)

![A mark's tooltip](screenshots/m3b-tick.webp)

## Checks

- **Dashboard:** 420 tests pass, 4 more.
- **Engine:** 1,789 tests pass, unchanged.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Outside the sandbox:** only `pnpm screenshots`, under your standing permission.
- **A leftover preview server.** One from the 04f session was still serving the page. It served the fresh build, which the shots confirm, and I stopped it afterwards.
