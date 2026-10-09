# Review: 05a (checking real exports)

Branch `05a-real-exports`, stacked on #63, the plan, since it builds on O15 there. Once #63 merges, its diff is just its own two commits:
1. **The three doc fixes.**
2. **`scripts/ocf-check.mjs`,** for you to run on your own exports.

The page's "Copy a summary to share" is 05a2, next.

## 1. The doc fixes

- **The engine README:** "Items marked *(0.2.0)*, *(0.3.0)* or *(0.4.0)* are new in that version."
- **`notes/release-0.4.0.md`:** "Nothing is guessed: a term OCF doesn't settle is left blank for you to fill in, or read a set way with a report line saying so."
- **The root README's "Coming next":** 0.5.0, adding the next round to an imported cap table and SAFEs beside a note at a sale, then 1.0.

## 2. The check script

Check `node -v` says 22.18 or later, then, from the repo:

```bash
pnpm ocf-check path/to/export.zip
```

A folder of `.ocf.json` files works too, with every file under it read. pnpm prints its own command line first, then the engine builds quietly, and then the check prints. It reads only the files you name and writes nothing.

**What it prints, for Larkspur** (`pnpm ocf-check cases/ocf-01-larkspur/package`; the Objects line cut short here):

```
spillpoint 0.4.0: an OCF import, in counts and codes
OCF version: 1.2.0
Files: 8 JSON, 40,085 bytes; 0 not JSON
Objects: ISSUER 1, STAKEHOLDER 12, STOCK_CLASS 3, STOCK_PLAN 2, TX_CONVERTIBLE_CANCELLATION 1, …
Import: read
Notes: common_preference_ignored 1, conversion_rounding_not_modeled 2, convertible_seniority_ignored 1, …
Unrecognized fields: board_seat 1
Blanks: participation 1, repayment_multiple 1
Answer sets: 2 tried, of 2 possible
set 1: #1 participation=non_participating, #2 repayment_multiple=placeholder: note_with_safe_or_carve_out
set 2: #1 participation=participating, #2 repayment_multiple=placeholder: note_with_safe_or_carve_out
```

Larkspur reads, but at a sale the engine refuses its SAFEs beside a note, whichever way the Seed participates. That's 05c.

**The rest of our cases:**
- **Millrace:** reads either way Series B participates.
- **Quillfern,** from a zip: nothing to fill in, and the engine reads it.

**A refused export prints its kind and term.** For the five terms that alone say little, it adds the value behind them, looked up in the files from the refusal's subject. The subject is never printed:

```
Import: refused, unsupported unknown_object_type (TX_STOCK_GIFT)
Import: refused, unsupported currency (CAD)
Import: refused, unsupported ocf_version (2.0.0)
Import: refused, malformed quantities_dont_reconcile
```

**OCF's own examples** in `local/`:
- **the samples:** read as version `1.2.1-alpha+main`, then refused for a SAFE in pounds, `currency (GBP)`
- **the two tutorials:** refused on their placeholder version, which prints as "other", since `~~~ SAMPLE ~~~` isn't a version's characters

## How it's tested

`apps/dashboard/test/ocf-check.test.ts`:
- **Pinned output:**
  - Larkspur in full
  - Millrace's and Quillfern's runs
  - four refusals
- **The answer sets:**
  - six possible, so all six are tried
  - 128 possible, so 8 are tried: the first answers, then one blank at a time
- **Leaks,** on every OCF case we have: 9 packages, and each of the 56 fixtures added to its base. Nothing it prints may contain:
  - a date
  - a holder's or class's name, or any other text from the files
  - an id, as a whole word
  - an amount, as a whole word

  **To prove the check bites,** I made the summary print a refusal's subject. 35 of the leak and pinned tests failed, and they passed again once it was put back.

## How it's built

- **The summary** (`apps/dashboard/src/ocfSummary.ts`) is one module, which 05a2 shows on the page. So the script and the page say the same thing.
- **The engine runs** (`apps/dashboard/src/ocfCheck.ts`) are the script's only. They read the export exactly as the page does:
  - the page's zip reader and its 100 MB limit
  - its `filled` and `defaultTop`
  - the engine's `readOcf`
- **`importOcf` keeps more when it fails:** the refusal itself and what was read, beside the message. The message is for the page, and can name an entry or a holder.
- **A zip error has a code** (`encrypted`, `compression_bzip2`, `too_large`, …), for the same reason.
- **Node runs the page's TypeScript directly,** as you chose. The page's modules import the engine as a package, so `pnpm ocf-check` builds it first.

## The fix from your review: placeholders as words

A set line printed a placeholder's value. For a class with no conversion right, that's the class's own issue price ("conversion_price=1.37"), an amount from the export. Now:
- **Placeholders print as words:**
  - "conversion_price=issue price"
  - "original_issue_price=placeholder"
  - "preference_multiple=placeholder"
  - "repayment_multiple=placeholder"
- **The values are still used** to fill the blanks.

**Three new guards in the tests:**
- **A package built in the test,** Quietwater Tools, with a preferred class priced at $1.37 that has no conversion right. Its set line is pinned, and it's in the leak test.
- **Quantities are secret in the leak test,** and so is shares reserved. A whole number under 1,000 can't be told from the counts the summary prints by design, so a quantity of 0 or 1 isn't looked for. Grouped numbers ("40,085 bytes") are now kept whole as one word.
- **Every answer a set line prints** must be a choice's own code or a placeholder word.

**Printing the value again fails** the pinned test and the leak test, on "1.37".

05a2 will follow the same rule where the page shows the answers given at Use: each answer's kind, never its value.

## Decisions for you to check (O15)

1. **One Objects line,** counted from the files, rather than "read" and "set aside" lines. A refused export has no report to split them, and the type names already tell them apart.
2. **The `InputError` path.** The engine's paths for an exit are made of field names and positions, like `exit.cap_table.securities[2].cap_multiple`, so they print as they are. A path with anything else in it, such as an id, prints bare, as `InputError`. That's your answer 4, made easy by the paths already using positions.
3. **Anything else unexpected** prints as `unexpected TypeError`: its kind, never its message.
4. **Placeholders:** a conversion price is the series' issue price, given or filled. A price is $1.00, and a multiple is 1. Each prints as a word, never its value (above).

## Checks

- **Dashboard:** 416 tests pass, 73 more.
- **Engine:** 1,789 tests pass, unchanged.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **The root `package.json`** gains the `ocf-check` script.
- **Nothing run outside the sandbox.**

## Next

Run `pnpm ocf-check` on your exports and paste what it prints. That scopes 05d. Next is 05a2, the page's "Copy a summary to share". I'm stopping here.
