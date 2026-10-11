// The names code can match on, stable from 1.0 (the naming review's item 17), are each in the README with what they
// mean. The engine raises and notes them only through stable-names.ts's lists, whose types every raise site takes, so
// the compiler refuses a name not on a list; a list matching the README's then means the README has every name the
// engine can raise. A name that stops being raised stays in the README, marked "no longer raised".

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { expect, it } from "vitest";

import { IMPORT_NOTE_CODES, OCF_TERMS, OCX_TERMS, REASON_CODES, UNSUPPORTED_TERMS } from "../src/stable-names.ts";
import { ALL_CASES, CASES_DIR } from "./support/cases.ts";

const readme = readFileSync(resolve(import.meta.dirname, "../README.md"), "utf8");
const start = readme.indexOf("\n## Stable from 1.0\n");
const stable = readme.slice(start, readme.indexOf("\n## ", start + 1));

/** The names listed under one heading of the README's stable section, and those marked as no longer raised. */
function listed(heading: string): { raised: string[]; retired: string[] } {
  const from = stable.indexOf(`\n### ${heading}\n`);
  expect(from, `the README has a "${heading}" list`).toBeGreaterThan(0);
  const to = stable.indexOf("\n### ", from + 1);
  const entries = [...stable.slice(from, to < 0 ? undefined : to).matchAll(/^- `([a-z0-9_]+)`(.*)$/gm)];
  const retired = entries.filter((m) => m[2]!.includes("no longer raised")).map((m) => m[1]!);
  return { raised: entries.map((m) => m[1]!).filter((n) => !retired.includes(n)), retired };
}

const LISTS: [string, readonly string[]][] = [
  ["`UnsupportedTermError`'s terms", UNSUPPORTED_TERMS],
  ["`ImportRefusal`'s terms for OCF", OCF_TERMS],
  ["`ImportRefusal`'s terms for OCX", OCX_TERMS],
  ["An import's report-note codes", IMPORT_NOTE_CODES],
  ["`ReasonCode`", REASON_CODES],
];

it.each(LISTS)("the README's %s are exactly the names the engine can raise", (heading, names) => {
  const { raised, retired } = listed(heading);
  expect(new Set(raised).size, "each name listed once").toBe(raised.length);
  expect([...raised].sort()).toEqual([...names].sort());
  expect(retired.filter((n) => names.includes(n)), "a name marked no longer raised that still is").toEqual([]);
});

it("raises a refusal only through the helpers that take a listed term", () => {
  const src = resolve(import.meta.dirname, "../src");
  const where = (pattern: RegExp) => readdirSync(src).filter((f) => f.endsWith(".ts") && pattern.test(readFileSync(join(src, f), "utf8"))).sort();
  // errors.ts's unsupportedTerm takes an UnsupportedTerm; ocf-read.ts's and ocx-cells.ts's helpers take an OcfTerm or OcxTerm.
  expect(where(/new UnsupportedTermError\(/)).toEqual(["errors.ts"]);
  expect(where(/new ImportRefusal\(/)).toEqual(["ocf-read.ts", "ocx-cells.ts"]);
});

it("lists every refusal term and report-note code a case records", () => {
  const terms = new Set<string>();
  const codes = new Set<string>();
  const walk = (v: unknown, key?: string): void => {
    if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (key === "refused" && typeof o.term === "string") terms.add(o.term);
      if (key === "notes" && typeof o.code === "string") codes.add(o.code);
      for (const [k, x] of Object.entries(o)) walk(x, k);
    }
  };
  for (const name of ALL_CASES) {
    const file = join(CASES_DIR, name, "expected.json");
    if (existsSync(file)) walk(JSON.parse(readFileSync(file, "utf8")));
  }
  const allTerms = new Set<string>([...UNSUPPORTED_TERMS, ...OCF_TERMS, ...OCX_TERMS]);
  expect(terms.size).toBeGreaterThan(50);
  expect([...terms].filter((t) => !allTerms.has(t)).sort()).toEqual([]);
  expect([...codes].filter((c) => !(IMPORT_NOTE_CODES as readonly string[]).includes(c)).sort()).toEqual([]);
});
