# Review: 05c3 (cases for the SAFEs' tie and warrant shares)

Branch `05c3-safes-cases`, with the `cases/` edit rule lifted. The engine takes both rules in 05c4, with the speed work. It has three commits:
1. **The reference takes both rules,** with unit tests.
2. **Cases 12k and 12l.**
3. **The docs and this note.**

## 1. Your two rules, in the reference

**Rule 2, the SAFEs' tie (E20):** where several SAFEs could settle more than one way, each converting only because the others do, they take the most conversions. Among sets with as many conversions, the fewest option exercises (E5).
- **Unchanged:**
  - a SAFE still converts only when that strictly pays more (X16)
  - series, warrants and notes keep E5 and X16

**Rule 3, warrant shares (X1):** a warrant exercised into a series that keeps its preference is left out of a post-money SAFE's Liquidity Capitalization, like the series' own shares. The reference counted them before, as you thought.
- **A warrant not exercised** is still counted, as an outstanding Option, whether or not it's in the money (R29).

**The scope check:** with both rules, the reference reproduces every locked case exactly: every payout, breakpoint and reason. The one unit test that pinned the old tie now pins the new one. In Larkspur's band, with the Seed and Series A converted at $12M, both SAFEs convert for $252,449 each.

**Two wording changes, both only in the new cases:**
- **A series converting at a jump while a SAFE is already converting** now values its shares at the price just above, as 12j's E20 wording does. It adds why the SAFE's payout jumps: "Converting puts its shares in the Liquidity Capitalization Investor S's SAFE converts on, so its conversion shares grow with it…". Before, 12l's reason read "2,200,000 common shares at $1.0275 each = $2,260,500.00 equals its 1x preference of $2,200,000.00", the price from below. No locked case has such a jump.
- **SAFEs converting together** get a sentence: "It converts together with Investor Y's SAFE. On its own, converting would pay it only $450,000.00 here, less than its cash; with both converting, each gets its fixed share of the Liquidity Capitalization, which pays more above this exit value, so they convert."

## 2. Case 12k: two equal SAFEs (rule 2)

`cases/edge-12k-two-equal-safes/`:
- **The common:** founders' 6,000,000 and 4,000,000.
- **Two SAFEs,** Investor X's and Investor Y's: $500,000 each, a $5,000,000 post-money cap. Each buys a tenth.

**How it settles:**
- **From $5,000,000 to $5,500,000,** both taking cash and both converting are each stable. Converting alone pays (X − $500,000) ÷ 10; converting beside the other pays X ÷ 10.
- **Under rule 2 they convert from $5,000,000,** where payouts bend, with no jump at $5,500,000.
- **At exactly $5,000,000** each is indifferent, so both take cash (X16). The payouts are the same either way.

| Exit value | What happens |
|---:|---|
| $1,000,000 | the SAFEs' cash is paid in full |
| $5,000,000 | both convert: common goes from every dollar to 80 cents of each |

**The check value:** $5,250,000, inside the old two-answer range. Each SAFE gets $525,000; converting alone would pay $475,000.

## 3. Case 12l: a warrant below its series' preference, beside a SAFE (rule 3)

`cases/edge-12l-warrant-below-preference-beside-a-safe/` is case 8's table, so you know it:
- the founders' 8,000,000 common
- the Seed, 2,000,000 at $1.00, non-participating
- Lender L's warrant for 200,000 Seed at $0.50

Plus Investor S's SAFE: $500,000 at a $5,000,000 post-money cap, a tenth.

| Exit value | What happens |
|---:|---|
| $1,250,000 | the warrant comes into the money |
| $2,600,000 | the Seed's tier, with the warrant's $200,000 and the SAFE's $500,000, is paid in full |
| $7,100,000 | **the SAFE converts**, on 8,888,888.89: the warrant's 200,000 Seed shares are left out (rule 3) |
| $11,233,333.33 | the Seed converts, and **payouts jump** |

**What rule 3 changes:**
- **Counting the warrant's shares,** the SAFE would convert at $6,990,243.90.
- **At $7,000,000,** a listed exit value, it takes its $500,000 cash. Counting them, it would convert for $500,997.51.

**The jump at $11,233,333.33** is X1's, as in 12j:
- **Converting,** the Seed joins the SAFE's count, so the SAFE's shares grow from 888,888.89 to 1,133,333.33.
- **The SAFE rises** $220,000, and common drops the same.
- **At exactly that exit value** the Seed keeps its preference.

## How to check by behavior

1. **Re-derive from the two DERIVATIONs:**
   - `cases/edge-12k-two-equal-safes/`
   - `cases/edge-12l-warrant-below-preference-beside-a-safe/`
2. **Run the reference:**
   ```bash
   pnpm test:reference
   ```
   That runs 67 unit tests, 4 of them new in `reference/tests/test_safe_rules.py`, then checks every case it works: 83 now, the 81 from before unchanged.
3. **The engine's tests name both cases** as waiting for 05c4, with what today's engine does where it differs:
   - **12k at $5,250,000:** it takes cash, the fewest conversions.
   - **12l at $7,000,000:** it counts the warrant's shares, so the SAFE converts.

## Decisions for you to check

1. **Rule 3 leaves out only exercised warrant shares.** An unexercised warrant stays counted as an Option (R29), as X1 already says of options. So a warrant's shares count before it's in the money, drop out once it's exercised into a Seed keeping its preference, and count again once the Seed converts. Your wording said exercised; I've kept to it.
2. **Rule 2's tie among equal counts:** the fewest option exercises (E5). No case reaches it.
3. **The case numbers:** 12k and 12l, after 12j.
4. **The two new reason sentences** (section 1), in the reference's wording. The engine's wording follows in 05c4.

## Assumptions added or changed

- **E20:** the SAFEs' tie is now the most conversions, with your reason, and 12k's figures in place of 05c2's two-SAFE example. The engine keeps the fewest until 05c4, and E20 says so.
- **X1:** warrant shares exercised into a series that keeps its preference, with 12l's figures.
- **SPEC:** item 12 lists 12k and 12l.
- **The plan:**
  - your three items, and 05c3 and 05c4
  - two changed-behavior lines for 0.5.0's release notes: the SAFEs' tie (12k) and warrant shares (12l)
  - 05c2's two-SAFE line replaced

## For 05c4

**Both rules in the engine,** with its README and reasons.

**The speed work:**
- **With rule 2,** the SAFEs' answer can come from starting with all of them converting and dropping, one at a time, any that does strictly better taking cash, until none does. That's your idea. Today the engine weighs every combination of SAFEs whenever its two ends disagree, which they do for equal SAFEs, so the work doubles with each SAFE.
- **I'll time** Larkspur and its note with 2 to 10 SAFEs, and check the result against the reference's brute force on randomized tables. The brute force itself doubles with each SAFE, so the randomized tables keep to about 6.
- **If 10 SAFEs can't get under 5 seconds** on CI's machine, I'll say so with the numbers.

## Checks

- **Reference:** 67 unit tests pass, and every `expected.json` matches.
- **Engine:** 2,207 tests pass, with 12k and 12l named as waiting.
- **Page:** 470 tests pass.
- **Typecheck:** clean.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**
- **This PR touches `cases/`,** so it needs the cases label from you.

## Next

05c4, once you've re-derived 12k and 12l. I'm stopping here.
