// The page's case tests run every fund case folder, or have it on the pending list (f02a), so no case is skipped
// silently and a new one can't slip past. The refusal sets are the engine's to run.

import { describe, expect, it } from "vitest";

import { CASE_FOLDERS, PENDING, REFUSAL_SETS, RUN_CASES } from "./support/cases.ts";

describe("the page's case tests", () => {
  it.each(CASE_FOLDERS)("run %s, have it pending, or leave it to the engine as a set of refusals", (dir) => {
    const ways = [RUN_CASES.includes(dir), PENDING.includes(dir), REFUSAL_SETS.includes(dir)];
    expect(ways.filter(Boolean)).toHaveLength(1);
  });

  it("have only case folders pending", () => {
    for (const dir of PENDING) expect(CASE_FOLDERS, dir).toContain(dir);
  });
});
