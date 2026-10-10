// Workbooks the tests write, our own (hard rule 10): a zip of the parts an .xlsx has, so each reading rule (OX1) is
// tested on exactly the XML that exercises it. No workbook from the Open Cap Table Coalition or anyone else is in the
// repo; the page test on a workbook saved by a spreadsheet app comes later in 0.6.0.

import { deflateRawSync } from "node:zlib";

import { crc32 } from "../src/zip.ts";

const enc = new TextEncoder();

/** A zip of the parts, each stored or deflated as asked. `claimedLength` overrides a part's size in the directory. */
export function zipOf(parts: Record<string, string | Uint8Array>, options: { deflate?: boolean; claimedLength?: Record<string, number> } = {}): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(parts)) {
    const data = typeof content === "string" ? enc.encode(content) : content;
    const packed = options.deflate ? new Uint8Array(deflateRawSync(data)) : data;
    const method = options.deflate ? 8 : 0;
    const nameBytes = enc.encode(name);
    const length = options.claimedLength?.[name] ?? data.length;
    const local = new Uint8Array(30 + nameBytes.length + packed.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, method, true);
    lv.setUint32(14, crc32(data), true);
    lv.setUint32(18, packed.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(packed, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, method, true);
    cv.setUint32(16, crc32(data), true);
    cv.setUint32(20, packed.length, true);
    cv.setUint32(24, length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const directory = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, directory, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + directory + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** One cell as a test writes it: text goes into the shared strings, as Excel writes it. */
export interface Cell {
  at: string;
  text?: string;
  number?: string;
  /** A cell style, by its place in the styles part's cellXfs. */
  style?: number;
  formula?: string;
  /** A formula with no value saved. */
  noValue?: boolean;
}

export interface WorkbookSpec {
  sheets: { name: string; cells?: Cell[]; sheetData?: string }[];
  /** Number formats by style: style i uses formats[i]. Style 0 is General. */
  formats?: (number | string)[];
  date1904?: string;
  /** A namespace prefix on every element, as some writers use. */
  prefix?: string;
  /** Raw shared-string items, added after the ones the cells use. */
  sharedItems?: string[];
  deflate?: boolean;
}

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The parts of a workbook, before zipping, so a test can change one. */
export function workbookParts(spec: WorkbookSpec): Record<string, string> {
  const p = spec.prefix ? `${spec.prefix}:` : "";
  const ns = spec.prefix ? `xmlns:${spec.prefix}="${MAIN}"` : `xmlns="${MAIN}"`;
  const shared: string[] = [];
  const sharedIndex = (text: string) => {
    const at = shared.indexOf(text);
    if (at >= 0) return at;
    shared.push(text);
    return shared.length - 1;
  };
  const sheetXml = (cells: Cell[]) => {
    const rows = new Map<number, string[]>();
    for (const c of cells) {
      const row = Number(/\d+$/.exec(c.at)![0]);
      const s = c.style ? ` s="${c.style}"` : "";
      const f = c.formula != null ? `<${p}f>${escape(c.formula)}</${p}f>` : "";
      let xml: string;
      if (c.text != null && c.formula != null) xml = `<${p}c r="${c.at}" t="str"${s}>${f}${c.noValue ? "" : `<${p}v>${escape(c.text)}</${p}v>`}</${p}c>`;
      else if (c.text != null) xml = `<${p}c r="${c.at}" t="s"${s}><${p}v>${sharedIndex(c.text)}</${p}v></${p}c>`;
      else xml = `<${p}c r="${c.at}"${s}>${f}${c.noValue ? "" : `<${p}v>${c.number ?? ""}</${p}v>`}</${p}c>`;
      rows.set(row, [...(rows.get(row) ?? []), xml]);
    }
    return [...rows.entries()].sort(([a], [b]) => a - b).map(([r, cs]) => `<${p}row r="${r}">${cs.join("")}</${p}row>`).join("");
  };
  const sheets = spec.sheets.map((sheet, i) => ({
    path: `xl/worksheets/sheet${i + 1}.xml`,
    xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<${p}worksheet ${ns}><${p}sheetData>${sheet.sheetData ?? sheetXml(sheet.cells ?? [])}</${p}sheetData></${p}worksheet>`,
  }));
  const formats = spec.formats ?? [0];
  const custom = formats.map((f, i) => (typeof f === "string" ? { id: 164 + i, code: f } : null)).filter((f) => f != null);
  const styles = `<${p}styleSheet ${ns}>${custom.length > 0 ? `<${p}numFmts count="${custom.length}">${custom.map((f) => `<${p}numFmt numFmtId="${f.id}" formatCode="${escape(f.code)}"/>`).join("")}</${p}numFmts>` : ""}<${p}cellXfs count="${formats.length}">${formats.map((f, i) => `<${p}xf numFmtId="${typeof f === "string" ? 164 + i : f}"/>`).join("")}</${p}cellXfs></${p}styleSheet>`;
  const sst = () => `<${p}sst ${ns} count="${shared.length}">${shared.map((t) => `<${p}si><${p}t xml:space="preserve">${escape(t)}</${p}t></${p}si>`).join("")}${(spec.sharedItems ?? []).join("")}</${p}sst>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<${p}workbook ${ns} xmlns:r="${REL}">${spec.date1904 != null ? `<${p}workbookPr date1904="${spec.date1904}"/>` : ""}<${p}sheets>${spec.sheets.map((s, i) => `<${p}sheet name="${escape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</${p}sheets></${p}workbook>`;
  const rels = `<Relationships xmlns="${PKG}">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rIdS" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rIdT" Type="${REL}/styles" Target="styles.xml"/></Relationships>`;
  const parts: Record<string, string> = {
    "[Content_Types].xml": `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
    "_rels/.rels": `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": workbook,
    "xl/_rels/workbook.xml.rels": rels,
    "xl/styles.xml": styles,
  };
  for (const s of sheets) parts[s.path] = s.xml;
  parts["xl/sharedStrings.xml"] = sst();
  return parts;
}

export function workbook(spec: WorkbookSpec): Uint8Array {
  return zipOf(workbookParts(spec), { deflate: spec.deflate === true });
}
