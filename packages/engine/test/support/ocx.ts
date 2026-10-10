// Reads the OCX case files for engine tests (C18): a case's workbook, or a fixture's, which is a base case's
// workbook with a small change made to it. The engine itself does no I/O; tests read the JSON and hand it over.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Its own path to the cases, not support/cases.ts's, so the case-file checks load no engine code.
const CASES_DIR = resolve(import.meta.dirname, "../../../../cases");

export interface OcxCellJson {
  address: string;
  kind: string;
  text: string;
  formula: boolean;
}
export interface OcxWorkbookJson {
  dateSystem: number;
  sheets: { name: string; cells: OcxCellJson[] }[];
}

/** A fixture's change, each step in turn (C18). */
export type OcxChange =
  | { op: "set"; tab: string; cell: OcxCellJson }
  | { op: "clear"; tab: string; address: string }
  | { op: "rename_tab"; tab: string; to: string }
  | { op: "remove_tab"; tab: string }
  | { op: "add_tab"; after: string; sheet: { name: string; cells: OcxCellJson[] } };

export interface OcxFixture {
  base: string;
  about: string;
  change: OcxChange[];
}

/** A cell's place in its tab, row first, so cells sort as Excel writes them. */
export function cellPlace(address: string): number {
  const m = /^([A-Z]{1,3})([1-9]\d*)$/.exec(address);
  if (!m) throw new Error(`not a cell address: ${address}`);
  return Number(m[2]) * 100000 + [...m[1]!].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

export function readOcxWorkbook(caseName: string): OcxWorkbookJson {
  return JSON.parse(readFileSync(join(CASES_DIR, caseName, "workbook.json"), "utf8")) as OcxWorkbookJson;
}

export function readOcxFixture(caseName: string, fixture: string): OcxFixture {
  return JSON.parse(readFileSync(join(CASES_DIR, caseName, "fixtures", fixture), "utf8")) as OcxFixture;
}

/**
 * The fixture's workbook: its base's, with each step made in turn. A step that names a tab or cell that isn't there,
 * adds a tab whose name is taken, or changes nothing, throws, so a fixture can't drift from its base unnoticed.
 */
export function applyOcxChange(base: OcxWorkbookJson, change: OcxChange[]): OcxWorkbookJson {
  const workbook: OcxWorkbookJson = structuredClone(base);
  const tab = (name: string) => {
    const sheet = workbook.sheets.find((s) => s.name === name);
    if (!sheet) throw new Error(`no tab "${name}"`);
    return sheet;
  };
  for (const step of change) {
    switch (step.op) {
      case "set": {
        const sheet = tab(step.tab);
        const at = sheet.cells.findIndex((c) => c.address === step.cell.address);
        if (at >= 0 && JSON.stringify(sheet.cells[at]) === JSON.stringify(step.cell)) throw new Error(`${step.tab}!${step.cell.address} is already that`);
        if (at >= 0) sheet.cells[at] = step.cell;
        else sheet.cells.push(step.cell);
        sheet.cells.sort((a, b) => cellPlace(a.address) - cellPlace(b.address));
        break;
      }
      case "clear": {
        const sheet = tab(step.tab);
        const at = sheet.cells.findIndex((c) => c.address === step.address);
        if (at < 0) throw new Error(`${step.tab}!${step.address} is already empty`);
        sheet.cells.splice(at, 1);
        break;
      }
      case "rename_tab":
        if (workbook.sheets.some((s) => s.name === step.to)) throw new Error(`a tab is already named "${step.to}"`);
        tab(step.tab).name = step.to;
        break;
      case "remove_tab":
        workbook.sheets.splice(workbook.sheets.indexOf(tab(step.tab)), 1);
        break;
      case "add_tab":
        if (workbook.sheets.some((s) => s.name === step.sheet.name)) throw new Error(`a tab is already named "${step.sheet.name}"`);
        workbook.sheets.splice(workbook.sheets.indexOf(tab(step.after)) + 1, 0, structuredClone(step.sheet));
        break;
      default:
        throw new Error(`unknown step ${JSON.stringify(step)}`);
    }
  }
  return workbook;
}
