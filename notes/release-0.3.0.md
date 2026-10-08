# spillpoint 0.3.0: release notes

The items owed before release: SAFEs and notes converting alongside other terms in a priced round, a warrant coming into the money on a curve, a SAFE or note with no cap beside capped participating preferred, and the carve-out as a term of the sale. The version in `packages/engine/package.json` is 0.3.0; it is published from there.

## New

- **SAFEs and notes converting in a round that triggers anti-dilution** (03h, cases 16g–16j and 17j):
  - **Each conversion is a piece of the round,** tested at the price it converts at, as the new money is at the round's price. A series is adjusted when any piece is priced below its conversion price, and only those pieces count in B and C: what was paid for them (the new money's cash, a SAFE's purchase amount, a note's principal plus interest) and their shares.
  - **A conversion counts in A instead,** at the shares it receives, when the round exempts conversions (the new round field `anti_dilution_exempts_conversions`, a charter carve-out or a waiver) or when the SAFE or note was issued before the series.
  - **With pay-to-play,** the conversion comes first, as before (R21), and only the preferred that remains is adjusted.
  - **Each adjustment reports its pieces** (`AntiDilutionAdjustment.pieces`).
  - Before 0.3.0 every such round was refused, as `anti_dilution_with_conversions`.
- **A post-money SAFE converting beside notes or other SAFEs** (03g, cases 21b–21d): its Company Capitalization counts their exact conversion shares, before rounding down, solved together with the round's price (YC's Converting Securities). Before 0.3.0, beside a note or a pre-money SAFE, this was refused, as `post_money_safe_with_pre_money_instruments`.
- **A pay-to-play round that also converts SAFEs or notes** (03g, case 17i): a SAFE's Company Capitalization and a note's base count the cap table the round is priced on, after the conversion by default, before it under the toggle. Before 0.3.0 this was refused, as `pay_to_play_with_conversions`.
- **A SAFE or note with no cap beside capped participating preferred** (03e, cases 12i and 13h):
  - Converting is worth exactly its amount ÷ (1 − discount): a purchase amount for a SAFE, principal plus interest for a note.
  - It takes that out of what is left after the preferences first, and the capped series stops at its cap in what remains. So payouts stay straight lines between breakpoints.
  - Before 0.3.0 this was refused, as `uncapped_safe_with_capped_participation` and `uncapped_note_with_capped_participation`.
- **A warrant coming into the money on a curve** (03f, case 8b): with a carve-out alongside the preferences, a warrant for a series in the short tier can come into the money while payouts curve. The breakpoint finder now places that kink exactly ($20,000,000 ÷ 19 in 8b), where 0.2.0 stopped with a `NoAnswerError`. Any other decision changing on a curve still stops it.
- **A carve-out as a term of the sale** (03e, case 24):
  - The exit input takes `carve_out`, beside `exit_date` and `payment_schedules`, in the same fields as the cap table's. So a company built from its rounds can have one.
  - A cap table may still carry its own, for compatibility. An input with one in both places is refused with an `InputError`.

## On the page

- **The carve-out is a term of the sale** for every cap table, entered directly or built from rounds (03i). Files are saved as version 5, with the carve-out beside the sale's date and payment schedules. A version 4 file with one in its cap table opens with it moved there.
- **A round's anti-dilution shows each piece** (03i, 03j), in a plain line indented under the adjustment: the new money and each SAFE and note, at its price, and whether it counts against the series, or counts in the starting share count because it was issued before the series or the round exempts it.
- **The round's new setting** (03i), "SAFE and note conversions in this round don't count toward anti-dilution (a charter carve-out or waiver)", under "More terms". It shows when a SAFE or note converts in the round and a series has anti-dilution.
- **The unissued-pool setting** is now "Anti-dilution base includes the unused option pool (smaller adjustments for earlier investors)" (03i). It shows only when a series has broad-based anti-dilution.
- **A setting that's on always shows** (03i, 03j), with "(doesn't apply to this round)" where it doesn't apply.
- **A new event's blank fields** are all marked at once, not one at a time (03i).
- **A round's lines use one money format each** (03j): a note's amount, principal and interest all to the cent, and the pro-rata and pay-to-play lines too, which hid a cent short.

## Changed answers

Inputs that gave one answer in 0.2.0 and give another in 0.3.0:
- **(03h)** A SAFE or note converting below an earlier series' conversion price now adjusts that series, even when the round itself is priced above it (case 16i). A saved company like that gives a different answer after upgrading.
- **(03g)** A post-money SAFE converting beside a SAFE with no cap: the uncapped SAFE's shares now count in the post-money SAFE's Company Capitalization, as YC's text and the reference always had them. 0.2.0 built such a round but left them out, giving the post-money SAFE fewer shares and the round a higher price.
- **(03f, a fix)** Two or more warrants for the same series, exercised together: each now gets its pro rata part of the series' total. 0.2.0 paid the second warrant a part of what the first left, so it underpaid it and overpaid the series. A saved company with two warrants for one series gives a different, correct answer after upgrading. No worked case had two.

## New in the API

- **`exit.carve_out`** (03e): see above.
- **`anti_dilution_exempts_conversions`** on a priced round (03h): see above.
- **`AntiDilutionAdjustment.pieces`** (03h): each piece of the round, its price, whether it counted, and its shares in A when it counted there instead. Null when nothing converts. A new exported type, `AntiDilutionPiece`.
- **`AntiDilutionAdjustment.a`** (03h) counts the conversions that go in A. Without conversions it's unchanged.
- **A new refusal name** (03h): `discounted_conversion_in_anti_dilution_a`, milestone `"later"`, for a SAFE or note at its discount counted in a series' A in a round that adjusts that series with the adjustment shares in its price.

## Changes that can break 0.2.0 code

- **The changed answers above.**
- **Refusal terms** (03e–03h), for code that matches on an `UnsupportedTermError`'s `term`:
  - **`anti_dilution_with_conversions`** now means only full-ratchet or narrow-based anti-dilution with conversions. In 0.2.0 it meant every round with conversions that triggered anti-dilution.
  - **`discounted_conversion_in_anti_dilution_a`** is new.
  - **No longer raised:** `uncapped_safe_with_capped_participation` and `uncapped_note_with_capped_participation` (03e), and `post_money_safe_with_pre_money_instruments` and `pay_to_play_with_conversions` (03g).
- **`AntiDilutionAdjustment` has a new required field, `pieces`** (03h). It matters only to code that builds one itself, such as a test fixture.
- **One reason's wording** (03e): a SAFE or note with no cap, switching to conversion where there is preferred stock, now says the conversion needs room in "what is left after the preferences", not "what is left for common and the SAFE" (or the note). Participating or converted preferred shares that residual too (12i at $4,250,000, 13h at $4,400,000). Reason codes are unchanged.

## Still refused

Refused as `"later"`, each until a case settles it (the engine README's list):
- **Full-ratchet or narrow-based anti-dilution in a round that converts SAFEs or notes,** as `anti_dilution_with_conversions`.
- **A SAFE or note at its discount counted in a series' A,** because the round exempts conversions or it was issued before the series, in a round that adjusts that series with the adjustment shares in its price, as `discounted_conversion_in_anti_dilution_a`. Where nothing adjusts the series, it builds.
- **The rest of 0.2.0's list, unchanged:**
  - more than one conversion group
  - notes with compound interest or a post-money cap
  - cumulative dividends added to what converts, or on a series issued by an `issue` event
  - at a sale: several SAFEs unless each has a post-money cap, a pre-money SAFE beside preferred, several notes unless each has a cap, and a note beside a SAFE or a carve-out

`docs/ASSUMPTIONS.md`'s "Later" section lists the 0.3.0 work's deferrals, with the choices that could become toggles.
