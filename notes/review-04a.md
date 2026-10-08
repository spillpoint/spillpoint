# Review: 04a (OCF case 01, Larkspur Instruments, and the import rules)

Branch `04a-ocf-cases`. The first M6 PR: a small fictional company in Open Cap Format, written by hand, using every kind of object the importer will read, with its import worked out by hand.

**Before it merges, it needs:**
- your re-derivation
- the `unlock-cases` label

**I split your 04a in two,** as with 03d and 03d2. The company alone uses 66 transactions to cover every type the importer reads, an evening on its own.
- **This PR, 04a:** the company, the OCF rules in `docs/ASSUMPTIONS.md`, and the case conventions.
- **04a2:** the one-file fixtures, one for each refusal and one for each type that isn't needed for payouts.

**Nothing in this PR comes from OCF's repository** (your answer 1):
- **The files:** every JSON file is our own, written from the spec.
- **The text:** the rules describe OCF in my words, with a link to its docs.
- **Field names and code values** are the format's own, which any file in it has to use.
- **OCF's published examples:** I haven't downloaded them yet. With no importer to run them through, 04d will download them into `local/`, run them, and describe the results.

## The company

`cases/ocf-01-larkspur/package/` is an OCF 1.2 package, as of **June 30, 2025**. It has:
- 12 stakeholders, 3 stock classes and 2 stock plans
- 66 transactions, deliberately out of date order, since the importer applies them by date

Every transaction type the importer reads appears at least once:

| Kind | What happens |
|---|---|
| **Common** | 2-for-1 split (one founder's shares reissued for it, one not), a transfer, a repurchase, a cancellation without a balance, a consolidation |
| **Preferred** | a retraction, a SAFE converting into Seed shares at $0.80, a conversion to common with a balance, a Seed conversion ratio adjustment |
| **Options** | an exercise, a repricing, a transfer to a trust, a cancellation, a retraction, one that expired, one under the older `TX_PLAN_SECURITY_ISSUANCE` name, and a grant returned to a second plan |
| **RSUs** | a grant and a release |
| **The pool** | an increase |
| **Warrants** | an exercise, a cancellation, a retraction, a transfer |
| **SAFEs and notes** | a conversion, a transfer, a retraction, a cancellation |

`DERIVATION.md` walks every holding through its transactions.

## What it imports to (`expected.json`, by hand)

**Holders:**
- **Kept:** 10.
- **Left out and listed:** Employee E and Advisor F, who hold nothing on the date.

**Classes:**

| Class | Terms | Holders |
|---|---|---|
| **Common** | — | Founder A 5,400,000; Founder B 3,400,000; Y 250,000; C 50,000; L 20,000; D 10,000 |
| **Seed Preferred** | $1.00, converting at **$0.80** after the ratio adjustment; participation **blank** | X 2,000,000; Y 800,000; S 125,000 |
| **Series A Preferred** | $2.00, **participating, capped at 3x** | Y 1,500,000; X 500,000 |

Seed's participation is blank because it has no cap: OCF can't tell non-participating from participating without a cap (your answer 3).

**Options:**
- **$0.08:** C 150,000 (repriced).
- **$0.10:** D 80,000, D Family Trust 20,000.
- **RSUs at $0:** D 30,000.

**The pool: 1,260,000.**
- **The 2023 plan:** 1,160,000. Of its 1,500,000, 280,000 are outstanding and 60,000 delivered.
- **The 2025 plan:** 100,000. Its one cancelled grant was returned.

**Warrants for Seed at $1.00:** L 75,000, X 25,000.

**SAFEs:** X's and S's $250,000, each post-money capped at $12,000,000, with a 20% discount.

**The note:** N's $250,000, at 6% simple, capped at $10,000,000 with the pool, with a 20% discount. Its repayment multiple is **blank**: it gives no `exit_multiple` (your answer 8).

**To fill in:** Seed's participation, and the note's repayment multiple.

**The report:**
- **Read:** a count of each of 34 object types.
- **Not needed:** nothing here; that's 04a2.
- **Notes:** 19 lines. Each is a choice the import made, listed in the derivation's last section.

## How to check it by behavior

There's no importer yet, so this is re-derivation:
1. **Read** `cases/ocf-01-larkspur/DERIVATION.md`.
2. **Tally the ledger.** This prints every transaction in date order, one line each:

   ```bash
   python3 -c "import json;[print(t['date'],t['id'],t['object_type'],t.get('security_id',''),t.get('quantity','')) for t in sorted(json.load(open('cases/ocf-01-larkspur/package/Transactions.ocf.json'))['items'],key=lambda t:t['date'])]"
   ```
3. **Compare** against `expected.json`.

**New engine tests check the files against each other.** They don't check the arithmetic:
- the manifest lists exactly the package's files
- every object id is unique
- the report's counts equal what's in the package
- every date is on or before June 30, 2025
- every holder holds something
- the blank fields are exactly the terms listed to fill in

## The rules: `docs/ASSUMPTIONS.md`, "OCF import", O1–O12

Your thirteen answers are written in, marked confirmed. These are mine, **New**, for you to check:

1. **O2, order:** transactions apply in date order. On one date, its splits come first, then the rest in file order.
2. **O2, files:** a file the manifest doesn't list is read too, with a report line, so 04a2's fixtures can be added to this package. The manifest's checksums aren't checked.
3. **O4, conversion:** a stock class's conversion ratio must equal its price ÷ its conversion price, or it's refused. Conversion into another preferred class is refused. The rounding type gets a report line.
4. **O5, reconciling:** a balance must equal the original less what was moved. A reissuance's or consolidation's result must equal its source. For transfers, conversions, exercises and releases, `resulting_security_ids` is informational: OCF's own tutorial has a dangling one.
5. **O5, splits:** refused for a preferred class, or when options, warrants or convertible preferred are outstanding on the class. OCF doesn't record how those adjust. On the later list.
6. **O5, another price:** a preferred share issued at a price other than its class's gets the class's terms, with a report line. For example, Investor S's Seed at $0.80 gets $1.00 of preference.
7. **O6, the pool:**
   - An **expired** grant returns to the pool as a cancellation would.
   - A **return-to-pool transaction** is refused under a plan whose own behavior already decides it.
   - A **negative pool** is refused.
8. **O7, warrants:** these rules are mine.
   - **What's read:** one exercise trigger, a fixed-amount conversion into a class.
   - **Exercise:** closes a warrant entirely, since OCF's exercise carries no quantity.
   - **Expiry:** an expired warrant is left out, as an option is.
9. **O8, SAFEs:** a SAFE with **no `exit_multiple`** is read as 1x, since its Cash-Out Amount is its purchase amount, with a report line. A note with none is left blank, per your answer 8. Tell me if you'd rather blank the SAFE too.
10. **O9, notes:**
    - **The cap** is read as pre-money, the only kind the engine models, with a report line. OCF doesn't say.
    - **Accrual periods** other than daily are refused.
    - **MFN notes** are refused.

## Also in this PR

- **`CLAUDE.md`, flagged as you asked:** M6's "Test against OCF's published examples" now reads "Test against our own OCF-format cases; run OCF's published examples locally, outside the repo, as a check."
- **`docs/ASSUMPTIONS.md`:**
  - O1–O12
  - C16 (OCF case folders)
  - five items on the later list:
    - an earlier as-of date
    - another currency
    - convertibles with differing seniority
    - splits with derivatives outstanding
    - note terms beyond the subset
- **`docs/SPEC.md`:** an OCF import section, listing case 01.
- **Tests:**
  - **Engine:** the OCF case checks above.
  - **The engine's and the dashboard's case lists** step past OCF folders, which have no `inputs.json`.
  - **The reference** already passes them by.

## Checks

- **Engine:** 1,493 tests pass, 8 more.
- **Dashboard:** 322 tests pass.
- **Reference:** 55 unit tests pass, and all 75 cases match.
- **Typecheck:** clean.

## CI and permissions

- **`CLAUDE.md` changed:** the M6 line, as above.
- **No changes** to `.github/workflows/` or `.claude/`. `.claude/settings.json` has local changes that aren't committed.
- **Nothing run outside the sandbox.**

## Open questions

None beyond the New rules above. Next is 04a2: the refusal and not-needed fixtures. I'm stopping here.
