# Review: 06b (the plan for 0.6.0's OCX import)

Branch `06b-plan-0.6.0`. No code, and no case file changed. Two commits:
1. **`notes/plan-0.6.0.md`,** and the line you asked for in CLAUDE.md.
2. **This note.**

## What changed

**`notes/plan-0.6.0.md`,** as item 5 of your first message asked, with your two additions:
- **What I read and the licenses:** each file with its version, URL, size and SHA-256, and the converter's commit.
- **What an OCX workbook holds,** tab by tab, and how the open-source converter fills each column from OCF, which is what our reader runs in reverse.
- **Where the three versions differ,** so the reader can tell them apart.
- **What `readOcx` reads, leaves to fill and refuses,** mirroring `readOcf`, with the report, the page, the check script and the steps (06c cases, 06d engine, 06e page, 06f release).
- **13 questions for you,** each with what I'd do.
- **14 open questions only a real Carta export can settle,** with which OCX version Carta writes and which tabs it fills first, as you asked.
- **Carta's release note cited** at the top.
- **06a's four breaking changes,** carried in for 0.6.0's release notes.

**CLAUDE.md,** in Steps: "Jordan lifts the `cases/` edit rule for that step only, and has new cases re-derived independently, not by you, before he adds the label." The same bullet said a case's DERIVATION was "for Jordan to re-derive"; it now says "to re-derive from".

## What I found that shapes the plan

**OCX is a snapshot, not a ledger,** and much thinner than OCF for a waterfall:
- **It gives:** each holder's shares by class, each series' issue price, conversion price, multiple and participation, and the unissued pool.
- **It doesn't give:**
  - seniority
  - option or warrant strikes
  - who holds a SAFE or note: they're grouped by type and terms, with a count and a total
  - a note's interest, dates, base or repayment multiple
  - dividends, anti-dilution or conversion groups

So most of the questions are about how much to ask on the page and how much to refuse.

**The reference file named 1.0 calls itself "OCX Version 0.5",** and has the same tables and headers as 0.4. 0.3 differs: another per-holder tab, and no multiple or participation.

**The Stakeholder Snapshot carries holders' addresses and emails.** The plan has the reader never read that block, and the check script never print it.

## How you can check it

1. **Read the plan.** Its questions are at the end, before the open questions for the export.
2. **The files can be fetched again** from the plan's table, and checked by SHA-256.
3. **Nothing from them is in the repo:** they're in `local/ocx-reference/`, and `git status` shows nothing there. The plan names only tab names and column headers, as you allowed. It has no sample rows, formulas, instruction or note text, or layout.

## Decisions for you

The plan's 13 questions. The ones that shape the most:
- **1:** wait for your export's headers before 06c's cases.
- **2:** a structure-only script for what the headers can't show.
- **7:** how the page asks the seniority order.
- **8:** option strikes as blanks.
- **10:** a row of SAFEs read as one SAFE.
- **11:** a row of several notes refused.

## Assumptions added

None yet. The "OCX import" section of ASSUMPTIONS comes with 06c's cases, once you've answered, as O1–O12 came with 04a.

## Open questions

The plan's 13, and its 14 for the real export.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **CLAUDE.md:** the one line above, in Steps.
- **Network, all inside the sandbox:**
  - the converter's source, read through GitHub's API (`gh api`)
  - the wiki's two pages, Carta's release note and one web search
  - the reference workbooks: a size check, then the download into `local/ocx-reference/` with your OK
- **Nothing ran outside the sandbox.**

## After your review (Jordan, 06b review)

Your 13 answers are in the plan, under "Your answers", and the plan above them follows them where they differ from what I first wrote:
- **Versions:** layouts are told apart by their headers, and the label is only reported. 0.3 is refused unless Carta writes it, so its blank is gone from "What it leaves to fill".
- **Seniority:** the question starts with no order set, with two one-click choices, "all pari passu" and "stacked, latest round senior", plus arranging by hand. One is required before Use.
- **06c:**
  - It waits for a real export's headers, and for the choice between OCX and the securities ledger report, or both.
  - The cell-kinds script comes first.
  - The reference test covers pre-money SAFEs too.
- **06e:** adds "Copy a summary to share" for .xlsx.
- **The API:** left to 07a's naming review.

## Next

06c, the OCX cases, once a real export's headers are in. Meanwhile 07a, the naming review's plan, on its own branch. I'm stopping here.
