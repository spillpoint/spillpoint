// Saving and opening a cap table as a local JSON file (M3 plan, answers 4
// and 5): the only way anything is kept. The file is
//
//   {"format": "spillpoint", "version": 1, "name": ..., "cap_table": ..., "range": [...]}
//
// The cap table and range are the engine's own input format (C1–C4), so a
// saved file is also valid engine input. A field nobody edited keeps the
// exact value it was loaded with, never the six-place display (M3d review).
// The version field (C13) lets files saved by older versions keep opening:
// each older version is migrated forward; a newer one is refused.

import { InputError, UnsupportedTermError, readExit } from "spillpoint";

import { buildExit, draftFromExit } from "./draft.ts";
import type { Draft } from "./draft.ts";
import { withoutCodes } from "./format.ts";

export const FORMAT = "spillpoint";
export const VERSION = 1;

const FIELDS = ["format", "version", "name", "cap_table", "range"];

/** The file a cap table saves as, ready to download. Only a table the engine accepts is saved, so the file always opens. */
export function fileText(name: string, draft: Draft): string {
  const { json } = buildExit(draft);
  const file = { format: FORMAT, version: VERSION, name: name.trim() || "Untitled cap table", cap_table: json.cap_table, range: json.range };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** "Millrace Robotics (fictional)" → "millrace-robotics-fictional.json". */
export function fileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "cap-table"}.json`;
}

export type Opened = { ok: true; name: string; draft: Draft } | { ok: false; message: string };

/**
 * How each older version becomes the next one, keyed by the version it
 * upgrades. Version 1 is the first, so there is nothing to migrate yet.
 */
const MIGRATIONS: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> = {};

/** Reads a saved file back into the editor, or says plainly why it can't. */
export function readFile(text: string): Opened {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "It isn't a spillpoint file: it isn't valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) || (parsed as Record<string, unknown>).format !== FORMAT) {
    return { ok: false, message: 'It isn\'t a spillpoint file: spillpoint files start with "format": "spillpoint".' };
  }
  let file = parsed as Record<string, unknown>;
  const version = file.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, message: "Its version number is missing or unreadable, so it's not clear how to read it." };
  }
  if (version > VERSION) {
    return {
      ok: false,
      message: `It was saved by a newer version of spillpoint (file version ${version}); this page reads files up to version ${VERSION}. Open it with the newer version.`,
    };
  }
  for (let v = version; v < VERSION; v++) file = MIGRATIONS[v]!(file);

  const unknown = Object.keys(file).filter((k) => !FIELDS.includes(k));
  if (unknown.length > 0) {
    // C12: an unknown field is refused, so a misspelt one can't be ignored.
    return { ok: false, message: `It has ${unknown.length === 1 ? "a field" : "fields"} spillpoint doesn't read: ${unknown.join(", ")}.` };
  }
  const name = typeof file.name === "string" && file.name.trim() ? file.name.trim() : "Untitled cap table";
  const exit = { cap_table: file.cap_table, range: file.range, exit_values: [] };
  try {
    readExit(exit, undefined, "file");
  } catch (e) {
    if (e instanceof InputError || e instanceof UnsupportedTermError) {
      return { ok: false, message: `Its cap table can't be used. ${withoutCodes(e.message)}` };
    }
    throw e;
  }
  return { ok: true, name, draft: draftFromExit(exit) };
}
