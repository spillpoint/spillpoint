// The engine's case tests run every fund case folder, or have it on the pending list (f02a), so no case is skipped
// silently and a new one can't slip past.

import { describe, expect, it } from "vitest";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { CASES_DIR, CASE_FOLDERS, PENDING, PENDING_FIXTURES, REFUSAL_CASES, RUN_CASES } from "./support/cases.ts";

describe("the engine's case tests", () => {
  it.each(CASE_FOLDERS)("run %s as a fund or a set of refusals, or have it pending", (dir) => {
    const run = RUN_CASES.includes(dir) || REFUSAL_CASES.includes(dir);
    expect(run !== PENDING.includes(dir), "run or pending, not both").toBe(true);
  });

  it("have only case folders pending", () => {
    for (const dir of PENDING) expect(CASE_FOLDERS, dir).toContain(dir);
  });

  it("have only fixtures pending that exist, in a set of refusals they run", () => {
    for (const path of PENDING_FIXTURES) {
      expect(existsSync(join(CASES_DIR, path)), path).toBe(true);
      expect(REFUSAL_CASES, path).toContain(path.split("/")[0]);
    }
  });
});
