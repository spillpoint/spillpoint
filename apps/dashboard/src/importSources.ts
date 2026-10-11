// What the import review shows, whichever format was opened (O13, 06g): an OCF export's or an OCX workbook's report,
// its questions, how its answers fill the cap table in, and the summary to share.

import type { CapTableImport } from "spillpoint";

import { Package, filled, questions, reportLines, typeName } from "./ocfImport.ts";
import type { Imported, Question } from "./ocfImport.ts";
import { summaryLines } from "./ocfSummary.ts";
import { ocxCountName, ocxFilled, ocxQuestions, ocxReportLines, workbookName } from "./ocxImport.ts";
import type { OcxImported } from "./ocxImport.ts";
import { atUseLines, ocxShareLines } from "./ocxSummary.ts";
import type { AtUse } from "./ocxSummary.ts";

type Json = Record<string, unknown>;

export interface ImportSource {
  /** "OCF" or "OCX": what the review calls the format, where it says what the format leaves open. */
  format: "OCF" | "OCX";
  /** What the import is called: the company OCF names, or the workbook's file name. */
  name: string;
  /** What was opened: a file's name, or how many files. */
  from: string;
  result: CapTableImport;
  /** OCF's files that weren't JSON, so weren't read. */
  skipped: string[];
  lines: string[];
  countName: (key: string) => string;
  questions: Question[];
  filled: (answers: Record<string, string>) => Json;
  /** The summary to share (O15), with how Use stopped, when it did. */
  share: (atUse?: AtUse) => string[];
}

export function ocfSource(imported: Extract<Imported, { ok: true }>, engineVersion: string): ImportSource {
  const pkg = new Package(imported.files);
  return {
    format: "OCF",
    name: pkg.issuer,
    from: imported.source,
    result: imported.result,
    skipped: imported.skipped,
    lines: reportLines(imported.result, pkg),
    countName: typeName,
    questions: questions(imported.result, pkg),
    filled: (answers) => filled(imported.result, answers),
    share: (atUse) => [...summaryLines(imported, engineVersion), ...atUseLines(atUse)],
  };
}

export function ocxSource(imported: Extract<OcxImported, { ok: true }>, engineVersion: string): ImportSource {
  const asked = ocxQuestions(imported.result, imported.workbook);
  return {
    format: "OCX",
    name: workbookName(imported.source),
    from: imported.source,
    result: imported.result,
    skipped: [],
    lines: ocxReportLines(imported.result, imported.workbook),
    countName: ocxCountName,
    questions: asked,
    filled: (answers) => ocxFilled(imported.result, asked, answers),
    share: (atUse) => ocxShareLines(imported, engineVersion, atUse),
  };
}
