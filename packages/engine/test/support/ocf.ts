// Reads the OCF cases (C16) for the importer's tests: a package's files, or a
// base package with one fixture added (a manifest fixture replaces the base's).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { OcfFile } from "../../src/index.ts";
import { CASES_DIR, OCF_CASES } from "./cases.ts";

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export const OCF_PACKAGE_CASES = OCF_CASES.filter((name) => existsSync(join(CASES_DIR, name, "package")));
export const OCF_FIXTURE_CASES = OCF_CASES.filter((name) => existsSync(join(CASES_DIR, name, "fixtures")));

export function packageFiles(name: string): OcfFile[] {
  const dir = join(CASES_DIR, name, "package");
  return readdirSync(dir).sort().map((file) => ({ name: file, content: readJson(join(dir, file)) }));
}

export function fixtureNames(caseName: string): string[] {
  return readdirSync(join(CASES_DIR, caseName, "fixtures")).sort();
}

export function withFixture(caseName: string, fixture: string): OcfFile[] {
  const base = (readJson(join(CASES_DIR, caseName, "expected.json")) as { base: string }).base;
  const added: OcfFile = { name: fixture, content: readJson(join(CASES_DIR, caseName, "fixtures", fixture)) };
  const isManifest = (f: OcfFile) => (f.content as { file_type?: string }).file_type === "OCF_MANIFEST_FILE";
  return isManifest(added) ? [...packageFiles(base).filter((f) => !isManifest(f)), added] : [...packageFiles(base), added];
}

/**
 * Cases and fixtures that hold options, plans, warrants or convertibles, which the importer reads from 04e. Until
 * then each is refused as `not_yet_read`, after every other check, so the rest of each package is still checked.
 */
export const OCF_NOT_YET: ReadonlySet<string> = new Set([
  "ocf-01-larkspur", "ocf-02-not-needed", "ocf-04-to-fill",
  "ocf-07-edge-07", "ocf-08-edge-08", "ocf-09-edge-12b", "ocf-10-edge-13a", "ocf-11-millrace", "ocf-12-ledger",
  ...[
    "stock-appreciation-right", "return-to-pool-conflict", "pool-overdrawn", "unknown-stock-plan",
    "safe-exit-multiple", "convertible-seniority", "convertible-mechanism-mismatch", "convertible-security", "convertible-triggers-differ",
    "note-rate-periods", "note-day-count", "note-compounding", "note-cash-interest", "note-accrual-period", "note-mfn",
    "warrant-mechanism", "warrant-quantity",
  ].map((f) => `ocf-03-refused/${f}.ocf.json`),
]);

/** The object types read from 04e, removed for the interim check of a package's classes and share ledger. */
export const READ_FROM_04E = /^(STOCK_PLAN|TX_STOCK_PLAN_|TX_EQUITY_COMPENSATION_(?!ACCEPTANCE)|TX_PLAN_SECURITY_(?!ACCEPTANCE)|TX_WARRANT_(?!ACCEPTANCE)|TX_CONVERTIBLE_(?!ACCEPTANCE))/;

export function withoutOptionsWarrantsAndConvertibles(files: OcfFile[]): OcfFile[] {
  return files.map((f) => {
    const content = f.content as { items?: { object_type: string }[] };
    return content.items ? { name: f.name, content: { ...content, items: content.items.filter((o) => !READ_FROM_04E.test(o.object_type)) } } : f;
  });
}
