// Reading an .xlsx into the engine's OcxWorkbook (0.6.0, 06c; ASSUMPTIONS OX1), with no dependency, in a module the
// page and Node both run: the cell-kinds script (scripts/ocx-structure.mjs) reads a workbook exactly as the page will.
//
// OCX is developed by the Open Cap Table Coalition: https://github.com/Open-Cap-Table-Coalition/ocx. spillpoint reads
// files in that format.
//
// An .xlsx is a zip, opened with the page's own zip reader and its 100 MB limit (O13), of XML parts, read with xml.ts.
// Each worksheet's cells come out as Excel stored them: a number is the text Excel wrote ("0.20000000000000001", not
// 0.2), never a JavaScript number, and a formula's value is the one Excel saved with it, never worked out here. The
// only reading this does is of kinds: a shared string is looked up, and a number formatted as a date is marked a
// date, with the workbook's date system beside it. What the values mean is readOcx's to say.

import type { OcxCell, OcxSheet, OcxWorkbook } from "spillpoint";

import { child, childrenNamed, parseXml, XmlError, xmlText } from "./xml.ts";
import type { XmlElement } from "./xml.ts";
import { readZip, ZipError } from "./zip.ts";

export class XlsxError extends Error {
  override name = "XlsxError";
  /** What's wrong, as a code a summary can share: the message can name a tab, which can name the company (O15). */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** The first bytes of an older binary Excel file, and of a password-protected .xlsx, which is wrapped the same way. */
const COMPOUND_FILE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/**
 * Excel's built-in number formats that show a date or a time (ECMA-376 Part 1, 18.8.30, and the East Asian ones
 * Excel adds): a cell in one holds a day count, not a quantity.
 */
const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

/**
 * Whether a custom number format shows a date or a time: a day, month, year, hour or second code left once its
 * quoted text, escaped characters, padding and bracketed colours or locales are taken out. "[h]", "[m]" and "[s]"
 * are elapsed time, so they count. "yyyy.mm.dd" and "[$-409]mmmm d, yyyy" are dates; "#,##0", "0.00E+00",
 * "[Red]0.00" and '0 "days"' aren't.
 */
export function isDateFormat(code: string): boolean {
  const bare = code
    .replace(/"[^"]*"/g, "")
    .replace(/\\./g, "")
    .replace(/[_*]./g, "")
    .replace(/\[(?:h+|m+|s+)\]/gi, "h")
    .replace(/\[[^\]]*\]/g, "");
  return /[dmyhs]/i.test(bare);
}

/** A number as Excel writes one: digits, an optional point and an optional exponent. */
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const ADDRESS = /^([A-Z]{1,3})([1-9]\d*)$/;

function columnNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function columnLetters(n: number): string {
  let s = "";
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
  return s;
}

/** A shared or inline string: its text runs together, without the phonetic guides some East Asian text carries. */
function stringOf(element: XmlElement): string {
  if (element.name === "rPh") return "";
  if (element.name === "t") return element.text;
  return element.children.map(stringOf).join("");
}

/** A path inside the zip, from a relationship's target, which may be relative to the part's folder or start with "/". */
function resolvePath(from: string, target: string): string {
  const parts = target.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const piece of target.replace(/^\/+/, "").split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== "." && piece !== "") parts.push(piece);
  }
  return parts.join("/");
}

/** A part's relationships, by id: each one's type, the last part of its URI ("worksheet"), and the path it points to. */
function relationships(parts: Map<string, Uint8Array>, part: string): Map<string, { type: string; path: string }> {
  const slash = part.lastIndexOf("/");
  const relsPath = `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`;
  const found = new Map<string, { type: string; path: string }>();
  const bytes = parts.get(relsPath);
  if (!bytes) return found;
  for (const r of childrenNamed(xml(relsPath, bytes), "Relationship")) {
    if (r.attrs.TargetMode === "External" || r.attrs.Id == null || r.attrs.Target == null) continue;
    found.set(r.attrs.Id, { type: (r.attrs.Type ?? "").slice((r.attrs.Type ?? "").lastIndexOf("/") + 1), path: resolvePath(part, r.attrs.Target) });
  }
  return found;
}

function xml(path: string, bytes: Uint8Array): XmlElement {
  try {
    return parseXml(xmlText(bytes));
  } catch (e) {
    if (e instanceof XmlError) throw new XlsxError("bad_xml", `Its part ${path} isn't XML this page can read: ${e.message}.`);
    throw e;
  }
}

/** What the zip reader's refusals mean for a workbook. */
function zipRefusal(e: ZipError): XlsxError {
  switch (e.code) {
    case "not_a_zip":
      return new XlsxError("not_xlsx", "It isn't an .xlsx file: an .xlsx is a zip, and this isn't one.");
    case "too_large":
      return new XlsxError("too_large", "It unzips to more than 100 MB, far more than a cap table workbook would be. Check it's the right file.");
    default:
      return new XlsxError(e.code, `It's damaged, or packed in a way this page doesn't read: ${e.message}`);
  }
}

/** Reads an .xlsx's worksheets (OX1). Throws XlsxError for anything it can't read as one. */
export async function readXlsx(bytes: Uint8Array): Promise<OcxWorkbook> {
  if (COMPOUND_FILE.every((b, i) => bytes[i] === b)) {
    throw new XlsxError("xls_or_password", "It's an older Excel file (.xls), or a workbook protected with a password. Save it as an .xlsx with no password, and open that.");
  }
  let entries;
  try {
    entries = await readZip(bytes);
  } catch (e) {
    if (e instanceof ZipError) throw zipRefusal(e);
    throw e;
  }
  const parts = new Map(entries.map((e) => [e.name.replace(/^\/+/, ""), e.bytes]));

  // The package's own relationships say where the workbook is; xl/workbook.xml is where Excel always puts it.
  const office = [...relationships(parts, "").values()].find((r) => r.type === "officeDocument");
  const workbookPath = office?.path ?? ["xl/workbook.xml", "xl/workbook.bin"].find((p) => parts.has(p));
  if (!workbookPath || !parts.has(workbookPath)) throw new XlsxError("no_workbook", "It's a zip, but not a workbook: it has no workbook part.");
  if (workbookPath.endsWith(".bin")) throw new XlsxError("xlsb", "It's a binary workbook (.xlsb). Save it as an .xlsx, and open that.");
  const workbookBytes = parts.get(workbookPath)!;
  const workbook = xml(workbookPath, workbookBytes);
  const flag = child(workbook, "workbookPr")?.attrs.date1904;
  const dateSystem = flag === "1" || flag === "true" ? 1904 : 1900;
  const rels = relationships(parts, workbookPath);
  const partOf = (type: string) => [...rels.values()].find((r) => r.type === type)?.path;

  const sharedPath = partOf("sharedStrings");
  const sharedBytes = sharedPath ? parts.get(sharedPath) : undefined;
  const shared = sharedBytes ? childrenNamed(xml(sharedPath!, sharedBytes), "si").map(stringOf) : [];

  // Which cell styles show a date: each style names a number format, built in or defined in the styles part.
  const stylesPath = partOf("styles");
  const stylesBytes = stylesPath ? parts.get(stylesPath) : undefined;
  const dateStyles = new Set<number>();
  if (stylesBytes) {
    const styles = xml(stylesPath!, stylesBytes);
    const custom = new Map(childrenNamed(child(styles, "numFmts"), "numFmt").map((f) => [Number(f.attrs.numFmtId), f.attrs.formatCode ?? ""]));
    childrenNamed(child(styles, "cellXfs"), "xf").forEach((xf, i) => {
      const id = Number(xf.attrs.numFmtId ?? 0);
      if (custom.has(id) ? isDateFormat(custom.get(id)!) : BUILT_IN_DATE_FORMATS.has(id)) dateStyles.add(i);
    });
  }

  const sheets: OcxSheet[] = [];
  for (const s of childrenNamed(child(workbook, "sheets"), "sheet")) {
    const rel = s.attrs.id ? rels.get(s.attrs.id) : undefined;
    // Chart sheets and the like hold no cells.
    if (!rel || rel.type !== "worksheet") continue;
    const sheetBytes = parts.get(rel.path);
    if (!sheetBytes) throw new XlsxError("missing_part", `Its tab ${s.attrs.name ?? ""} points to a part the zip doesn't have.`);
    sheets.push({ name: s.attrs.name ?? "", cells: cellsOf(xml(rel.path, sheetBytes), s.attrs.name ?? "", shared, dateStyles) });
  }
  return { dateSystem, sheets };
}

function cellsOf(sheet: XmlElement, tab: string, shared: readonly string[], dateStyles: ReadonlySet<number>): OcxCell[] {
  const cells: OcxCell[] = [];
  let rowNumber = 0;
  for (const row of childrenNamed(child(sheet, "sheetData"), "row")) {
    rowNumber = row.attrs.r != null ? Number(row.attrs.r) : rowNumber + 1;
    if (!Number.isInteger(rowNumber) || rowNumber < 1) throw new XlsxError("bad_cell", `Its tab ${tab} has a row it can't place.`);
    let column = 0;
    for (const c of childrenNamed(row, "c")) {
      // A cell's own reference is optional; without one, it's the next column along.
      let address: string;
      if (c.attrs.r != null) {
        const m = ADDRESS.exec(c.attrs.r);
        if (!m) throw new XlsxError("bad_cell", `Its tab ${tab} has a cell reference it can't read, ${c.attrs.r}.`);
        column = columnNumber(m[1]!);
        address = c.attrs.r;
      } else {
        column += 1;
        address = `${columnLetters(column)}${rowNumber}`;
      }
      const v = child(c, "v");
      const formula = child(c, "f") != null;
      const type = c.attrs.t ?? "n";
      const inline = type === "inlineStr" ? child(c, "is") : undefined;
      // An empty cell, even a styled one, isn't listed.
      if (!v && !formula && !inline) continue;
      const stored = v?.text ?? "";
      let kind: OcxCell["kind"];
      let text = stored;
      switch (type) {
        case "s": {
          const i = Number(stored);
          if (!Number.isInteger(i) || i < 0 || i >= shared.length) throw new XlsxError("shared_string_missing", `Its tab ${tab} has a cell, ${address}, whose text isn't in the workbook.`);
          kind = "text";
          text = shared[i]!;
          break;
        }
        case "str":
          kind = "text";
          break;
        case "inlineStr":
          kind = "text";
          text = inline ? stringOf(inline) : stored;
          break;
        case "b":
          kind = "boolean";
          break;
        case "e":
          kind = "error";
          break;
        case "d":
          kind = "date";
          break;
        case "n":
          kind = dateStyles.has(Number(c.attrs.s ?? 0)) ? "date" : "number";
          if (stored !== "" && !NUMBER.test(stored)) throw new XlsxError("bad_number", `Its tab ${tab} has a number it can't read, at ${address}.`);
          break;
        default:
          throw new XlsxError("bad_cell", `Its tab ${tab} has a cell, ${address}, of a type it doesn't know.`);
      }
      cells.push({ address, kind, text, formula });
    }
  }
  return cells;
}
