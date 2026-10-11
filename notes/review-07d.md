# Review: 07d (the naming review: the page)

Branch `07d-page`. It covers:
- item 6, the pro-rata pool setting
- strikes to the cent on the Rounds tab
- `Draft.late()`, removed

**Unchanged:** nothing under `cases/`, and nothing in the engine's public API. `index.ts` has no diff; the one engine change is inside the OCX import. Three commits:

| Commit | What |
|---|---|
| `036dd42` | Item 6: the pro-rata pool setting, in plain words |
| `4568217` | Strikes to the cent on the Rounds tab, as the class names write them |
| `bcfa848` | `Draft.late()` goes |

## 1. Item 6: the pro-rata pool setting

**The label:** a round's "More terms" said "Pro-rata counts the unissued pool". It now says, in your words: "Pro-rata base includes the unused option pool (smaller pro-rata rights for earlier investors)".

**When it shows,** as 03i did for its two anti-dilution settings:
- **It applies** when the round has an investment marked "Under its pro-rata right": shown.
- **It doesn't apply, and it's on:** shown, as "… (doesn't apply to this round)", so a saved setting is never hidden.
- **It doesn't apply, and it's off:** not shown.

**The saved file** keeps the field's name, `pro_rata_base_includes_unissued_pool`.

**ASSUMPTIONS:** the Later list's entry for the label is removed.

**Tests,** in `rounds-editor.test.tsx`, beside 03i's:
- **Millrace:** its Series A, which has Harbor Lane's pro-rata investment, shows the setting, off. Its Seed, which has none, doesn't show it.
- **Case 18b:** its Series A shows the setting on. Untick its investment's pro-rata, and the setting stays, ticked, as "… (doesn't apply to this round)".

## 2. Strikes to the cent

**What it said:** the Rounds tab wrote a grant's and a warrant's strike as typed: "options at $0.1 a share" and "at $1 a share", beside classes 07b named "Options ($0.10 strike)" and "($1.00 strike)".

**The rule:** `format.ts`'s new `strikeText` writes a strike as the engine's class names do:
- money to the cent at least
- every further place kept
- never rounded

It reads the strike with the engine's `parseExact`, as the engine does, so a sentence and the class it names always agree, even for a strike typed as a fraction.

**Where it's used:**
- **The Rounds tab:** a grant, "Lena Fischer: 1,000 options at $0.10 a share, from the pool.", and a warrant, "… at $1.00 a share, not from the pool."
- **The OCF import's report:** its "options at $x" line used a price format that rounded past six places, so an OCF strike with more places was rounded there. It uses `strikeText` now.

**The rest of the page, checked:**
- **The cap table editor's strike fields** show what was typed, since they're inputs. Under a strike typed as a fraction, the "About $x a share" hint is an approximation and says so.
- **The other prices** on the Rounds tab and in the imports' reports are worked out, not typed: a round's price, a conversion price, an issue price. They show to the cent when exact and otherwise to six places, as 05e set.
- **The amounts** on the Rounds tab, SAFE amounts and caps, show to the dollar, and percentages as typed.
- **Class names** come from the engine, to the cent since 07b.
- **Not changed:** the engine's breakpoint reasons write a strike as "Options at a $0.10 strike", to the cent and up to six places. That's the engine's own text, which this step doesn't change. No case has a strike past four places.

**Tests:**
- **`format.test.ts`:** `strikeText` for "0.1", "1", 5, "0.0125", "0.123456789" and a Decimal. For "0.1", "5", "0.0125" and "1/3", it matches the engine's own name for the class a grant at that strike makes.
- **`rounds-editor.test.tsx`:**
  - a grant at 0.1 added on the page reads "$0.10 a share", and the Cap table tab shows "Options ($0.10 strike)"
  - the warrant test reads "$1.00"

## 3. `Draft.late()`

**What it was:** the OCX import's `Draft` kept "late" notes to add after the cap table's own.
- Nothing called `late()`.
- `result()` adds the issue-order and left-out lines itself, so nothing read what it kept.

**Removed:** the method, its list and the loop that emptied it. Every OCX case and fixture reads as before.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - all 3,115 engine tests, unchanged
   - 658 page tests: 654 before, plus 2 for item 6, 1 for `strikeText` and 1 for the grant
   - the reference's 73 unit tests
   - all 83 exit and round cases matching the reference
2. **On the page,** with `pnpm dev`. Millrace opens.
   - **The pro-rata setting:** on the Rounds tab, edit the Seed and open "More terms": no pro-rata setting. Edit the Series A: "Pro-rata base includes the unused option pool (smaller pro-rata rights for earlier investors)", off. Untick Harbor Lane's "Under its pro-rata right", and the setting goes. Tick it again, and the setting is back.
   - **A strike:** add "Options granted" at the end, for Lena Fischer, 1,000 options at a strike of 0.1. The event reads "Lena Fischer: 1,000 options at $0.10 a share, from the pool." On the Cap table tab, the class is "Options ($0.10 strike)".
   - **A warrant:** add "Warrants issued" at a strike of 1. It reads "at $1.00 a share".
3. **No case changed:** `git diff --stat main -- cases` prints nothing.

## Decisions for you to check

1. **The OCF import's report uses `strikeText` too,** where it rounded a strike past six places. You named the Rounds tab; I took "the rest of the page" to include this.
2. **The engine's breakpoint reasons keep their own strike format** (above), since this step doesn't change the engine's text. If you'd rather they matched, that's an engine change for its own step.

## Assumptions added or changed

No modeling choice changed. The Later list's entry for the pro-rata label is removed, now done.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/`.
- **Nothing ran outside the sandbox.**

## Next

07e, release 0.7.0: the version, the release notes with "Changes that can break 0.6.0 code" item by item, both READMEs, and the packed build checked. I'm stopping here.
