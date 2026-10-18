# Fund case 21, the LPs refused: derivation

Eleven small changes to case 1's input, at least one for each line of F21. Case 1 has no LPs; each change sets `lps` and leaves one problem, so each result is one refusal: its kind, its term, and the field, as a path into the input.

**The base, case 1:** carry 20%, one $5,000,000 investment call on 2022-03-01, D = `as_of` = 2026-03-01. Nothing else in it can be refused.

**The order of checks** (F21, FA19) decides which refusal comes when a change could trip two:
- **The LPs come last,** after everything F18 checks (FA2's three stages), so these refusals only show on an input that's otherwise fine.
- **Then `lps` itself:** a list, or left out, `null` or empty for no LPs.
- **Then each LP in the list's order,** checked through before the next:
  1. its shape and its fields
  2. that the name and commitment are there
  3. the name
  4. the commitment
  5. whether the name repeats an earlier LP's

## The list and each LP's shape

| Fixture | The change | Refused |
|---|---|---|
| `lps-not-a-list` | `lps` set to one LP's object, `{"name": "Alder", "commitment": "1000000"}` | input, `bad_field`, `lps` |
| `lp-not-an-object` | `lps` set to `["Alder"]` | input, `bad_field`, `lps[0]` |
| `lp-side-letter-carry` | one LP, Alder at $1,000,000, with `"carry": "0.15"` | unsupported, `carry`, `lps[0].carry` |

- **`lps-not-a-list`:** the LPs are a list, even with one. A lone object is refused at `lps`.
- **`lp-not-an-object`:** an LP is a name and a commitment; a name alone isn't one. The path is the LP's place in the list.
- **`lp-side-letter-carry`:** a side letter's carry break is a per-LP term v1 doesn't model (F19's later work). It's unsupported, not an input error: the fund may well have it. Like an unknown term, it's named by its own key.

## The name and the commitment

| Fixture | The change | Refused |
|---|---|---|
| `lp-no-name` | one LP with a commitment of "1000000" and no name | input, `missing_field`, `lps[0].name` |
| `lp-no-commitment` | Alder at $1,000,000, then Birch with no commitment | input, `missing_field`, `lps[1].commitment` |
| `lp-blank-name` | one LP named "  ", two spaces | input, `bad_field`, `lps[0].name` |
| `lp-name-not-text` | one LP named 7, a JSON number | input, `bad_field`, `lps[0].name` |
| `lp-zero-commitment` | Alder's commitment set to "0" | input, `bad_number`, `lps[0].commitment` |
| `lp-negative-commitment` | Alder's commitment set to "-5" | input, `bad_number`, `lps[0].commitment` |
| `lp-commitment-a-number` | Alder's commitment as the JSON number 1000000 | input, `bad_number`, `lps[0].commitment` |

- **`lp-no-name`:** an LP needs its name. Missing and `null` are the same (F21).
- **`lp-no-commitment`:** the first LP is fine, so the refusal names the second, `lps[1]`.
- **`lp-blank-name`:** a name is text that isn't blank, and two spaces are blank (FA17).
- **`lp-name-not-text`:** 7 isn't text, though "7" would be a name.
- **`lp-zero-commitment`:** a commitment must be above 0 (F21). An LP that commits nothing gets no share.
- **`lp-negative-commitment`:** below 0 is refused the same way.
- **`lp-commitment-a-number`:** numbers are exact strings (F17), so the JSON number 1000000 is refused, though its value is fine.

## A repeated name

| Fixture | The change | Refused |
|---|---|---|
| `lp-name-repeated` | three LPs: Alder at $1,000,000, Birch at $1,000,000, Alder at $2,000,000 | input, `lp_name_repeated`, `lps[2].name` |

- **`lp-name-repeated`:** no two LPs share a name (F19), since the name is how an LP is told apart. The refusal is at the later LP's name, `lps[2].name`, with the term new in 0.2.0. It comes last within the LP, so the third Alder's commitment is checked first, and it's fine.
