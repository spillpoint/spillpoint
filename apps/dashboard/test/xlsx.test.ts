// Reading an .xlsx into the engine's OcxWorkbook (0.6.0, 06c; ASSUMPTIONS OX1): every cell as Excel stored it, its
// kind, whether it's a formula, and the workbook's date system. Each rule on a workbook the test writes, so the XML
// that exercises it is in plain sight.

import { describe, expect, it } from "vitest";

import { XlsxError, isDateFormat, readXlsx } from "../src/xlsx.ts";
import { workbook, workbookParts, zipOf } from "./workbooks.ts";

async function refusal(bytes: Uint8Array): Promise<XlsxError> {
  try {
    await readXlsx(bytes);
  } catch (e) {
    if (e instanceof XlsxError) return e;
    throw e;
  }
  throw new Error("expected the workbook to be refused");
}

const cellsOf = async (bytes: Uint8Array, tab = 0) => (await readXlsx(bytes)).sheets[tab]!.cells;

describe("tabs and the date system", () => {
  it("lists each worksheet in the workbook's order, with the 1900 date system unless it says 1904", async () => {
    const book = await readXlsx(workbook({ sheets: [{ name: "Summary Snapshot" }, { name: "Stakeholder Snapshot" }, { name: "Context" }] }));
    expect(book.sheets.map((s) => s.name)).toEqual(["Summary Snapshot", "Stakeholder Snapshot", "Context"]);
    expect(book.dateSystem).toBe(1900);
  });

  it.each([
    ["1", 1904],
    ["true", 1904],
    ["0", 1900],
    ["false", 1900],
  ])("reads date1904=%s as the %s system", async (flag, system) => {
    expect((await readXlsx(workbook({ sheets: [{ name: "Context" }], date1904: flag }))).dateSystem).toBe(system);
  });

  it("leaves out a chart sheet, which holds no cells", async () => {
    const parts = workbookParts({ sheets: [{ name: "Context" }, { name: "Chart" }] });
    parts["xl/_rels/workbook.xml.rels"] = parts["xl/_rels/workbook.xml.rels"]!.replace(`rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"`, `rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartsheet"`);
    expect((await readXlsx(zipOf(parts))).sheets.map((s) => s.name)).toEqual(["Context"]);
  });
});

describe("text", () => {
  it("looks up shared strings, as Excel writes text", async () => {
    const cells = await cellsOf(workbook({ sheets: [{ name: "Context", cells: [{ at: "A1", text: "Round" }, { at: "B1", text: "Original Issue Price" }, { at: "A2", text: "Round" }] }] }));
    expect(cells).toEqual([
      { address: "A1", kind: "text", text: "Round", formula: false },
      { address: "B1", kind: "text", text: "Original Issue Price", formula: false },
      { address: "A2", kind: "text", text: "Round", formula: false },
    ]);
  });

  it("joins a rich text's runs, leaves out phonetic guides, keeps spaces and line breaks, and decodes entities and CDATA", async () => {
    const items = [
      "<si><r><rPr><b/></rPr><t>Series Seed </t></r><r><t>Preferred</t></r></si>",
      "<si><t>Fund</t><rPh sb=\"0\" eb=\"1\"><t>ふぁんど</t></rPh></si>",
      "<si><t xml:space=\"preserve\">  Total Stock\n(outstanding)* </t></si>",
      "<si><t>A &amp; B &lt;LP&gt; &#x2014; &#8364;1</t></si>",
      "<si><t><![CDATA[Seed <A> & Co]]></t></si>",
    ];
    const sheetData = items.map((_, i) => `<row r="${i + 1}"><c r="A${i + 1}" t="s"><v>${i}</v></c></row>`).join("");
    const cells = await cellsOf(workbook({ sheets: [{ name: "Context", sheetData }], sharedItems: items }));
    expect(cells.map((c) => c.text)).toEqual(["Series Seed Preferred", "Fund", "  Total Stock\n(outstanding)* ", "A & B <LP> — €1", "Seed <A> & Co"]);
  });

  it("reads inline strings and a formula's text result", async () => {
    const sheetData =
      `<row r="1"><c r="A1" t="inlineStr"><is><t>Context</t></is></c><c r="B1" t="inlineStr"><is><r><t>Plan </t></r><r><t>Name</t></r></is></c>` +
      `<c r="C1" t="str"><f>A1&amp;"!"</f><v>Context!</v></c></row>`;
    expect(await cellsOf(workbook({ sheets: [{ name: "Context", sheetData }] }))).toEqual([
      { address: "A1", kind: "text", text: "Context", formula: false },
      { address: "B1", kind: "text", text: "Plan Name", formula: false },
      { address: "C1", kind: "text", text: "Context!", formula: true },
    ]);
  });

  it("reads a part written in UTF-16", async () => {
    const parts: Record<string, string | Uint8Array> = workbookParts({ sheets: [{ name: "Context", cells: [{ at: "A1", text: "Fund Ü" }] }] });
    const xml = parts["xl/sharedStrings.xml"] as string;
    const utf16 = new Uint8Array(2 + xml.length * 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < xml.length; i++) new DataView(utf16.buffer).setUint16(2 + i * 2, xml.charCodeAt(i), true);
    parts["xl/sharedStrings.xml"] = utf16;
    expect((await cellsOf(zipOf(parts)))[0]!.text).toBe("Fund Ü");
  });
});

describe("numbers, as Excel stored them", () => {
  it("keeps each number's text exactly, never as a JavaScript number", async () => {
    const stored = ["0.20000000000000001", "2.5000000000000001E-3", "796000", "-12.5", "1E+21", "4.6834549305718995E-2"];
    const cells = await cellsOf(workbook({ sheets: [{ name: "Context", cells: stored.map((number, i) => ({ at: `D${i + 1}`, number })) }] }));
    expect(cells.map((c) => [c.kind, c.text])).toEqual(stored.map((s) => ["number", s]));
  });

  it("reads true and false as 1 and 0, and an error as written", async () => {
    const sheetData = `<row r="1"><c r="H1" t="b"><v>1</v></c><c r="H2" t="b"><v>0</v></c><c r="I1" t="e"><f>D1/0</f><v>#DIV/0!</v></c></row>`;
    expect(await cellsOf(workbook({ sheets: [{ name: "Context", sheetData }] }))).toEqual([
      { address: "H1", kind: "boolean", text: "1", formula: false },
      { address: "H2", kind: "boolean", text: "0", formula: false },
      { address: "I1", kind: "error", text: "#DIV/0!", formula: true },
    ]);
  });

  it("refuses a number cell that doesn't hold a number", async () => {
    const e = await refusal(workbook({ sheets: [{ name: "Context", sheetData: `<row r="1"><c r="B2"><v>about 1</v></c></row>` }] }));
    expect(e.code).toBe("bad_number");
  });
});

describe("formulas", () => {
  it("marks a formula, and gives the value Excel saved with it, or nothing if none was saved", async () => {
    const cells = await cellsOf(
      workbook({
        sheets: [
          {
            name: "Stakeholder Snapshot",
            cells: [
              { at: "C21", number: "796000", formula: "SUM(C3:C20)" },
              { at: "D21", formula: "SUM(D3:D20)", noValue: true },
              { at: "E3", text: "Founders", formula: "Context!K8" },
            ],
          },
        ],
      }),
    );
    expect(cells).toEqual([
      { address: "E3", kind: "text", text: "Founders", formula: true },
      { address: "C21", kind: "number", text: "796000", formula: true },
      { address: "D21", kind: "number", text: "", formula: true },
    ]);
  });

  it("marks a cell sharing another's formula, which has only a reference to it", async () => {
    const sheetData = `<row r="4"><c r="N4"><f t="shared" ref="N4:N6" si="0">M4/$M$21</f><v>0.25</v></c></row><row r="5"><c r="N5"><f t="shared" si="0"/><v>0.75</v></c></row>`;
    const cells = await cellsOf(workbook({ sheets: [{ name: "Stakeholder Snapshot", sheetData }] }));
    expect(cells.map((c) => [c.address, c.text, c.formula])).toEqual([
      ["N4", "0.25", true],
      ["N5", "0.75", true],
    ]);
  });
});

describe("dates", () => {
  it("marks a number in a date format as a date, its day count kept as stored, and an ISO date Excel wrote as text", async () => {
    const sheetData =
      `<row r="7"><c r="B7" s="1"><v>43510</v></c><c r="C7" s="2"><v>43601</v></c><c r="D7" s="3"><v>0.5</v></c>` +
      `<c r="E7" s="4"><v>1.5</v></c><c r="F7" t="d"><v>2021-04-01T00:00:00</v></c><c r="G7" s="5"><v>3</v></c></row>`;
    const cells = await cellsOf(workbook({ sheets: [{ name: "Context", sheetData }], formats: [0, 14, "yyyy\\.mm\\.dd", "[Red]0.00", "[h]:mm", '0 "days"'] }));
    expect(cells.map((c) => [c.address, c.kind, c.text])).toEqual([
      ["B7", "date", "43510"],
      ["C7", "date", "43601"],
      ["D7", "number", "0.5"],
      ["E7", "date", "1.5"],
      ["F7", "date", "2021-04-01T00:00:00"],
      ["G7", "number", "3"],
    ]);
  });

  it.each([
    ["m/d/yyyy", true],
    ["yyyy\\.mm\\.dd", true],
    ["[$-409]mmmm d, yyyy", true],
    ["d-mmm-yy", true],
    ["h:mm AM/PM", true],
    ["[h]:mm:ss", true],
    ["General", false],
    ["#,##0", false],
    ["0.00E+00", false],
    ["[Red]#,##0.00", false],
    ['_("$"* #,##0.00_)', false],
    ['0 "days"', false],
    ["0.0000", false],
    ["@", false],
  ])("isDateFormat(%j) is %s", (code, date) => {
    expect(isDateFormat(code)).toBe(date);
  });
});

describe("how the parts are written", () => {
  it("places cells and rows written without references, after the ones before them", async () => {
    const sheetData = `<row r="2"><c t="s"><v>0</v></c><c><v>5</v></c><c r="E2"><v>6</v></c><c><v>7</v></c></row><row><c><v>8</v></c></row>`;
    const cells = await cellsOf(workbook({ sheets: [{ name: "Context", sheetData }], sharedItems: ["<si><t>Total</t></si>"] }));
    expect(cells.map((c) => c.address)).toEqual(["A2", "B2", "E2", "F2", "A3"]);
  });

  it("reads elements with a namespace prefix as without", async () => {
    const plain = await readXlsx(workbook({ sheets: [{ name: "Context", cells: [{ at: "A1", text: "Round" }, { at: "D2", number: "0.5" }] }] }));
    const prefixed = await readXlsx(workbook({ sheets: [{ name: "Context", cells: [{ at: "A1", text: "Round" }, { at: "D2", number: "0.5" }] }], prefix: "x" }));
    expect(prefixed).toEqual(plain);
  });

  it("leaves out empty cells, even styled ones", async () => {
    const sheetData = `<row r="1"><c r="A1" s="1"/><c r="B1"><v>1</v></c><c r="C1" t="s" s="1"></c></row>`;
    expect((await cellsOf(workbook({ sheets: [{ name: "Context", sheetData }] }))).map((c) => c.address)).toEqual(["B1"]);
  });

  it("follows relationships to wherever the parts are, relative or from the zip's root", async () => {
    const parts = workbookParts({ sheets: [{ name: "Context", cells: [{ at: "A1", text: "Round" }] }] });
    const moved: Record<string, string> = {};
    for (const [name, xml] of Object.entries(parts)) moved[name.replace(/^xl\//, "book/")] = xml;
    moved["_rels/.rels"] = parts["_rels/.rels"]!.replace('Target="xl/workbook.xml"', 'Target="/book/workbook.xml"');
    moved["book/_rels/workbook.xml.rels"] = parts["xl/_rels/workbook.xml.rels"]!.replace('Target="worksheets/sheet1.xml"', 'Target="/book/worksheets/sheet1.xml"');
    expect((await cellsOf(zipOf(moved)))[0]!.text).toBe("Round");
  });

  it("reads parts deflated, as Excel saves them", async () => {
    const cells = await cellsOf(workbook({ sheets: [{ name: "Context", cells: [{ at: "A1", text: "Round" }, { at: "D2", number: "0.5" }] }], deflate: true }));
    expect(cells.map((c) => c.text)).toEqual(["Round", "0.5"]);
  });
});

describe("what it refuses, each by a code", () => {
  it("an older .xls, or a workbook with a password, which are both wrapped as an older Office file", async () => {
    const e = await refusal(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]));
    expect([e.code, e.message]).toEqual(["xls_or_password", "It's an older Excel file (.xls), or a workbook protected with a password. Save it as an .xlsx with no password, and open that."]);
  });

  it("a file that isn't a zip", async () => {
    expect((await refusal(new TextEncoder().encode("Stakeholder,Shares\nA,1\n"))).code).toBe("not_xlsx");
  });

  it("a zip that isn't a workbook, such as an OCF package", async () => {
    expect((await refusal(zipOf({ "Manifest.ocf.json": "{}" }))).code).toBe("no_workbook");
  });

  it("a binary workbook (.xlsb)", async () => {
    const parts = { "_rels/.rels": `<Relationships xmlns="x"><Relationship Id="rId1" Type="x/officeDocument" Target="xl/workbook.bin"/></Relationships>`, "xl/workbook.bin": "\u0000" };
    expect((await refusal(zipOf(parts))).code).toBe("xlsb");
  });

  it("a zip that unzips to more than 100 MB, before inflating anything", async () => {
    const parts = workbookParts({ sheets: [{ name: "Context" }] });
    const e = await refusal(zipOf(parts, { claimedLength: { "xl/sharedStrings.xml": 100_000_001 } }));
    expect([e.code, e.message]).toEqual(["too_large", "It unzips to more than 100 MB, far more than a cap table workbook would be. Check it's the right file."]);
  });

  it.each([
    ["XML that doesn't close", "<worksheet><sheetData>"],
    ["a DOCTYPE", '<!DOCTYPE worksheet [<!ENTITY a "aaaa">]><worksheet><sheetData/></worksheet>'],
    ["an entity it doesn't know", "<worksheet><sheetData><row r=\"1\"><c r=\"A1\" t=\"inlineStr\"><is><t>&nbsp;</t></is></c></row></sheetData></worksheet>"],
  ])("a part with %s", async (_, xml) => {
    const parts = workbookParts({ sheets: [{ name: "Context" }] });
    parts["xl/worksheets/sheet1.xml"] = xml;
    expect((await refusal(zipOf(parts))).code).toBe("bad_xml");
  });

  it("a cell whose shared string isn't there", async () => {
    const e = await refusal(workbook({ sheets: [{ name: "Context", sheetData: `<row r="1"><c r="A1" t="s"><v>3</v></c></row>` }] }));
    expect(e.code).toBe("shared_string_missing");
  });

  it.each([
    ["a reference it can't read", `<row r="1"><c r="1A"><v>1</v></c></row>`],
    ["a type it doesn't know", `<row r="1"><c r="A1" t="q"><v>1</v></c></row>`],
  ])("a cell with %s", async (_, sheetData) => {
    expect((await refusal(workbook({ sheets: [{ name: "Context", sheetData }] }))).code).toBe("bad_cell");
  });

  it("a tab that points to a part the zip doesn't have", async () => {
    const parts: Record<string, string> = workbookParts({ sheets: [{ name: "Context" }] });
    delete parts["xl/worksheets/sheet1.xml"];
    expect((await refusal(zipOf(parts))).code).toBe("missing_part");
  });
});
