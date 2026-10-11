// What an OCX import read, as counts and codes only, so a founder can share it without sharing the cap table (O15):
// never a name, an amount or a date. The page shows it before copying it, and the check script prints it (06g). Then
// the workbook's structure, as the cell-kinds script prints it (OX2): counts, kinds and the format's own names.

import { FORMAT_NAMES, structureLines } from "./ocxStructure.ts";
import type { OcxImported } from "./ocxImport.ts";
import { shownAs } from "./ocfSummary.ts";

/** How Use went, when it stopped: the engine's code, and each answer's kind, never its value. */
export interface AtUse {
  refusal: string;
  answers: string[];
}

const VERSION = /^[0-9A-Za-z.+-]{1,32}$/;

/** "stakeholders 9, share_classes 3": counts by code, codes in order. */
function counts(tally: Map<string, number> | Record<string, number>): string {
  const entries = tally instanceof Map ? [...tally] : Object.entries(tally);
  if (entries.length === 0) return "none";
  return entries
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([code, n]) => `${code} ${n}`)
    .join(", ");
}
function tally(codes: Iterable<string>): Map<string, number> {
  const t = new Map<string, number>();
  for (const c of codes) t.set(c, (t.get(c) ?? 0) + 1);
  return t;
}

/** The lines Use adds when it stops: the engine's code and each answer's kind (05a review). */
export function atUseLines(atUse: AtUse | undefined): string[] {
  return atUse ? [`Use: stopped, ${shownAs(atUse.refusal)}`, `Answers: ${atUse.answers.length ? atUse.answers.join(", ") : "none"}`] : [];
}

/** The summary: counts and codes only (O15), then the workbook's structure (OX2). */
export function ocxShareLines(imported: OcxImported, engineVersion: string, atUse?: AtUse): string[] {
  const version = shownAs(engineVersion, VERSION);
  const lines = [`spillpoint ${version}: an OCX import, in counts and codes`];
  if (!imported.ok) {
    const f = imported.failure;
    lines.push(f.stage === "xlsx" ? `Import: not read, xlsx ${shownAs(f.code)}` : `Import: refused, ${f.refusal.kind} ${shownAs(f.refusal.term)}`);
  } else {
    const { report, to_fill } = imported.result;
    lines.push("Import: read");
    lines.push(`Read: ${counts(report.read)}`);
    lines.push(`Set aside: ${counts(report.not_needed)}`);
    lines.push(`Notes: ${counts(tally(report.notes.map((n) => shownAs(n.code))))}`);
    // A header is printed only when it's one of the format's own names: any other could be the company's (OX2).
    const fields = report.notes.filter((n) => n.code === "unrecognized_field").map((n) => (n.field && FORMAT_NAMES.has(n.field) ? n.field : "other"));
    lines.push(`Unrecognized fields: ${counts(tally(fields))}`);
    lines.push(`Blanks: ${counts(tally(to_fill.map((b) => shownAs(b.field))))}`);
  }
  lines.push(...atUseLines(atUse));
  if (imported.workbook) lines.push(...structureLines(imported.workbook, version).slice(1));
  return lines;
}
