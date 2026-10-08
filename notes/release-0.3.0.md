# spillpoint 0.3.0: release notes (draft)

The items owed before release, and the carve-out as a term of the sale. The version in `packages/engine/package.json` moves to 0.3.0 in 03j, and is published from there.

*This is a draft. Each engine and page PR adds its part, 03e onward. 03j finishes it.*

## New

- **A carve-out as a term of the sale** (03e, case 24):
  - The exit input takes `carve_out`, beside `exit_date` and `payment_schedules`, in the same fields as the cap table's. So a company built from its rounds can have one.
  - A cap table may still carry its own, for compatibility. An input with one in both places is refused with an `InputError`.
- **A SAFE or note with no cap beside capped participating preferred** (03e, cases 12i and 13h):
  - Converting is worth exactly its amount ÷ (1 − discount), a purchase amount for a SAFE, principal plus interest for a note.
  - It takes that out of what is left after the preferences first, and the capped series stops at its cap in what remains. So payouts stay straight lines between breakpoints.
  - Before 0.3.0 this was refused, as `uncapped_safe_with_capped_participation` and `uncapped_note_with_capped_participation`.

- **A warrant coming into the money on a curve** (03f, case 8b): with a carve-out alongside the preferences, a warrant for a series in the short tier can come into the money while payouts curve. The breakpoint finder now places that kink exactly ($20,000,000 ÷ 19 in 8b), where 0.2.0 stopped with a `NoAnswerError`. Any other decision changing on a curve still stops it.

- **A post-money SAFE converting beside notes or other SAFEs** (03g, cases 21b–21d): its Company Capitalization counts their exact conversion shares, before rounding down, solved together with the round's price (YC's Converting Securities). Before 0.3.0, beside a note or a pre-money SAFE, this was refused, as `post_money_safe_with_pre_money_instruments`.
- **A pay-to-play round that also converts SAFEs or notes** (03g, case 17i): a SAFE's Company Capitalization and a note's base count the cap table the round is priced on, after the conversion by default, before it under the toggle. Before 0.3.0 this was refused, as `pay_to_play_with_conversions`.

*To come:* 03h, conversions in a round that triggers anti-dilution (16g–16j, 17j); 03i, the page.

## Changed answers

Inputs that gave one answer in 0.2.0 and give another in 0.3.0:
- **(03g)** A post-money SAFE converting beside a SAFE with no cap: the uncapped SAFE's shares now count in the post-money SAFE's Company Capitalization, as YC's text and the reference always had them. 0.2.0 built such a round but left them out, giving the post-money SAFE fewer shares and the round a higher price.
- **(03f, a fix)** Two or more warrants for the same series, exercised together: each now gets its pro rata part of the series' total. 0.2.0 paid the second warrant a part of what the first left, so it underpaid it and overpaid the series. A saved company with two warrants for one series gives a different, correct answer after upgrading. No worked case had two.
- **(03h)** A SAFE or note converting below an earlier series' conversion price now adjusts that series, even when the round itself is priced above it (case 16i). A saved company like that gives a different answer after upgrading.

## Changed wording

- **A SAFE or note with no cap, switching to conversion** (03e): with preferred stock, the reason now says the conversion needs room in what is left after the preferences, not in what is left for common and the SAFE or note. Participating or converted preferred shares that residual too (12i at $4,250,000, 13h at $4,400,000).

## New in the API

- **`exit.carve_out`** (03e): see above.

## Still refused

The engine README's list of terms refused as `"later"` loses, in 03e, a SAFE or a note with no cap beside capped participating preferred, and in 03g, a post-money SAFE beside notes or pre-money SAFEs and a pay-to-play round that converts SAFEs or notes. 03h narrows its anti-dilution line to what stays refused (`docs/ASSUMPTIONS.md`, "Later").
