// The fund package's exports are deliberate: this list changes only on purpose. Every name is provisional until the
// naming review before 0.1.0.

import { expect, it } from "vitest";

import * as fund from "../src/index.ts";

it("exports exactly the fund engine's API", () => {
  expect(Object.keys(fund).sort()).toEqual(["D", "FundRefusal", "findBreakpoints", "readFund", "splitAt", "splitAtNav", "toCents"]);
});
