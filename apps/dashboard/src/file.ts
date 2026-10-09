// Saving and opening a cap table as a local JSON file (M3 plan, answers 4
// and 5): the only way anything is kept. The file is
//
//   {"format": "spillpoint", "version": 3, "name": ..., "cap_table": ..., "range": [...],
//    "exit_date": ..., "view": {"exit_value": ..., "you": ...}}
//
// or, for a cap table built from the company's rounds (version 2, M4i), the
// holders and events in place of the cap table, with the event whose cap
// table the exit runs on:
//
//   {..., "holders": [...], "events": [...], "cap_table_after_event": "series_b", "range": [...], ...}
//
// The sale's date (version 3, M5k) is there only when it's given: notes
// still outstanding accrue interest up to it (X3, C9). Version 4 (M5l) adds
// the sale's payment schedules (C7), and lets a cap table built from rounds
// have a carve-out, a term of the sale (M5 plan, item 13). Version 5 (0.3.0)
// keeps every carve-out with the sale's other terms, whichever kind of cap
// table, as the engine's exit input does (C6); a version 4 file with one in
// its cap table opens with it moved there. Version 6 (0.5.0) lets a company's
// first event be the cap table it starts from (R31, C17), so a page that
// can't build one says the file is newer instead. The sale's terms come after
// the range:
//
//   {..., "range": [...], "exit_date": ..., "carve_out": {...}, "payment_schedules": [...], "view": {...}}
//
// Both are the engine's own input format (C1–C4, C14), so a saved file is
// also valid engine input. A field nobody edited keeps the exact value it was
// loaded with, never the six-place display (M3d review), and events are kept
// exactly as loaded. The view, where you were looking, is optional (M3d
// review): a file without one opens halfway up its range, on its largest
// common holder. The version field (C13) lets files saved by older versions
// keep opening: each older version is migrated forward; a newer one is
// refused.

import { InputError, UnsupportedTermError, parseExact, readExit } from "spillpoint";
import type { ExitInput } from "spillpoint";

import { NotShownYet, buildExit, checkShown, draftFromExit } from "./draft.ts";
import type { Draft } from "./draft.ts";
import { shortDollars, withoutCodes } from "./format.ts";
import { fromRounds } from "./rounds.ts";
import type { Rounds } from "./rounds.ts";

export const FORMAT = "spillpoint";
export const VERSION = 6;

const FIELDS = [
  "format", "version", "name", "cap_table", "holders", "events", "cap_table_after_event", "carve_out", "range", "exit_date", "payment_schedules", "view",
];
const VIEW_FIELDS = ["exit_value", "you"];

/** Where you were looking: the exit value, exact, and the holder you are, by id. */
export interface View {
  exitValue: string;
  you: string;
}

/**
 * The file a cap table saves as, ready to download. Only a table the engine
 * accepts is saved, so the file always opens. A cap table built from rounds
 * saves its rounds, not the table they build.
 */
export function fileText(name: string, draft: Draft, view?: View, rounds?: Rounds | null): string {
  const { json } = buildExit(draft);
  const file = {
    format: FORMAT,
    version: VERSION,
    name: name.trim() || "Untitled cap table",
    ...(rounds ? { holders: rounds.holders, events: rounds.events, cap_table_after_event: rounds.after } : { cap_table: json.cap_table }),
    range: json.range,
    ...(json.exit_date ? { exit_date: json.exit_date } : {}),
    ...(json.carve_out ? { carve_out: json.carve_out } : {}),
    ...(json.payment_schedules ? { payment_schedules: json.payment_schedules } : {}),
    ...(view ? { view: { exit_value: view.exitValue, you: view.you } } : {}),
  };
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

export type Opened = { ok: true; name: string; draft: Draft; view: View | null; rounds: Rounds | null } | { ok: false; message: string };

/**
 * How each older version becomes the next one, keyed by the version it
 * upgrades. Version 2 adds rounds, as an alternative to the cap table, so a
 * version 1 file is already a version 2 file without them. Version 3 adds the
 * sale's date, which older files had no need for: they had no notes. Version
 * 4 adds payment schedules, and a carve-out beside the rounds; older files had
 * neither. Version 5 keeps a carve-out with the sale's terms: one in a cap
 * table moves there (C6; Jordan's answer 1 to the 0.3.0 plan). Version 6 adds
 * a starting cap table as a company's first event, which older files didn't
 * have (0.5.0 plan, 05b3).
 */
const MIGRATIONS: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> = {
  1: (file) => ({ ...file, version: 2 }),
  2: (file) => ({ ...file, version: 3 }),
  3: (file) => ({ ...file, version: 4 }),
  4: (file) => {
    const ct = file.cap_table as Record<string, unknown> | null | undefined;
    // A version 4 file has a carve-out in its cap table or beside its rounds, never both; one with both is left for the engine to refuse.
    if (ct == null || typeof ct !== "object" || ct.carve_out == null || file.carve_out != null) return { ...file, version: 5 };
    const { carve_out, ...rest } = ct;
    return { ...file, version: 5, cap_table: rest, carve_out };
  },
  5: (file) => ({ ...file, version: 6 }),
};

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
  const opened = file.holders != null || file.events != null || file.cap_table_after_event != null ? openRounds(file) : openCapTable(file);
  if ("message" in opened) return { ok: false, message: opened.message };
  const view = file.view == null ? null : readView(file.view, opened.read);
  if (typeof view === "string") return { ok: false, message: view };
  return { ok: true, name, draft: opened.draft, view, rounds: opened.rounds };
}

type Contents = { read: ExitInput; draft: Draft; rounds: Rounds | null } | { message: string };

/** A cap table entered directly. */
function openCapTable(file: Record<string, unknown>): Contents {
  // C6: the carve-out is a term of the sale, on the exit beside its date and payment schedules.
  const exit = {
    cap_table: file.cap_table,
    range: file.range,
    exit_values: [],
    ...(file.exit_date != null ? { exit_date: file.exit_date } : {}),
    ...(file.carve_out != null ? { carve_out: file.carve_out } : {}),
    ...(file.payment_schedules != null ? { payment_schedules: file.payment_schedules } : {}),
  };
  let read: ExitInput;
  try {
    read = readExit(exit, undefined, "file");
  } catch (e) {
    // A term the engine doesn't model yet: its message says when.
    if (e instanceof UnsupportedTermError) return { message: `Its cap table can't be used. ${withoutCodes(e.message)}` };
    if (e instanceof InputError) {
      // Anything the page can't show comes before the engine's other complaints, such as a missing exit date for dividends.
      try {
        checkShown(file.cap_table);
      } catch (shown) {
        if (!(shown instanceof NotShownYet)) throw shown;
        if (shown.known) return { message: shown.message };
      }
      return { message: `Its cap table can't be used. ${withoutCodes(e.message)}` };
    }
    throw e;
  }
  try {
    return { read, draft: draftFromExit(exit), rounds: null };
  } catch (e) {
    if (e instanceof NotShownYet) return { message: e.message };
    throw e;
  }
}

/** A cap table built from the company's rounds: built again by the engine, as the page shows it. */
function openRounds(file: Record<string, unknown>): Contents {
  if (file.cap_table != null) return { message: "It has both a cap table and the events that build one; a file has one or the other." };
  const { holders, events, cap_table_after_event: after } = file;
  if (!Array.isArray(holders) || !Array.isArray(events) || typeof after !== "string") {
    return { message: "Its rounds need the holders, the events, and the event whose cap table the payouts use." };
  }
  const rounds: Rounds = { holders: holders as Rounds["holders"], events: events as Rounds["events"], after };
  if (file.exit_date != null && typeof file.exit_date !== "string") return { message: "Its sale date isn't readable: it should be a date, like 2026-06-30." };
  const built = fromRounds(rounds, file.range, { exit_date: file.exit_date, carve_out: file.carve_out, payment_schedules: file.payment_schedules });
  if (!built.ok) return { message: built.error instanceof NotShownYet ? built.message : `Its rounds can't be built. ${built.message}` };
  try {
    return { read: readExit(buildExit(built.draft).json, undefined, "file"), draft: built.draft, rounds };
  } catch (e) {
    // The rounds are fine; what's left is the range or one of the sale's terms.
    if (e instanceof InputError || e instanceof UnsupportedTermError) {
      const what = /exit_date/.test(e.path) ? "sale date" : /carve_out/.test(e.path) ? "carve-out" : /payment_schedules/.test(e.path) ? "payment schedule" : "range";
      return { message: `Its ${what} can't be used. ${withoutCodes(e.message)}` };
    }
    throw e;
  }
}

/** The saved view, checked against the cap table it was saved with; or why it can't be used. */
function readView(value: unknown, exit: ExitInput): View | string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "Its view, where you were looking, isn't readable.";
  const v = value as Record<string, unknown>;
  const unknown = Object.keys(v).filter((k) => !VIEW_FIELDS.includes(k));
  if (unknown.length > 0) return `Its view has ${unknown.length === 1 ? "a field" : "fields"} spillpoint doesn't read: ${unknown.join(", ")}.`;
  if (typeof v.exit_value !== "string" || typeof v.you !== "string") return "Its view needs both an exit value and the holder you are.";
  if (!exit.capTable.holders.some((h) => h.id === v.you)) return `Its view says you are ${v.you}, who isn't in its cap table.`;
  let x;
  try {
    x = parseExact(v.exit_value, "view.exit_value");
  } catch {
    return `Its view's exit value, "${v.exit_value}", isn't an exact number.`;
  }
  const [lo, hi] = exit.range;
  if (x.lt(lo) || x.gt(hi)) return `Its view's exit value, ${shortDollars(x)}, is outside its range, ${shortDollars(lo)} to ${shortDollars(hi)}.`;
  return { exitValue: x.toString(), you: v.you };
}
