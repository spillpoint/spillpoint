# Plan: 2.0, a cap table a founder keeps

Today the page answers one question: given a cap table, or the rounds that built it, who gets what at a sale. 2.0 makes it the place a founder **keeps** their cap table and **records in** it, from the incorporation papers on, still on their own computer. This plan is its first part. Hosting comes later. Everything stays in the founder's saved file, as it does now.

**Where this stands:** a plan only, with three questions for you at the end. Nothing is built until you answer.

**The short version:**
- **The ledger is the rounds the page already builds, grown up.** The engine builds a company from dated events today: shares issued, a pool, grants, warrants, SAFEs, notes, priced rounds. A ledger adds what happens between rounds (exercises, cancellations, repricings, repurchases, transfers, a split, a SAFE or note that ends unconverted) and makes every event dated. Each event leaves a cap table, as now. Payouts, breakpoints and every locked case are unchanged.
- **A round is recorded as issued, and checked against its terms.** Today's priced round is worked out from its terms. A founder's ledger has to match the papers: the price the stock purchase agreement states and the shares each investor and each SAFE actually got. So a recorded round takes those, and the engine works the same round out at the stated price and says where the two differ. That check is the "correctly" in "record each round correctly", and the same machinery is the SAFE view.
- **Problems that still leave a cap table are warnings, not refusals.** A grant beyond the pool, a SAFE with no cap or discount, a round its SAFEs don't convert in: each is recorded and flagged, in words that say what was entered and what usually holds, never legal advice. What leaves no cap table (exercising more options than were granted) is refused, as now.
- **The first case is one we already have.** Quillfern Labs' five years of OCF transactions (`ocf-12-ledger`) recorded as a ledger must give edge case 25's locked table. That ties the ledger, the OCF import and the reference's payouts together, and the OCF export's round trip later.
- **The views:** the cap table as of any date, each holder's history, and a SAFE's conversion at a chosen price, beside the payouts.
- **The file** goes to version 8, opens every earlier version as it does now, and exports to OCF.
- **13 steps,** 11b to 11k. Four are cases and lift the lock: 11b, 11b2, 11c and 11c2.

## Where this comes from

**Your message:** what founders need, from a call with an operator who works with 80+ startups. Setting up a cap table from incorporation papers, recording each SAFE, grant and round correctly, knowing what they're missing, and seeing what their SAFEs mean when they convert.

**What I read for it:** the repo only. `docs/SPEC.md`, `docs/ASSUMPTIONS.md`, the engine's rounds (`packages/engine/src/rounds.ts`), the OCF reader's ledger (`ocf-ledger.ts`, O5, O6), the page's file (`apps/dashboard/src/file.ts`, C13) and rounds editor, and Quillfern's case. Nothing of any cap table tool's, and nothing of the Coalition's for this plan. The OCF export (step 11j) is written from OCF's spec, as the reader was (O12, hard rule 10).

**No real cap table.** Anything from the operator's companies goes in `local/` (hard rule 6), and no case or fixture is made from one.

## 1. The ledger

### What a ledger is

A company's papers, as dated events in the order they happened: the company itself, its holders, its plan, and every issuance, grant, exercise, cancellation, transfer, SAFE, note and round since. The engine builds the cap table after each event, as `buildCapTables` does today (C14, C17), and two things beside it: what each event moved, holder by holder, and what's worth checking.

It's a superset of today's events, so every company built from rounds is already a ledger: one with no company details, no plan, and perhaps some events with no date. A saved file with rounds opens as one (section 4).

### The events, from the papers

| Event | Usually recorded from | What the engine builds today | What's new |
|---|---|---|---|
| **The company** | certificate of incorporation | nothing: the file's `name` | legal name, state, date of incorporation, authorized shares by class, par value. Used only by checks and the OCF export |
| **Founder stock** | stock purchase agreements, board consent | `issue` (common) | each issuance a **lot** with its own id (below); the price paid, as information |
| **Stock for a percentage** | | `issue_percent` (R1) | kept, for a company worked out from its terms |
| **The equity plan** | the plan, board and stockholder consents | `create_pool`, a percentage of fully diluted (R2) | a plan: shares reserved, and whether cancelled and repurchased shares go back to it. `plan_increase` to a new total, as a board consent words it |
| **Grants** | board consents, grant notices | `grant_options` (R14), refused beyond the pool | a grant id, an expiry date, ISO or NSO as information. Beyond the pool is a warning (L4) |
| **Exercises** | exercise notices | none | `exercise`: a grant's or warrant's shares become stock |
| **Cancellations, expiries, forfeitures** | board consents, termination | none | `cancel`: back to the pool or not, as the plan says |
| **Repricings** | board consent | none | `reprice`: a grant's outstanding options move to the new strike |
| **Repurchases** | repurchase notices | none | `repurchase`: stock retired, or back to the pool if it came from the plan |
| **Transfers** | stock powers, assignments | none | `transfer`: stock, SAFEs, notes, warrants |
| **Splits** | charter amendment | none | `split`: common, with nothing outstanding on it (as O5) |
| **Warrants** | the warrant | `issue_warrants` (R29) | ids, so they can be exercised and cancelled |
| **SAFEs** | the SAFE | `safes` (R4, R24, X1) | an MFN flag; an amendment, as when an MFN holder takes later terms; `end_convertible` for one repaid or cancelled |
| **Convertible notes** | note purchase agreement | `notes` (R23, X3) | a maturity date, as information; repaid or cancelled with `end_convertible` |
| **A priced round, worked out** | term sheet | `priced_round` (R3 to R28) | kept: a plan for a round, and a trial in the SAFE view. In a ledger, a warning that it isn't recorded as issued |
| **A priced round, as issued** | stock purchase agreement, restated charter, closing cap table | none | `recorded_round`, with its check (below) |
| **A later closing** | joinder to the purchase agreement | none | `later_closing`: more of a round's series at its price |
| **Conversions at a round** | the closing | inside `priced_round` | as issued, inside `recorded_round` |
| **A starting table** | an import | `start` (R31, C17) | each position becomes a lot, so later events can name it |

The event names are working names. Each is settled in its step and pinned in `stable-names.test.ts`, as 0.7.0's names were.

### Dates and order

- **Every event has a date.** One without is recorded with a warning, `undated_event`, and stays where it sits in the list.
- **The list is in date order.** Dates out of order are refused. Events on one date keep the order they were entered in. The page inserts each new event by its date.
- **As of a date** means everything up to the last event dated on or before it. A grant past its expiry date leaves the table on that date, as an import reads it (O6), with a warning until the expiry is recorded. So the table as of a date can differ from the table after its last event, and the engine works it out: `ledgerAsOf(ledger, date)`, a working name.

### Lots: what later events name

The engine's cap table holds one position per holder and class, with options merged by strike. That's all a payout needs, and it stays so. A ledger also needs to know which issuance a repurchase or transfer comes from, and which grant is exercised. So:
- **Every stock issuance and every grant is a lot** with its own id. The page makes the id, and the founder may give it the certificate or grant number on their papers.
- **Later events name a lot.** A partial transfer or repurchase leaves the rest in the lot. The export writes OCF's balance securities from it (O5).
- **A lot from a worked-out event** (a priced round, a percentage issue) is named by its event and holder.
- **A starting table's positions are a lot each,** one per holder and class.

### The plan's pool

Today the pool is one number, and a grant beyond it is refused (`rounds.ts`, `grant_options`). A ledger keeps the plan's reserve instead, as an OCF import does (O6):

> unissued pool = shares reserved − grants outstanding − shares delivered by exercise or issued under the plan − cancelled shares that don't go back

- **A grant beyond the pool is recorded,** with a warning, `over_pool`, naming the shortfall. The table shows the pool at 0 and the options outstanding, which is what the papers say happened. A later increase covers the shortfall first.
- **Whether cancelled or repurchased shares go back** is asked when the plan is entered, from the plan document, never preset (O1's no-guess rule). One answer covers cancellations, expiries, forfeitures and repurchases of stock issued under the plan.
- **Quillfern checks it:** 3,000,000 reserved − 900,000 outstanding − 150,000 exercised = 1,950,000, edge case 25's pool.
- **One plan** in this part. Several plans are later.

### The other new events

- **`exercise`:** a grant's or a warrant's shares become stock of its underlying class, for its holder, in a new lot. The strike paid is information. Early exercise is an exercise. More than is outstanding is refused.
- **`cancel`:** reduces a grant or warrant. A grant's shares go back to the pool if the plan says so. More than is outstanding is refused.
- **`reprice`:** a grant's outstanding options move to the option class at the new strike, from its date.
- **`repurchase`:** reduces a stock lot. The shares are retired, or go back to the pool when the lot came from the plan and the plan returns them.
- **`transfer`:** moves all or part of a lot, a SAFE, a note or a warrant to another holder. Its class, terms and place in the issue order (R25, O14) don't change. A transfer of options is refused in this part: plans usually restrict it, and it's rare.
- **`split`:** multiplies every lot of common. With options, warrants, convertibles or preferred outstanding on the class it's refused, as an OCF import refuses it (O5), since how each adjusts would need its own rules.
- **`end_convertible`:** a SAFE or note repaid or cancelled, without converting.
- **`amend_safe`:** a SAFE's terms change from its date, as when an MFN holder takes a later SAFE's cap. The MFN clause itself isn't modeled (12h): the ledger records what the holder took.

### A round as recorded, and its check

**What's entered,** from the closing papers:
- the new series and its terms (preference multiple, participation, cap, seniority, anti-dilution, dividends), as `priced_round` takes them
- **the price per share, as the purchase agreement states it**
- each purchase: holder, amount paid, **shares issued**
- each SAFE and note converted: **the shares it got, and the series it went into**, which may be the round's own (Quillfern's SAFE went into the Seed) or one of its own ("Seed Preferred (from SAFEs)", R5)
- the plan's new total, if it changed
- each earlier series' conversion price after the round, if it changed
- optionally, the term sheet's pre-money valuation and pool target, which the check uses

**What the engine does:** builds the table from what was entered, then works the same round out **at the stated price**, by the rules that already work out a round (R3 to R28), and compares:
- each purchase's shares: amount ÷ price, rounded down (R3)
- each conversion: the lower of the cap price and the discount price (R4, R23, R24), the shares that gives, and the preference its series carries
- the pool against its target, when one is given (R16)
- each adjusted conversion price, under the series' own anti-dilution (R7 to R10, R25)
- the pre-money the price implies, against the term sheet's, when given

**Each difference is a warning, `recorded_differs`,** with its size: "Investor S's SAFE got 260,000 shares. At $0.96, the lower of its cap price and its discount price, its $250,000 gives 260,416." A count that the stated price's own rounding explains, one that comes out right at some price within half of the price's last written place, says so, `within_rounding`: a purchase agreement that states $1.0821 can issue a share or two more than $1.0821 exactly gives.

**Why a stated price helps:** with the price given, there's no circularity to solve. The new shares, the SAFEs' shares and the pool follow from it. The same function is the SAFE view's trial round (section 3). The round worked out from its pre-money stays as it is.

**Not in a recorded round in this part:** pay-to-play's conversions (R17 to R22). The worked-out round keeps it, for a trial.

### What the engine would need

All of it adds to the API. Nothing in 1.0's changes.

1. **`buildLedger`** (working name): reads a ledger, the company, holders, plan and events, and gives each event's cap table and details as `buildCapTables` does, with its movements and warnings. `buildCapTables` stays as it is for case files and existing code: there a grant beyond the pool is still refused.
2. **The new events** above, sharing `buildCapTables`' handlers for the old ones.
3. **Lots and the plan's reserve** inside the company the events build. The cap table it gives out is unchanged.
4. **A priced round at a stated price,** and the check built on it.
5. **`ledgerAsOf`:** the table as of a date, expired grants out (L19), and the warnings that depend on the date.
6. **Warnings** as a result type of their own, a code, the event, the subject and plain words, with stable codes, as import notes have (O10).
7. **`writeOcf`:** the ledger as of a date, as OCF files (section 4).

**What it doesn't change:** the cap table's shape, `prepare`, `solve`, `payout`, `findBreakpoints`, `paySchedule`, either import, and every locked case's answer.

### Quillfern, the first case

Quillfern Labs (`cases/ocf-12-ledger`) is a fictional company written by hand as 34 OCF transactions over five years. Its import is edge case 25's locked table. Recorded as a ledger, `cases/ledger-01-quillfern`, it's about 20 events:

| Date | Event |
|---|---|
| Jan 15, 2021 | founder stock, A 3,000,000 and B 2,000,000 |
| Mar 1, 2021 | C 400,000 common |
| Sep 1, 2021 | common splits 2 for 1 |
| Oct 1, 2021 | the plan reserves 1,000,000, cancelled grants go back; options at $0.10 to C, D and E |
| Feb 1, 2022 | Angel S's SAFE: $250,000, a 20% discount, no cap |
| Aug 1, 2022 | the plan to 2,000,000; the Seed as recorded: T 2,500,000 at $1.20, the SAFE into 260,416 Seed |
| Nov 15, 2022 | D 300,000 at $0.40 |
| Mar 1, 2023 | 100,000 of E's grant cancelled |
| Apr 15, 2023 | E exercises 50,000 |
| Jun 1, 2023 | D's $0.40 grant repriced to $0.25 |
| Sep 1, 2023 | A transfers 500,000 to Trust V |
| Dec 1, 2023 | 200,000 of C's common repurchased |
| Feb 1, 2024 | C exercises 100,000 |
| May 1, 2024 | the plan to 3,000,000; the Series A as recorded at $1.00: U 3,000,000, T 500,000; the Seed's conversion price to $1.00 |
| Aug 1, 2024 | options at $0.25 to C and F |
| Jan 31, 2025 | all of F's grant cancelled |
| Mar 1, 2025 | T transfers 300,000 Seed to U |

**D's 400,000 entered and retracted in March 2021** isn't in the ledger: a ledger corrects a mistake by deleting the event. The case gives what OCF didn't: the formation date and authorized shares.

**Its warnings,** which the case expects:
- **Angel S's 260,416 Seed** were issued at $0.96 and carry the Seed's $1.20 preference, O5's report line as a warning
- **The Seed's conversion price fell to $1.00** with no anti-dilution recorded, as edge case 25's table has it (O11), in R31's words: "If its charter gives it some, record it."

## 2. Guided setup

### The order

A new way to start, beside "Open a cap table export": **"Start from your company's papers."** It walks through the papers in the order a company usually signs them. Each step names the papers it reads from, can be skipped and come back to, and writes ledger events, each placed by its date. Afterwards everything is edited on the Ledger tab.

| Step | The papers | What the page asks |
|---|---|---|
| 1. The company | certificate of incorporation | legal name, state, date of incorporation, authorized common shares, par value |
| 2. Founders' stock | stock purchase agreements | each founder: name, person or organization, shares, date, price paid, certificate number if any |
| 3. The equity plan | the plan, its approvals | name, date adopted, shares reserved, whether cancelled and repurchased shares go back. Or "no plan yet" |
| 4. Grants, and what became of them | board consents, grant notices, exercise notices | each grant: holder, date, shares, strike, expiry, ISO or NSO. Then any exercise, cancellation, expiry or repricing |
| 5. SAFEs and notes | each SAFE or note | holder, date, amount. A SAFE: post- or pre-money, cap, discount, MFN. A note: rate, maturity, cap, discount, what its cap divides by, repayment multiple |
| 6. Priced rounds | purchase agreement, restated charter, closing cap table | the series and its terms, the price per share, each investor's amount and shares, each SAFE's and note's shares and series, the plan's new total, earlier series' new conversion prices, the authorized preferred. Then any later closing |
| 7. Everything since | stock powers, repurchase notices, warrants | transfers, repurchases, warrants, a split |
| 8. Review | | the cap table as of today, and what's worth checking |

The page shows the worked-out count beside each count a recorded round asks for ("spillpoint works out 2,500,000"), but never fills it in: the count comes from the founder's papers.

### The checks

Each is a warning on the event it's about, in a "Worth checking" list on the Ledger tab, and in the review step. None stops anything.

| Code | When | What it says, roughly |
|---|---|---|
| `undated_event` | an event has no date | It has no date, so the cap table as of a date can't place it. |
| `over_pool` | grants beyond the plan's shares left | These grants are 5,000 more than the plan had left. A plan increase approved before them would usually cover it. |
| `over_authorized` | a class's shares, and what's reserved for it, beyond what the charter authorizes | Common outstanding, plus options, warrants, the pool and preferred as converted, comes to more than the 10,000,000 authorized. |
| `no_authorized` | no authorized shares given | The export to OCF needs it, and it's in the certificate of incorporation. |
| `safe_without_cap_or_discount` | a SAFE with neither | It converts at the round's own price. If it's an MFN SAFE, mark it. |
| `mfn_later_terms` | an MFN SAFE, and a later SAFE on better terms | A later SAFE has a lower cap. Under its MFN clause, the holder may have taken those terms; if so, record the amendment. |
| `not_converted_in_round` | a SAFE or note outstanding through a priced round | A priced round usually converts SAFEs. If it converted, record its shares. |
| `worked_out_round` | a round worked out from its terms, not recorded | Its shares are spillpoint's working, not your closing papers'. |
| `recorded_differs` | a recorded count or price differs from the terms at the stated price | above, with its size, and `within_rounding` where the price's rounding explains it |
| `conversion_preference_above_price` | a SAFE's or note's shares carry a preference above what it paid per share | O5's line: if they should be a series with a lower preference, record that. |
| `conversion_price_without_anti_dilution` | a series' conversion price changed, with no anti-dilution recorded | R31's words. |
| `grant_past_expiry` | a grant outstanding past its expiry date | It left the cap table on its expiry date. Record the expiry, or correct the date. |
| `note_past_maturity` | a note outstanding past its maturity, as of the date shown | Its maturity has passed with no conversion or repayment recorded. |

**How a warning reads:** what was entered, then what usually holds, then what to record if it happened. Never "must", "invalid", "illegal" or "you should", and nothing about what the founder ought to do legally. A test holds every warning's words to that. The Ledger tab says once, at the top of the list: these check what you've entered, not legal advice, and your counsel's records decide.

**What's refused,** because no cap table exists: dates out of order, an event before the company's date, exercising, cancelling, transferring or repurchasing more than there is, naming a lot or holder that doesn't exist, a split with options or preferred on the class, a transfer of options, and pay-to-play in a recorded round. Each in the engine's words on its event, as rounds are now.

### Starting from an import

An OCF or OCX import opens as it does now, a starting table (R31), as of its date. "Record what happens from here" adds dated events after it. Rebuilding an import's history before that date stays on the Later list, where your 06e review put it.

## 3. The views

**Beside the payouts:** a company with a ledger has five tabs: **Ledger** (today's Rounds), **Cap table**, **Holders**, **SAFEs** and **Payouts**. A cap table entered directly keeps today's tabs, with "Record what happens from here" where "Add a round" is. The exact layout is the page steps'.

### The cap table as of any date

- **A date,** defaulting to today. Events after it are greyed on the Ledger tab.
- **One row per holder,** a column per class, then options, warrants and the pool, with each holder's share of shares outstanding and of fully diluted, as R2 counts it: stock, options, warrants and the pool, SAFEs and notes left out and listed below with their amounts and caps.
- **By class:** authorized, outstanding, reserved, available.
- **The Payouts tab follows the date,** so "what would a sale pay on the cap table as of March 2024" is one change.
- **Download as CSV,** a local file.

### Each holder's history

- **Every event that moved them,** in date order: what happened, the change, and the balance after, class by class.
- **Their grants:** granted, exercised, cancelled, outstanding, by grant.
- **Their SAFEs and notes,** and what each converted into: the shares, the price, and whether the cap or the discount set it.
- **Their payout** at the exit value chosen on Payouts.
- **Download as CSV.**

### A SAFE's conversion at a chosen price

On the SAFEs tab, every SAFE and note outstanding on the date shown, together, since post-money SAFEs count each other (R4):
- **The founder gives the next round:** its price per share, or its pre-money valuation; the amount raised; and the pool target after it, if any.
- **For each SAFE and note,** the engine works out (L15): its cap price, its discount price, which one applies, its shares, its percentage after the round, the series it goes into, and that series' preference.
- **The price where the cap takes over:** the exact price per share above which the cap, not the discount, sets its price. A chart of each holder's percentage after the round against the round's price, drawn from exact points, marks it.
- **"See the payouts after this round"** runs Payouts on the trial table, without saving it.
- **"Add it to the ledger"** adds it as a worked-out round, a plan for the round, flagged `worked_out_round` until the closing papers come in.

It says what the SAFE's text gives at that price by spillpoint's reading (R4, R23, R24), naming the rule, and nothing more.

## 4. The file

### Version 8

C13's file grows. A company with a ledger saves:

```json
{
  "format": "spillpoint", "version": 8, "name": "...",
  "company": {"legal_name": "...", "state": "Delaware", "incorporated": "2021-01-04",
              "authorized": [{"class": "common", "shares": "20000000"}], "par_value": "0.00001"},
  "holders": [{"id": "...", "name": "...", "kind": "person"}],
  "plan": {"id": "plan", "name": "2021 Stock Plan", "returns_to_pool": true},
  "events": [...],
  "documents": {"<event id>": [{"paper": "Board consent", "have": true, "note": "..."}]},
  "cap_table_after_event": "...", "range": [...], "exit_date": "...", "view": {"as_of": "2026-11-27", ...}
}
```

- **`company`, `plan` and holders' `kind`** are engine input. The checks and the export read them. Each is optional, so every earlier file is already one without them.
- **`documents`** is the page's alone, keyed by event, if question 3's answer is yes. It says whether the founder has each paper and holds a note. It never holds the papers themselves.
- **Everything else** is version 7's. The saved file stays valid engine input, as C13 says, less the page's own fields.

### Opening every earlier version

- **Versions 1 to 7** migrate forward as they do now (`file.ts`'s `MIGRATIONS`), and 7 to 8 changes nothing: every new field is optional.
- **A file with rounds** opens as a ledger with no company or plan. Its undated events are listed as `undated_event`, Millrace's two grant events among them, and its worked-out rounds as `worked_out_round`. Its payouts are unchanged.
- **A cap table entered directly** opens as it does now.
- **A version 8 file on an older page** is refused as newer, as now.
- **Tests:** each version opened from a file, and a fixture saved by the page before 11f, as `saved-0.6.0.test.tsx` does for 0.6.0, every payout the same as before.

### Export to OCF

**"Export to OCF"** writes the ledger as of the date shown as an OCF package, a .zip of .ocf.json files, downloaded as a local file.
- **What's written:** the manifest (issuer, formation date and state, the as-of date), stakeholders, stock classes with their authorized shares, the plan, every lot as an issuance, and the transactions: exercises, cancellations, repricings, repurchases, transfers with their balance securities, splits, pool adjustments, conversions, and SAFEs and notes with their conversion terms.
- **What OCF has no field for** (O11): anti-dilution, cumulative dividends, series that must convert together. The export lists each, as the import does.
- **The round trip is the test:** `readOcf(writeOcf(ledger, date))` must give the ledger's table as of that date, issue order included, but for O11's terms. Quillfern's must give edge case 25's locked table, the one its hand-written package imports to.
- **Written from OCF's spec, by hand** (O12, hard rule 10). No generated package is committed as a fixture. You validate exports against the Coalition's published schemas locally, in `local/`, as their examples are run now.

## 5. What stays out of this part

| Out | Where it would attach later |
|---|---|
| **Hosting and accounts** | The version 8 file is the unit a host would keep, and event ids would let two copies merge event by event. It needs hard rule 5 changed, which is yours. Nothing in this part assumes a server. |
| **E-signing** | An event's papers: a paper to sign before the event is recorded. |
| **Sending documents** | The same place. The file never holds a paper, only whether the founder has it. |
| **409A valuations** | A valuation event, its date and the common stock's fair market value, and a warning on a grant whose strike is below the last one. |
| **Tax forms** | The lots: an 83(b) election's date on a stock issuance or early exercise, ISO limits and Form 3921 on ISO exercises, QSBS on issuances. Shown in each holder's history. |
| **Vesting** (question 2) | Each lot and grant: a schedule, a cliff and any acceleration, the vested count as of a date, and OCF's vesting terms in the export. Payouts keep E1's full vesting. |
| **Also later** | several plans; RSUs; transfers of options; pay-to-play in a recorded round; preferred converting to common outside a sale or a round; splits with options, warrants or preferred outstanding; OCX export; rebuilding an import's history as events; more than one company at once, as an operator would want |

## 6. The steps

Each is one branch and one PR, a review note, then a stop. Cases first, then the engine, then the page. **Each page step goes live on spillpoint.io when it merges** (`pages.yml` deploys main, and the page builds from the engine's sources), so each one has to stand on its own.

**The cases** are worked as OCF's and OCX's were: an event that adds or takes away shares has no new math, so 11b and 11b2 are worked by hand with a `DERIVATION.md` each. 11c and 11c2 have new math, a round at a stated price, so the reference works them. You have each re-derived independently before the cases label goes on. Nothing already in `cases/` changes: only new folders.

- **11a, this plan.**
- **11b, the ledger's rules and Quillfern** (lifts the lock):
  - `docs/SPEC.md`: a section, "The ledger"
  - `docs/ASSUMPTIONS.md`: a section, "The ledger", L1 onward (below), and C21, the ledger case folder (0.8.0's plan holds C20 for Carta's)
  - `cases/ledger-01-quillfern`: the table after each event, each event's movements, the two warnings, worked by hand
  - The case runners (`packages/engine/test/cases.test.ts`, `reference/generate.py`) leave `ledger-` folders out until 11d, one line each, as the runner already sets `ocf-` and `ocx-` folders apart
- **11b2, refusals and warnings** (lifts the lock): `cases/ledger-02-refused` and `cases/ledger-03-warnings`, one small change to Quillfern's ledger for each refusal and each warning, as `ocf-03` is for the import, worked by hand
- **11c, a round at a stated price** (lifts the lock): the reference learns it and the recorded round's check, with its unit tests. `cases/ledger-04-millrace-recorded`: Millrace's events recorded as issued, from its locked tables, at its prices to six places as a purchase agreement would state them (R8's $1.082112 for the Series B), with its two undated grant events dated by the case. Its tables must equal Millrace's, and the reference says which counts come out `within_rounding`
- **11c2, the checks** (lifts the lock): `cases/ledger-05-checks`, each a recorded round from a locked round case with one thing wrong: a SAFE converted at the round's price instead of its discount price (edge-15), a pool short of its target (14a), an investor a share off and a thousand off, a down round's conversion price stated wrong under broad-based (16a), and a later closing. Worked by the reference. 11c and 11c2 may be one step if 11c is small
- **11d, the engine's ledger:** `buildLedger`, lots, the plan's reserve, the events, the warnings, `ledgerAsOf`. Tests:
  - every `ledger-01` to `ledger-03` result, exactly
  - Quillfern's last table equals edge case 25's and `ocf-12`'s import
  - every round case read as a ledger gives `buildCapTables`' tables exactly, as `start.test.ts` splits them
  - every warning's words avoid "must", "invalid", "illegal" and "you should"
  - `api.test.ts` and `stable-names.test.ts` pin the new names; the engine README gets a section
- **11e, the recorded round and its check:** `recorded_round`, `later_closing`, a round at a stated price. Tests: every `ledger-04` and `ledger-05` result; and every round case's priced rounds, rebuilt at the price they solve to, giving the same table exactly, so the two ways of working a round can't drift apart
- **11f, the file and the Ledger tab:** version 8, opening every earlier version (above), every event dated, the new events under "Add an event", the warnings list, and the papers each event comes from (question 3). The privacy test covers the new fields: nothing leaves the page, nothing goes in a URL
- **11g, guided setup:** "Start from your company's papers", its eight steps and their checks. An acceptance test enters Quillfern's papers step by step and gets `ledger-01`'s tables and warnings
- **11h, the cap table as of a date, and each holder's history,** with their CSVs. Tests: Quillfern on each date its derivation lists; Founder A's history through the split and the transfer; Employee C's through the repurchase and both exercises; Payouts following the date
- **11i, the SAFEs tab:** the trial round, the price where the cap takes over, the payouts after it, "Add it to the ledger". Tests: edge-15's round at its own price gives its locked table; the price where the cap takes over on 12b's SAFE; the payouts after a trial match `buildCapTables` and `solve`
- **11j, `writeOcf`:** the export, and its round trip on Quillfern, Millrace recorded and every `ledger-` case. Millrace's prices come back to OCF's 10 places, as `ocf-11` reads them. No new locked case: the round trip runs against ones already locked
- **11j2, "Export to OCF" on the page:** a .zip writer of stored entries, read back by the page's own reader (`zip.ts`) in its test. You validate a few exports against OCF's schemas in `local/`
- **11k, the release:** the version (question 1), `notes/release-<version>.md`, both READMEs, and the packed build checked. You publish and tag.

11d or 11f may split in two. `CLAUDE.md`'s "Where things stand" and repo layout get a line in 11b, once you've answered.

### For the assumptions file (11b)

The defaults above, as L items:

| ID | What | Default |
|---|---|---|
| L1 | What a ledger is | Today's events and the new ones, each leaving a cap table; warnings beside it; refused only where no cap table exists |
| L2 | Dates and order | Every event dated, else `undated_event`. In date order, else refused. One date keeps entry order. As of a date, up to the last event on or before it |
| L3 | Lots | Every stock issuance and grant has an id; later events name it; a worked-out event's lots are named by event and holder; a starting table's positions are a lot each |
| L4 | The plan's pool | O6's formula. One plan. Whether cancelled and repurchased shares go back, asked, never preset. Beyond the pool, `over_pool`, the pool at 0 |
| L5 to L12 | Each new event | As in section 1 |
| L13 | A round as recorded | What's entered, as in section 1 |
| L14 | Its check | At the stated price, by R3 to R28; every difference with its size; `within_rounding` when some price within half the stated price's last place gives the recorded count |
| L15 | A round at a stated price | R3 to R28 with the price given in place of solving it |
| L16 | Warnings | Codes, the wording rule above, never legal advice |
| L17 | Authorized shares | From the charter, by class; used by `over_authorized` and the export |
| L18 | A note's maturity | Information, and `note_past_maturity`; payouts unchanged (X3) |
| L19 | A grant's expiry | Out of the table on its expiry date, as O6 reads an import, with `grant_past_expiry` |
| L20 | What a ledger leaves out | Vesting, valuations, papers, tax; E1 holds |
| L21 | Holder kinds | Person or organization, which the OCF export needs |

The page's rules join "The page" as P3 onward, and the export's join "OCF import" as O16 onward, each in its step.

## 7. Questions for you

1. **Which release, and 1.0 first.** Everything the engine gains here is new names: `buildLedger`, its events, its warnings, `ledgerAsOf`, `writeOcf`. Nothing in 1.0's API changes, so under Stable from 1.0 it's a minor release, 1.1.0, and "2.0" names this stage of the page, not an npm major. But 1.0 has to be cut before 11d merges, or it ships names that never had 0.7.0's naming review. The page doesn't wait either way: it builds from main.
   - **(a)** 1.0's release step lands on main before 11d, and you publish from its tag whenever the second gate is met. 11b to 11c2, cases and docs only, go ahead meanwhile.
   - **(b)** The engine goes to 2.0.0 to mark the stage, though nothing breaks. Still 1.0 first.
   - **(c)** 1.0 waits and carries the ledger, after a naming pass over the new names.

   I'd take (a).
2. **Vesting, out of this part?** It changes no count here and no payout (E1), and it brings rules of its own: monthly or not, cliffs, rounding, acceleration. A founder records a repurchase's shares from the repurchase notice, so nothing here needs the vested count. In, it's a cases step and an engine-and-page step before the export. I'd leave it out, attached to lots later.
3. **The papers each event comes from?** On each event, the papers it's usually recorded from ("Board consent", "Stock purchase agreement"), each with a box for "I have it" and a note, in the file and never the papers themselves, with the missing ones in "Worth checking". It's what "knowing what they're missing" most often means, and it's the page's alone. The lists would be our own words, general, and say "usually". I'd include it, in 11f.

## For the release notes

- **Added:** `buildLedger` and its events, warnings with their codes, `ledgerAsOf`, a round at a stated price and its check, `writeOcf`. Each joins Stable from 1.0's lists.
- **Unchanged:** `buildCapTables`, which still refuses a grant beyond the pool, and every answer every locked case gives.
- **The page:** a cap table a founder keeps. The Ledger tab, guided setup, the cap table as of a date, each holder's history, the SAFEs tab, and export to OCF. Saved files are version 8, and every earlier version opens.
