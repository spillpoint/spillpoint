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
