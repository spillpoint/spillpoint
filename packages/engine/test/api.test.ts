// The public API is deliberate: this list changes only on purpose.

import { expect, it } from "vitest";

import * as spillpoint from "../src/index.ts";

it("exports exactly the public API", () => {
  expect(Object.keys(spillpoint).sort()).toEqual([
    "D",
    "ImportRefusal",
    "InputError",
    "NoAnswerError",
    "OcfRefusal",
    "UnsupportedTermError",
    "buildCapTables",
    "findBreakpoints",
    "parseExact",
    "paySchedule",
    "payout",
    "prepare",
    "readCapTable",
    "readExit",
    "readInputs",
    "readOcf",
    "solve",
    "toCents",
  ]);
});

// A refusal says what isn't modeled, never when it might be: since 0.6.0 it
// carries no milestone, as the 0.2.0 deprecation note promised.
it("refuses a term with what isn't modeled, and nothing about when", () => {
  let error: unknown;
  try {
    spillpoint.readCapTable({
      holders: [{ id: "a", name: "A" }],
      securities: [
        { id: "common", name: "Common Stock", kind: "common" },
        { id: "s1", name: "Seed-1", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "non_participating" },
        { id: "s2", name: "Seed-2", kind: "preferred", original_issue_price: "1", preference_multiple: "1", participation: "non_participating" },
      ],
      seniority: [["s1", "s2"]],
      conversion_groups: [["s1"], ["s2"]],
      positions: [{ holder: "a", security: "common", shares: 1 }],
    });
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(spillpoint.UnsupportedTermError);
  expect({ ...(error as object) }).toEqual({ name: "UnsupportedTermError", term: "conversion_groups", path: "cap_table.conversion_groups" });
  expect((error as Error).message).toBe(
    "cap_table.conversion_groups: More than one conversion group (E17: the order in which groups decide isn't settled). " +
      "The engine doesn't model this, so it refuses the input rather than ignoring the term.",
  );
});
