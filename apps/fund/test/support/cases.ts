// The fund cases the page's tests run (packages/fund/cases, FC2): every case with an inputs.json, less the pending
// ones. The refusal sets are the engine's to run (FC7); the page's tests never have.

import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const CASES_DIR = resolve(import.meta.dirname, "../../../../packages/fund/cases");
/** Every fund case folder. */
export const CASE_FOLDERS = readdirSync(CASES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("fund-"))
  .map((d) => d.name)
  .sort();
/**
 * Pending: cases the engine runs before the page reads them. Empty since f03c, the page's step for 0.3.0's classes and
 * later closes. test/pending.test.ts fails if a case folder is neither run nor pending (nor a refusal set), or if this
 * list names a folder that doesn't exist.
 */
export const PENDING: readonly string[] = [];
/** The cases the page's tests run as a fund. */
export const RUN_CASES = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "inputs.json")) && !PENDING.includes(d));
/** The refusal sets, which only the engine's tests run (FC7). */
export const REFUSAL_SETS = CASE_FOLDERS.filter((d) => existsSync(join(CASES_DIR, d, "fixtures")) && !PENDING.includes(d));
