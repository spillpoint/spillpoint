// What an OCF import read, as counts and codes only, so a founder can share it without sharing the cap table (O15):
// never a name, an id, an amount or a date. scripts/ocf-check.mjs prints it, and the page will show it before copying
// it (05a2).

import type { OcfFile } from "spillpoint";

import type { Failure, Imported, Read } from "./ocfImport.ts";

type Json = Record<string, unknown>;

/** A name printed only when it looks like a schema key; anything else might be data. */
const SCHEMA_KEY = /^[A-Za-z0-9_]{1,64}$/;
/** An OCF version's own characters: "1.2.0", "1.2.1-alpha+main". */
const VERSION = /^[0-9A-Za-z.+-]{1,32}$/;
const CURRENCY = /^[A-Z]{3}$/;
const OTHER = "other";

export const shownAs = (value: unknown, pattern: RegExp = SCHEMA_KEY): string => (typeof value === "string" && pattern.test(value) ? value : OTHER);

/** "STAKEHOLDER 12, STOCK_CLASS 3": counts by code, codes in order. */
function counts(tally: Map<string, number>): string {
  if (tally.size === 0) return "none";
  return [...tally]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([code, n]) => `${code} ${n}`)
    .join(", ");
}
function tally(codes: Iterable<string>): Map<string, number> {
  const t = new Map<string, number>();
  for (const c of codes) t.set(c, (t.get(c) ?? 0) + 1);
  return t;
}
const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Every object in the package's files, the issuer included. */
function objectsOf(files: readonly OcfFile[]): Json[] {
  return files.flatMap((f) => {
    const c = f.content as Json | null;
    if (c == null || typeof c !== "object") return [];
    if (c.file_type === "OCF_MANIFEST_FILE") return c.issuer != null && typeof c.issuer === "object" ? [{ ...(c.issuer as Json), object_type: "ISSUER" }] : [];
    return Array.isArray(c.items) ? (c.items as Json[]).filter((o) => o != null && typeof o === "object") : [];
  });
}

/** The first currency other than US dollars in an object's amounts. */
function foreignCurrency(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(foreignCurrency).find((c) => c != null);
  if (value == null || typeof value !== "object") return undefined;
  const o = value as Json;
  if (typeof o.currency === "string" && o.currency !== "USD") return o.currency;
  return Object.values(o).map(foreignCurrency).find((c) => c != null);
}

/**
 * The value behind a refusal whose term alone says little (O15), looked up in the files from its subject, which is
 * never printed itself.
 */
function refusedValue(term: string, subject: string, files: readonly OcfFile[]): string | null {
  const object = () => objectsOf(files).find((o) => o.id === subject);
  switch (term) {
    case "unknown_object_type":
      return shownAs(object()?.object_type);
    case "unknown_file_type":
      return shownAs((files.find((f) => f.name === subject)?.content as Json | undefined)?.file_type);
    case "ocf_version":
      return shownAs(subject, VERSION);
    case "currency":
      return shownAs(foreignCurrency(object()), CURRENCY);
    case "compensation_type": {
      const o = object();
      return shownAs(o?.compensation_type ?? o?.plan_security_type);
    }
    default:
      return null;
  }
}

function failureLine(failure: Failure, read: Read | null): string {
  switch (failure.stage) {
    case "picked":
      return `Import: not read, ${failure.code}`;
    case "zip":
      return `Import: not read, zip ${shownAs(failure.code)}`;
    case "json":
      return `Import: not read, ${failure.code}`;
    case "import": {
      const { kind, term, subject } = failure.refusal;
      const value = refusedValue(term, subject, read?.files ?? []);
      return `Import: refused, ${kind} ${shownAs(term)}${value ? ` (${value})` : ""}`;
    }
  }
}

/** The summary: counts and codes only (O15). */
export function summaryLines(imported: Imported, engineVersion: string): string[] {
  const read = imported.ok ? imported : imported.read;
  const lines = [`spillpoint ${shownAs(engineVersion, VERSION)}: an OCF import, in counts and codes`];
  if (read) {
    const versions = read.files.map((f) => f.content as Json).filter((c) => c?.file_type === "OCF_MANIFEST_FILE").map((c) => shownAs(c.ocf_version, VERSION));
    lines.push(`OCF version: ${versions.length === 0 ? "no manifest" : versions.join(", ")}`);
    lines.push(`Files: ${read.jsonCount} JSON, ${grouped(read.jsonBytes)} bytes; ${read.skipped.length} not JSON`);
    lines.push(`Objects: ${counts(tally(objectsOf(read.files).map((o) => shownAs(o.object_type))))}`);
  }
  if (!imported.ok) {
    lines.push(failureLine(imported.failure, imported.read));
    return lines;
  }
  const { report, to_fill } = imported.result;
  lines.push("Import: read");
  lines.push(`Notes: ${counts(tally(report.notes.map((n) => shownAs(n.code))))}`);
  lines.push(`Unrecognized fields: ${counts(tally(report.notes.filter((n) => n.code === "unrecognized_field").map((n) => shownAs(n.field))))}`);
  lines.push(`Blanks: ${counts(tally(to_fill.map((b) => shownAs(b.field))))}`);
  return lines;
}
