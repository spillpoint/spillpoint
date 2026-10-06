// The public API is deliberate: this list changes only on purpose.

import { expect, it } from "vitest";

import * as spillpoint from "../src/index.ts";

it("exports exactly the public API", () => {
  expect(Object.keys(spillpoint).sort()).toEqual([
    "D",
    "InputError",
    "NoAnswerError",
    "UnsupportedTermError",
    "buildCapTables",
    "findBreakpoints",
    "parseExact",
    "payout",
    "prepare",
    "readCapTable",
    "readExit",
    "readInputs",
    "solve",
    "toCents",
  ]);
});
