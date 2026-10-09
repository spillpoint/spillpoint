// The check scripts/ocf-check.mjs runs on an export (O15): the summary, then each set of answers to the blanks the
// import leaves, filled in and run through the engine over the page's default range. For each set it prints only
// whether the engine reads it and pays, or how it stops: never a name, an id, an amount or a date. Not part of the
// page, though it reads the export exactly as the page does.

import { InputError, NoAnswerError, UnsupportedTermError, findBreakpoints, prepare, readExit, solve } from "spillpoint";
import type { OcfFile, OcfImport } from "spillpoint";

import { Package, defaultTop, filled, importOcf, questions } from "./ocfImport.ts";
import type { Picked } from "./ocfImport.ts";
import { summaryLines } from "./ocfSummary.ts";

type Json = Record<string, unknown>;

/** Every set of answers up to this many is tried; past it, one blank at a time. */
export const MOST_SETS = 64;

/**
 * The sets of answers to try: every combination when there are at most MOST_SETS, or else the first answer to every
 * blank, then each other answer one blank at a time.
 */
export function answerSets(options: readonly (readonly string[])[]): { sets: string[][]; possible: number } {
  const possible = options.reduce((n, o) => n * o.length, 1);
  if (possible <= MOST_SETS) {
    let sets: string[][] = [[]];
    for (const o of options) sets = sets.flatMap((set) => o.map((answer) => [...set, answer]));
    return { sets, possible };
  }
  const first = options.map((o) => o[0]!);
  const sets = [first];
  options.forEach((o, i) => o.slice(1).forEach((answer) => sets.push(first.map((a, j) => (j === i ? answer : a)))));
  return { sets, possible };
}

/**
 * A number's placeholder (O15): whether the engine reads a table doesn't turn on its value. A conversion price is the
 * series' issue price, given or filled; anything else is a set value. The value is used, but never printed: a set line
 * says only which placeholder it was, since the issue price is an amount from the export.
 */
function placeholder(field: string, security: Json | undefined): { value: string; printed: string } {
  switch (field) {
    case "original_issue_price":
      return { value: "1.00", printed: PLACEHOLDER };
    case "conversion_price":
      return { value: typeof security?.original_issue_price === "string" ? security.original_issue_price : "1.00", printed: ISSUE_PRICE };
    default:
      return { value: "1", printed: PLACEHOLDER };
  }
}

/** How a set line names a placeholder answer: as a word, never its value. */
export const PLACEHOLDER = "placeholder";
export const ISSUE_PRICE = "issue price";

/** An InputError's path, which names fields and positions; if any part of it is something else, such as an id, it's left out. */
function pathOf(path: string): string | null {
  return path.split(".").every((part) => /^[a-z_]+(\[\d+\])*$/.test(part)) ? path : null;
}

/** Fills the blanks with one set of answers and runs the engine over the default range: it reads, pays at every breakpoint, or stops. */
function run(result: OcfImport, answers: Record<string, string>): string {
  const notes = ((result.cap_table as { unconverted_notes?: unknown[] }).unconverted_notes ?? []).length > 0;
  try {
    const capTable = filled(result, answers);
    // The sale's date, which notes accrue interest up to, as the package's own (O15).
    const exit = readExit({ cap_table: capTable, range: ["0", defaultTop(capTable)], exit_values: [], ...(notes ? { exit_date: result.as_of } : {}) }, undefined, "exit");
    const pc = prepare(exit.capTable, exit.exitDate);
    for (const b of findBreakpoints(pc, exit.range)) solve(pc, b.exitValue);
    solve(pc, exit.range[1]);
    return "reads";
  } catch (e) {
    if (e instanceof UnsupportedTermError) return e.term;
    if (e instanceof NoAnswerError) return "NoAnswerError";
    if (e instanceof InputError) {
      const path = pathOf(e.path);
      return path ? `InputError at ${path}` : "InputError";
    }
    // Something unexpected: its kind only, since its message could carry what's in the files.
    return `unexpected ${(e as Error).name}`;
  }
}

/** The lines of the engine's runs over the blanks' answers. */
function answerRuns(result: OcfImport, files: OcfFile[]): string[] {
  const asked = questions(result, new Package(files));
  if (asked.length === 0) return [`The engine, with nothing to fill in: ${run(result, {})}`];
  const securities = (result.cap_table as { securities: Json[] }).securities;
  // Each answer as used, and as printed: a choice is its own code; a placeholder, a word.
  const options = asked.map((q) =>
    q.choices ? q.choices.map((c) => ({ value: c.value, printed: c.value })) : [placeholder(q.blank.field, securities.find((s) => s.id === q.blank.security))],
  );
  const { sets: picks, possible } = answerSets(options.map((o) => o.map((_, i) => String(i))));
  const sets = picks.map((set) => set.map((i, j) => options[j]![Number(i)]!));
  return [
    `Answer sets: ${sets.length} tried, of ${possible} possible${possible > MOST_SETS ? ", one blank at a time" : ""}`,
    ...sets.map((set, i) => {
      const answers = Object.fromEntries(asked.map((q, j) => [q.key, set[j]!.value]));
      const given = asked.map((q, j) => `#${j + 1} ${q.blank.field}=${set[j]!.printed}`).join(", ");
      return `set ${i + 1}: ${given}: ${run(result, answers)}`;
    }),
  ];
}

/** What the check script prints for an export: the summary, then the engine's runs over the blanks' answers. */
export async function checkExport(picked: readonly Picked[], engineVersion: string): Promise<string[]> {
  const imported = await importOcf(picked);
  const lines = summaryLines(imported, engineVersion);
  return imported.ok ? [...lines, ...answerRuns(imported.result, imported.files)] : lines;
}
