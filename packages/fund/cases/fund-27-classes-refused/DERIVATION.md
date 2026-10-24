# Fund case 27, the classes refused: derivation

Twenty small changes, one or more for each new line of F28, each to a base case named in its fixture (FC12). Each change leaves one problem, so each result is one refusal: its kind, its term, and the field, as a path into the input.

**The bases:**
- **Case 22** for the classes and an LP's class: a "Friends and family" class (fee rate 0, carry 0) beside the fund's 2% and 20%-then-25%, with Cedar Holdings, `lps[2]`, in it. Its fee calls are `cash_flows[1]` and `cash_flows[2]`.
- **Case 23** for a class's carry against the catch-up: an 8% pref, a full catch-up, and an "Anchor" class at 10% carry.
- **Case 25** for a close and the equalization rate: Cedar Holdings, `lps[2]`, closing on 2021-07-15, after the first calls on 2021-01-15, with an 8% equalization rate and a distribution on 2024-06-30.

Each base is fine as it is. Nothing else in a fixture's base can be refused.

**The order of checks** (F28) decides which refusal comes when a change could trip two:
1. **Unsupported terms,** a class's keys and its carry's among them.
2. **The fields:** the fund's own terms, then `fee_rate`, `equalization_rate`, and each class in order: its shape, its name, the name repeating, its fee rate, its carry, its carry against the catch-up.
3. **The cash flows** against each other and D.
4. **The LPs,** each through before the next, its class and its close last.
5. **What the LPs need of the rest:** a later close's equalization rate, then each call in date order for an LP to pay it.

## The classes (stages 1 and 2)

| Fixture | Base | The change | Refused |
|---|---|---|---|
| `classes-not-a-list` | 22 | `terms.lp_classes` set to one class's object, `{"name": "Friends and family"}` | input, `bad_field`, `terms.lp_classes` |
| `class-not-an-object` | 22 | the class set to its name alone, `"Friends and family"` | input, `bad_field`, `terms.lp_classes[0]` |
| `class-own-pref` | 22 | the class given `"pref": {"rate": "0.06"}` | unsupported, `pref`, `terms.lp_classes[0].pref` |
| `class-no-name` | 22 | the class's `name` removed | input, `missing_field`, `terms.lp_classes[0].name` |
| `class-blank-name` | 22 | the class named `"  "`, two spaces | input, `bad_field`, `terms.lp_classes[0].name` |
| `class-name-repeated` | 22 | a second class, `{"name": "Friends and family", "carry": "0.10"}` | input, `lp_class_name_repeated`, `terms.lp_classes[1].name` |

- **`classes-not-a-list`:** the classes are a list, even with one. A lone object is refused at `terms.lp_classes`. Stage 1 looks for unsupported keys only in a list's classes, so the object's `name` isn't read as one.
- **`class-not-an-object`:** a class is a name with optional terms; a name alone isn't one. The class Cedar names is then gone, but stage 2 refuses the class before stage 4 reads Cedar.
- **`class-own-pref`:** F22 lets a class change only its fee and its carry, so its own pref is a term 0.3.0 doesn't model. Unsupported, named by its own key, at stage 1.
- **`class-no-name`:** a class needs its name, since that's how an LP picks it.
- **`class-blank-name`:** two spaces are blank, as for an LP's name (FA17, FA27).
- **`class-name-repeated`:** the second class has the first's name. The repeat is checked right after the name, so its 10% carry, which is fine anyway, is never reached. The change sets `terms.lp_classes[1]` on a list of one, so it adds the second class (FC12).

## A class's fee rate and the fund's (stage 2)

| Fixture | Base | The change | Refused |
|---|---|---|---|
| `class-fee-rate-without-fund-rate` | 22 | `terms.fee_rate` removed | input, `missing_field`, `terms.fee_rate` |
| `class-fee-rate-negative` | 22 | the class's fee rate set to `"-0.01"` | input, `bad_number`, `terms.lp_classes[0].fee_rate` |
| `fund-fee-rate-zero` | 22 | `terms.fee_rate` set to `"0"` | input, `bad_number`, `terms.fee_rate` |

- **`class-fee-rate-without-fund-rate`:** a class's fee rate is measured against the fund's standard rate (F22), so with the class's "0" the fund must give one. The class's own rate is checked first and is fine (FA25); the refusal is at the fund's missing `fee_rate`.
- **`class-fee-rate-negative`:** a fee rate can be 0, no fees, but not below it.
- **`fund-fee-rate-zero`:** the fund's standard rate is what a class's divides by, so it must be above 0. It's checked before the classes, at the fund's own path.

## A class's carry (stage 2)

| Fixture | Base | The change | Refused |
|---|---|---|---|
| `class-carry-not-below-one` | 22 | the class's carry set to `"1"` | input, `carry_rate_not_below_one`, `terms.lp_classes[0].carry` |
| `class-carry-steps-out-of-order` | 22 | the class's carry set to steps of 20%, then 15% from 3x | input, `steps_out_of_order`, `terms.lp_classes[0].carry.steps[1]` |
| `class-carry-not-below-catch-up` | 23 | the catch-up's share set to `"0.5"` and Anchor's carry to `"0.5"` | input, `catch_up_share_not_above_carry`, `terms.lp_classes[0].carry` |

- **`class-carry-not-below-one`:** F9's refusal for a carry of 100%, at the class's path.
- **`class-carry-steps-out-of-order`:** F9's refusal for steps whose rate falls, at the step that falls, inside the class's carry.
- **`class-carry-not-below-catch-up`:** the class's catch-up runs to its own first carry rate (F22), so a partial catch-up's share must be above it, as F8 has it for the fund.
  - **The fund's own terms are fine:** a 50% share against the fund's 20%.
  - **Anchor's aren't:** 50% isn't above Anchor's 50%. The refusal is at the class's `carry` (F28), where the fund's own is at `terms.catch_up.gp_share` (F18).

## An LP's class and close (stage 4)

| Fixture | Base | The change | Refused |
|---|---|---|---|
| `lp-class-unknown` | 22 | Cedar's class set to `"Friends & family"` | input, `lp_class_unknown`, `lps[2].class` |
| `lp-class-not-text` | 22 | Cedar's class set to the number 7 | input, `bad_field`, `lps[2].class` |
| `lp-close-bad-date` | 25 | Cedar's close set to `"2021-02-30"` | input, `bad_date`, `lps[2].close` |
| `lp-close-after-distribution` | 25 | Cedar's close set to `"2024-07-01"` | input, `lp_close_after_distribution`, `lps[2].close` |

- **`lp-class-unknown`:** a class is named exactly (FA27), and "Friends & family" isn't "Friends and family".
- **`lp-class-not-text`:** 7 isn't text, so it can't be a class's name.
- **`lp-close-bad-date`:** there's no 30 February.
- **`lp-close-after-distribution`:** a close must come before the fund's first distribution (F25), here 2024-06-30, so 2024-07-01 is too late.

Alder and Birchwood, `lps[0]` and `lps[1]`, are fine in each, so the refusal names Cedar.

## What the LPs need of the rest (stage 5)

| Fixture | Base | The change | Refused |
|---|---|---|---|
| `later-close-without-rate` | 25 | `terms.equalization_rate` removed | input, `missing_field`, `terms.equalization_rate` |
| `equalization-rate-negative` | 25 | `terms.equalization_rate` set to `"-0.08"` | input, `bad_number`, `terms.equalization_rate` |
| `fee-call-without-payers` | 22 | Alder's and Birchwood's class set to "Friends and family" too | input, `call_without_payers`, `cash_flows[1]` |
| `first-call-without-payers` | 25 | Alder's and Birchwood's close set to `"2021-02-01"` | input, `call_without_payers`, `cash_flows[0]` |

- **`later-close-without-rate`:** Cedar joins at a later close, so equalization interest must be entered, "0" for none (F25). The check comes once the LPs are read, since only they say there's a later close.
- **`equalization-rate-negative`:** the rate can be 0 but not below it. This one is a field of the terms, checked at stage 2, not stage 5; it's here beside its partner.
- **`fee-call-without-payers`:** with all three LPs in a class paying no fees, every fee weight is 0 (F22), and no LP would pay a fee call. The calls are checked in date order: `cash_flows[0]` is an investment call, which they pay by commitment; `cash_flows[1]`, the 2022-01-01 fee call, is the first no one pays.
- **`first-call-without-payers`:** with Alder and Birchwood closing on 2021-02-01 and Cedar on 2021-07-15, no LP is in on 2021-01-15 (FA21). The first call in date order is `cash_flows[0]`, the investment call listed before that day's fee call. Every close is after the first call, so the equalization rate is needed, and case 25 gives it.
