// The cell-kinds script's report (0.6.0, 06c; ASSUMPTIONS OX2): what kinds of cell an OCX workbook's columns hold,
// with counts, and nothing else. Pinned on a fictional workbook of our own, Tamarisk Labs, and checked for leaks: no
// value from it may appear in what's printed, and no header the company wrote.

import { describe, expect, it } from "vitest";

import { FORMAT_NAMES, normalHeader, structureLines } from "../src/ocxStructure.ts";
import { readXlsx } from "../src/xlsx.ts";
import { workbook } from "./workbooks.ts";
import type { Cell } from "./workbooks.ts";

/** A row of cells from column A, each a text or a number. */
function row(r: number, values: (string | number | null | Partial<Cell>)[], from = "A"): Cell[] {
  return values.flatMap((v, i) => {
    if (v == null) return [];
    const at = `${String.fromCharCode(from.charCodeAt(0) + i)}${r}`;
    if (typeof v === "string") return [{ at, text: v }];
    if (typeof v === "number") return [{ at, number: String(v) }];
    return [{ at, ...v }];
  });
}

/** Tamarisk Labs, in OCX 0.5's layout: every kind of column the script counts, and a holder's details it must not read. */
function tamarisk(): Uint8Array {
  return workbook({
    formats: [0, 14],
    sheets: [
      {
        name: "Summary Snapshot",
        cells: [
          ...row(1, ["As of [DATE]"]),
          ...row(2, ["Share Class", "Shares Authorized/ Reserved", "Outstanding Shares*", "Fully Diluted Shares**", "% Fully Diluted**"]),
          ...row(2, ["Security Type", "# of Securities", " Outstanding Amount", "Discount", "Valuation Cap"], "L"),
          ...row(3, ["Post-$ SAFEs", 3, 1750000, "N/A", 18500000], "L"),
          ...row(4, ["Common Stock****", { number: "9100000", formula: "SUM(B5:B5)" }]),
          ...row(5, ["Class A Common Stock", 9100000, { number: "7250000", formula: "'Stakeholder Snapshot'!C6" }, { number: "7250000", formula: "'Stakeholder Snapshot'!C6" }, { number: "0.70388349514563109", formula: "D5/$D$9" }]),
          ...row(7, ["Series Quokka Preferred Stock", 3050000, 3050000, 3050000, { number: "0.29611650485436891", formula: "D7/$D$9" }]),
          ...row(9, ["Total", null, { formula: "SUM(C4:C8)", noValue: true }]),
          ...row(11, ["Notes"]),
          ...row(12, ["* A footnote about outstanding shares at Tamarisk."]),
        ],
      },
      {
        name: "Stakeholder Snapshot",
        cells: [
          ...row(2, ["Stakeholder", "Stakeholder Group", "Class A Common Stock", "Series Quokka Preferred Stock \n(outstanding) (1.0000)", "Tamarisk 2024 Equity Plan", "Class A Common Stock Warrants", "Total Stock (outstanding)*"]),
          ...row(2, ["Total Stock \n(as converted)", "All Common"], "I"),
          ...row(2, ["Primary Stakeholder Type", "Mailing Address Line 1", "Email Address", "Notes"], "L"),
          ...row(3, ["Wren Okafor", "Founders", 4600000, 0, 0, 0, { number: "4600000", formula: "SUM(C3:D3)" }]),
          ...row(3, [4600000, { number: "0.50549450549450547", formula: "I3/$I$8" }], "I"),
          ...row(3, ["Founder", "11 Juniper Row", "wren@tamarisk.example", "Signed 2023"], "L"),
          ...row(4, ["Halyard Ventures", "VC1", 0, 3050000, null, 0, { number: "3050000", formula: "SUM(C4:D4)" }]),
          ...row(4, ["Fund", "88 Pier Street", "deals@halyard.example"], "L"),
          ...row(5, ["Ilse Brandt", null, 2650000, 0, 412500, 25000, { number: "2650000", formula: "SUM(C5:D5)" }]),
          ...row(6, ["Options Remaining for Issuance", null, 0, 0, 187500, 0]),
          ...row(8, ["Total", null, { number: "7250000", formula: "SUM(C3:C7)" }, { number: "3050000", formula: "SUM(D3:D7)" }]),
        ],
      },
      { name: "Voting by SH Group", cells: [...row(2, ["Shareholder Group", "Total Stock \n(as converted)"]), ...row(3, ["Founders", 0.55])] },
      {
        name: "Context",
        cells: [
          ...row(1, ["As of [DATE]", null, "Context Tab"]),
          ...row(3, ["Generated on [DATE]", null, "OCX Version 0.5"]),
          ...row(5, ["Financing History"]),
          ...row(6, ["Round", "Initial Closing Date", "Most Recent Closing Date", "Original Issue Price", "Adjusted Conversion Price", "Conversion Ratio", "Liquidation Multiple", "Participating (Y/N)", "Participation Cap"]),
          ...row(7, ["Series Quokka", "2024.03.18", { number: "45369", style: 1 }, 1.4375, 1.4375, 1, 1, "N", "N/A"]),
          ...row(9, ["Stock Plan Details"]),
          ...row(10, ["Plan Name", "Total Reserved", "Total Granted", "Outstanding Shares/Exercised Options", "Outstanding Options", "Outstanding RSUs", "Shares Returned to Plan", "Shares Available for Grant"]),
          ...row(11, ["Tamarisk 2024 Equity Plan", 600000, 412500, 0, 412500, 0, 0, { number: "187500", formula: "B11-C11+G11" }]),
        ],
      },
      { name: "Tamarisk notes", cells: row(1, ["Board approved 2024"]) },
    ],
  });
}

describe("the cell-kinds report", () => {
  it("says, for each column the format names, what kinds of cell it holds, and nothing more", async () => {
    expect(structureLines(await readXlsx(tamarisk()), "0.6.0")).toEqual([
      "spillpoint 0.6.0: an OCX workbook's structure, in counts and kinds",
      "Dates: the 1900 system",
      "Version label: OCX Version 0.5",
      "Tabs: Summary Snapshot, Stakeholder Snapshot, Voting by SH Group, Context; other tabs 1",
      "Summary Snapshot:",
      "  Share Class: 4 text",
      "  Shares Authorized/ Reserved: 3 numbers (3 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 1 empty",
      "  Outstanding Shares: 2 numbers (2 with 15 digits or fewer, 0 with 16 or 17), 2 formulas, 1 with no saved value, 1 empty",
      "  Fully Diluted Shares: 2 numbers (2 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 2 empty",
      "  % Fully Diluted: 2 numbers (0 with 15 digits or fewer, 2 with 16 or 17), 2 formulas, 2 empty",
      "  Security Type: 1 text",
      "  # of Securities: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Outstanding Amount: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Discount: 1 text",
      "  Valuation Cap: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  not found: Liquidation Preference, Voting Multiplier, Voting Power, Voting %",
      "Stakeholder Snapshot:",
      "  Stakeholder: 5 text",
      "  Stakeholder Group: 2 text, 3 empty",
      "  Total Stock (outstanding): 3 numbers (3 with 15 digits or fewer, 0 with 16 or 17), 3 formulas, 2 empty",
      "  other columns: 2; 8 numbers (8 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 2 empty",
      "  class columns (outstanding): 1; 5 numbers (5 with 15 digits or fewer, 0 with 16 or 17), 1 formula",
      "  warrant columns: 1; 4 numbers (4 with 15 digits or fewer, 0 with 16 or 17), 1 empty",
      "  Voting power by stakeholder: set aside",
      "  Additional Information: not read",
      "  not found: Non-Plan Awards, Total Stock (as converted), Total Stock % (as converted), Fully Diluted Shares, Fully Diluted %",
      "Voting by SH Group: set aside",
      "Context:",
      "  Round: 1 text",
      "  Initial Closing Date: 1 text (1 as YYYY.MM.DD, 0 as YYYY-MM-DD, 0 other)",
      "  Most Recent Closing Date: 1 date (1 as day counts, 0 as ISO text)",
      "  Original Issue Price: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Adjusted Conversion Price: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Conversion Ratio: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Liquidation Multiple: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Participating (Y/N): 1 text",
      "  Participation Cap: 1 text",
      "  Plan Name: 1 text",
      "  Total Reserved: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Total Granted: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Outstanding Shares/Exercised Options: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Outstanding Options: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Outstanding RSUs: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Shares Returned to Plan: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Shares Available for Grant: 1 number (1 with 15 digits or fewer, 0 with 16 or 17), 1 formula",
      "  not found: Valuation Date, Price Per Share (Common), Options Outstanding at Valuation, Valuation Firm, Date, Action, Stockholder Approval Date, Number of Shares, Total Shares Reserved, Classes/Series Affected, Original Shares, Resulting Shares",
    ]);
  });

  it("prints no value from the workbook, no header the company wrote, and nothing from a holder's details", async () => {
    const book = await readXlsx(tamarisk());
    const printed = structureLines(book, "0.6.0").join("\n");
    // The format's own labels, which aren't the company's: every other text and number in the workbook is.
    const labels = new Set(["As of [DATE]", "Generated on [DATE]", "Context Tab", "OCX Version 0.5", "Total", "Options Remaining for Issuance", "Common Stock", "Post-$ SAFEs", "N/A", "N"]);
    const secrets = book.sheets.flatMap((s) => s.cells).filter((c) => c.text !== "").map((c) => normalHeader(c.text)).filter((t) => !FORMAT_NAMES.has(t) && !labels.has(t));
    expect(secrets.length).toBeGreaterThan(50);
    for (const secret of secrets) {
      // A short number can't be told from the counts the report prints by design, as in the OCF check's leak test.
      if (/^\d{1,3}$/.test(secret)) continue;
      expect(printed, secret).not.toMatch(new RegExp(`(^|[^\\w.])${secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w.])`));
    }
    for (const word of ["Tamarisk", "Quokka", "Wren", "Halyard", "Juniper", "example", "Equity Plan", "Founder"]) expect(printed).not.toContain(word);
  });

  it("names the date system and finds no label or known tab where there are none", async () => {
    const book = await readXlsx(workbook({ sheets: [{ name: "Cap Table", cells: row(1, ["Stakeholder", "Shares"]) }], date1904: "1" }));
    expect(structureLines(book, "0.6.0")).toEqual([
      "spillpoint 0.6.0: an OCX workbook's structure, in counts and kinds",
      "Dates: the 1904 system",
      "Version label: none",
      "Tabs: none known; other tabs 1",
    ]);
  });

  it("prints a version label that isn't a version as other", async () => {
    const book = await readXlsx(workbook({ sheets: [{ name: "Context", cells: row(3, [null, null, "OCX Version Tamarisk-draft"]) }] }));
    expect(structureLines(book, "0.6.0")[2]).toBe("Version label: other");
  });
});

describe("normalHeader", () => {
  it.each([
    ["Total Stock \n(outstanding)*", "Total Stock (outstanding)"],
    ["  Common Stock****", "Common Stock"],
    ["Mailing Address Line 2 ", "Mailing Address Line 2"],
    [" Fully Diluted %", "Fully Diluted %"],
    ["Series A \nPreferred Stock \n(outstanding) (1.0000)", "Series A Preferred Stock (outstanding) (1.0000)"],
  ])("%j reads as %j", (raw, read) => {
    expect(normalHeader(raw)).toBe(read);
  });
});
