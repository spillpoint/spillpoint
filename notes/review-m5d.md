# Review: M5d (warrants in the engine)

Branch `m5d-warrants`. The engine now handles warrants:
- **At a sale.** It runs case 8, a warrant for preferred, and passes every locked figure.
- **In a company's history.** It builds the "Warrants issued" event, and case 22 matches field by field.

The page still doesn't show warrants; that comes with the dashboard terms (M5k). Until then it refuses a cap table with warrants, saying why. Before this PR it would have turned them into common stock without a word (see below).

Also here:
- **SPEC's breakpoint definition,** as you asked.
- **A proposal** for the "For you" line on curved stretches, in the open questions.

## Run it

```bash
pnpm payouts edge-08-preferred-warrant --all
```

This prints "8 of 8 exit values match expected.json".

```bash
pnpm breakpoints edge-08-preferred-warrant
```

```bash
pnpm rounds edge-22-warrants-issued
```

## How to check it by behavior

1. **Case 8, the warrant for Seed Preferred.**
   - **The payouts:** every exit value matches `expected.json` to the cent, with the same decisions. At $1.5M Lender L nets $45,454.55; from $2.1M to $10.1M, a flat $100,000; at $20M, $294,117.65.
   - **Three breakpoints,** each with its reason:
     - **$1,000,000:** "The warrant for 200,000 Seed Preferred shares at a $0.50 strike comes into the money here: each Seed Preferred share is worth the strike. Above this, exercising pays: the strike money joins the proceeds, and the new shares join Seed Preferred, with its preference and conversion."
     - **$2,100,000:** "Seed Preferred's preference is paid in full here: $2,200,000." That preference includes the warrant's 200,000 shares.
     - **$10,100,000:** Seed converts. "Its 2,200,000 as-converted shares are worth $2,200,000 at $1.00 each, the same as its 1x preference of $2,200,000."
2. **Case 22, warrants issued.**
   - **The tables:** all six cap tables match the reference, field by field.
   - **The round:** priced at $1.6304347826. The SAFE's 1,133,333 shares and the 1,533,333-share pool are exact.
   - **Lender L's warrants** appear as "Warrants for Common Stock ($0.5 strike)", 200,000. They aren't taken from the pool.
3. **The page, with a warrant.** Open a saved file whose cap table has a warrant, or whose rounds have a "Warrants issued" event. It says:

   > It has warrants, Warrants for Common Stock ($0.5 strike), which this page doesn't show yet. It won't open a cap table it can't show in full.

## What I found: the editor would have turned warrants into common stock

The cap table editor reads each security as common, options or preferred. Anything else it read as **common stock**. Until now that never mattered: the engine refused warrants before the editor saw them. With warrants built in the engine, a saved file with a warrant, or rounds with a warrants event, would have reached the editor. The warrants would then have been paid as common, with nothing on the page to say so.

**The fix.** The editor now refuses a warrant with the message above. It refuses any other kind it doesn't know with an error, rather than guess. A test opens both kinds of file and checks the message. M5k replaces the refusal with the real thing.

## How the engine handles warrants

- **Each warrant decides for itself** (E4). It is one of the free decision-makers alongside the series, settled the same way (E15). The options re-settle under each of its choices (E16), as they do under a series' choice.
- **A warrant for a series** adds its shares to the series once exercised (E12). They carry the series' per-share preference, participation, cap and conversion. The series' total splits between its own shares and the warrant's, pro rata by shares, and the warrant is reported net of its strike.
- **A warrant for common** shares the residual like an exercised option.
- **The breakpoint finder** needed nothing new. A warrant's gain from switching is one more margin that moves in a straight line.
- **In a company's history** (R29):
  - **The event:** `issue_warrants` makes one warrant security per underlying and strike, `warrants_<underlying>_<strike>` (C15).
  - **Counting:** warrants count like options everywhere a count includes issued options. A warrant for a series counts at that series' conversion ratio.
  - **The pool:** they aren't drawn from it.
  - **Anti-dilution:** issuing them never triggers it.
  - **The underlying** must be common or a preferred series already issued.

## What changed

- **Engine** (`packages/engine/src/`):
  - **`model.ts`:** the `WarrantClass` type.
  - **`input.ts`:** reads warrants (C4), with the underlying checked against the table.
  - **`waterfall.ts`:**
    - strike cash from exercised warrants
    - a series enlarged by its warrants
    - the split of a series' total between its shares and the warrant's
    - a new `Payout.series`, with each series' shares, preference, cap and as-converted count here
  - **`decisions.ts`:** warrants as free decision-makers.
  - **`reasons.ts`:**
    - the `warrant_in_the_money` reason, the reference's code
    - a series' figures counting its warrant shares
    - warrants for common named among those sharing the residual
  - **`rounds.ts`:** the `issue_warrants` event, and a warrant for preferred counted at its series' ratio. M5c's refusal line is gone.
  - **`index.ts`:** exports the `SeriesHere` type.
- **Engine README:**
  - warrants, at a sale and in a company's history, marked *(0.2.0)*
  - the `warrant` security and the `issue_warrants` event in the inputs
  - warrants off the "Not modeled yet" list
- **Dashboard:**
  - **`draft.ts`:** refuses warrants, with `NotShownYet`.
  - **`file.ts` and `rounds.ts`:** show that message as it is. The rounds build; it's the page that can't show them.
  - **The Rounds tab:** a "Warrants issued" description for the event.
- **Docs:**
  - **`SPEC.md`:** the breakpoint definition you gave, with curved stretches flagged.
  - **`ASSUMPTIONS.md`:**
    - **X17:** confirmed, with the dashboard work it implies.
    - **C12:** warrants off the refused list.
    - **C15:** built, and confirmed.
    - **E15 and E16:** warrants as decision-makers.
- **Engine tests:**
  - **The exit-case list:** `M2_CASES` is now `EXIT_CASES` and includes case 8. Every exit test runs it: the waterfall at every recorded point, the solved decisions, and the breakpoints with their reason codes and subjects.
  - **Case 22:** the round tests build it.
  - **New tests:**
    - a warrant for common, with its breakpoint, reason and net payout
    - case 8's conversion counting the warrant shares
    - reading a warrant, and refusing a bad underlying
    - the event counting warrants in a new pool, not drawing on the pool, and refusing a series not yet issued

## Checks

- **Engine:** 767 tests pass, 25 more than after M5c.
- **Dashboard:** 172 tests pass, 1 more: the warrant refusal, from a cap table and from rounds.
- **Reference:** 46 unit tests pass, and all 60 cases match `generate.py --check`.
- **`cases/`:** no changes.
- **Typecheck and build:** clean.

## CI and permissions

- **No changes to `.github/workflows/`.**
- **`.claude/settings.json`:** restored to its committed state, so the `Edit(cases/**)` rule is back on, as you said. Nothing under `.claude/` is in this PR.

## Assumptions added

None. X17 is confirmed, and C12, C15, E15 and E16 are updated.

## Decisions I made, for you to check

1. **The page refuses warrants until M5k,** rather than showing them read-only now. A read-only row is half of M5k's work, and the refusal can't be mistaken for an answer.
2. **`Security` gains a `"warrant"` member.** TypeScript code that switches over every kind will need a warrant branch. That belongs in 0.2.0's notes (M5j).
3. **The warrant reason's wording** is the engine's own, as for every reason (E18). The reference's text says the same in other words.

## Open questions

**The "For you" line on a curved stretch** (for the dashboard work). Today each breakpoint that changes your payout says, for example: "For you: each extra $1M now adds $742,500, up from $84,286." The rates come from the straight segments either side. On a curve there is no single rate, so I propose:
- **The rate just below and just above the breakpoint,** marked "about" on a curved side.
- **A short clause** saying the rate keeps changing there.

For Founder A in 10b, who gets 60% of the carve-out and a share of common:
- **At $10,000,000, curved on both sides:**
  > For you: just below here each extra $1M adds about $104,132; just above, about $79,339. On both sides the rate keeps changing, because the carve-out's claim grows with the exit value.
- **At $11,052,631.58, curved below:**
  > For you: each extra $1M now adds $742,500, up from about $84,286 just below. Below here the rate keeps changing, because the carve-out's claim grows with the exit value.
- **With the exit value inside a curved stretch,** the founder view adds nothing; it shows no rate today. The chart draws points along the curve.

**What I need from you:** whether that wording, or another, is what you want. I'll build it with the dashboard work, in M5k or M5l.

M5e (dividends) is next. I'm stopping here.
