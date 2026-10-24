# spillpoint-fund 0.2.0: each LP's share

spillpoint-fund 0.2.0 gives each LP's share of what the LPs get. List a fund's LPs, each with its commitment, and every split says what each LP has paid in, gets from the distribution, has received to date, and gets back of any clawback the GP owes. The waterfall itself is unchanged. The version in `packages/fund/package.json` is 0.2.0; it is published from there, and tagged `fund-v0.2.0`.

> The fund's documents govern, not this tool. spillpoint-fund models common fund terms with documented defaults. Where an LPA differs, it wins.

## What's new in 0.2.0

**The engine** (rules F19 to F21 in `packages/fund/docs/SPEC.md`; choices FA17 to FA20 in `ASSUMPTIONS.md`):
- **`lps` in the input:** the fund's LPs in the order the GP lists them, each a `name` and a `commitment`.
  - **Every LP is on the same terms:** the same fees, the same carry, every call pro rata to commitments.
  - **The commitments only divide** what the LPs get. They aren't checked against the calls, and any amounts in the right proportions give the same shares.
  - **Names** are compared exactly as written, and no two LPs share one.
  - **No LPs:** left out, `null`, or an empty list.
- **`fund.lps`:** what `readFund` read, each LP's `name` and `commitment`, frozen with the rest of the fund.
- **`split.byLp`,** from `splitAt` and `splitAtNav`: for each LP, in the input's order:
  - `name`, `commitment`, and `share`, its commitment over all of them
  - `paidIn`, `distribution` and `toDate`: its share of the LPs' paid-in, of the LPs' total from the distribution, and of their total to date
  - `clawback`: its share of what the GP owes back, when the split is final; zero when nothing is owed, and null when the split has no clawback

  Each is exact: the LPs' amount times the commitment, divided by all the commitments. So the LPs' amounts add up to theirs, and bend exactly where theirs do.
- **New refusals:**
  - **`lp_name_repeated`:** a new input term, for a name an earlier LP already has, at the later LP's `name`.
  - **A field on an LP** other than its name and commitment, such as a side letter's `carry`, is refused as unsupported, named by the field.
  - **When:** the LPs are checked after everything else in the input, one LP at a time.
- **Unchanged:** `findBreakpoints`, the tiers, the clawback, and every 0.1.0 name.

**The page,** at `spillpoint.github.io/spillpoint/fund/`:
- **An LPs tab,** after Cash flows.
  - **The rows:** one an LP, with its name and its commitment in dollars, "Add an LP" and "Remove".
  - **Under the table:** a line with the LPs' count and what they've committed.
  - **Pasting** rows from a spreadsheet, with a preview of what it read and why it couldn't read a row.
  - **Names** are trimmed as the page reads them.
  - **Problems** are in plain words under their cells.
- **The LPs' card on Payouts,** when the fund has LPs:
  - **Each LP's row:** its share, paid in, this distribution and to date, and its share of the clawback when one is owed.
  - **Each amount rounded down to the cent,** as it would be paid.
  - **A row for what rounding down leaves:** never negative, at most a cent an LP.
  - **A total row** that matches the page's own figures for the LPs.
  - **At NAV,** the card follows the NAV split. On a phone each LP is a group of its own.
- **"Download as CSV":**
  - **What's in it:** the card as shown, with numbers without "$" or commas.
  - **Quoting, as RFC 4180,** with a leading apostrophe on a name a spreadsheet would read as a formula.
  - **UTF-8 with a byte-order mark,** so Excel reads every name right.
  - **Nothing leaves the computer.**
- **Files:** a saved file keeps the LPs in `fund.lps`, and an opened one brings them back.
- **Two examples now have LPs:** "A VC fund with premium carry and three LPs" and "A late call, a clawback and two LPs".
- **The four tabs fit on one line** down to 320 pixels.

## Upgrading from 0.1.0

**Nothing changes for a fund without LPs:** its split is the same, with an empty `byLp`.

**TypeScript code that builds a `Fund` by hand** needs `lps: []`, since `Fund` now has `lps`. A fund from `readFund` always has it. JavaScript that builds one as 0.1.0 did still splits, as a fund with no LPs.

## Stable names

**Unchanged:** nothing stable from 0.1.0 is renamed or reused.

**Added in 0.2.0:**
- **`lp_name_repeated`,** to `FundRefusal`'s input terms
- **the fields above:** `fund.lps` (`Lp`) and `split.byLp` (`LpAmounts`)

The package's README lists each stable name with what it means.

## How it's tested

**Four new worked cases and eleven refusals** (`packages/fund/cases`, fund-17 to fund-21), each with a plain-English derivation:
- **The cases:** three LPs whose commitments don't match what they've paid in; three equal LPs, whose amounts are fractions of a cent; two LPs sharing a clawback; and three whose shares don't terminate.
- **Where their values come from:** the independent calculator in exact fractions (`packages/fund/reference`), as for 0.1.0.
- **Locked only after re-derivation:** each was re-derived independently, by hand and by a separate checker in exact fractions written from SPEC.md alone.
- **The rest:** the engine meets every amount to the cent, the fifteen earlier cases unchanged.

**Checked independently, beyond the cases:**
- **The reference,** against that checker on 1,100 random funds with LPs: 25,004 LP rows, each exact.
- **The engine,** on 1,200:
  - 177,011 LP rows and 620,354 amounts, each to the cent and within 1e-24 of exact
  - 3,600 faulty LP lists, refused the same, kind, term and path
- **The page,** built, in headless Chromium, at 1,280 and 320 pixels:
  - cases 17 to 20 and 80 random funds opened as files
  - 8,581 cells of the LPs' card, as the spec says
  - every CSV downloaded through the page equal to one built from exact values, byte for byte

**And as for 0.1.0:**
- **The names:** a test fails if the engine can give a name or a wording the package's README doesn't list.
- **The page's numbers:** each is held to the cases.
- **Privacy:** the built page loads nothing from elsewhere.

## Not modeled yet

- **Per-LP accounts where LPs differ:** later closes and equalization, side-letter fee or carry breaks, defaulted or excused LPs. A field on an LP other than its name and commitment is refused.
- American (deal-by-deal) carry.
- Capital as invested capital only, or committed capital.
- A compounding pref, or an IRR hurdle: refused as `compounded_pref`, or by the hurdle's own key.
- A step's higher rate on all profit, with a GP catch-up to it.
- An after-tax clawback cap, a carry holdback or escrow, and interim clawback tests.

A term the engine doesn't model is refused, never quietly ignored.
