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
      "Tabs: Summary Snapshot, Stakeholder Snapshot, Voting by SH Group, Context, tab 5",
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
      "  class columns: 1; 5 numbers (5 with 15 digits or fewer, 0 with 16 or 17), 1 formula",
      "  class columns (outstanding): 1; 5 numbers (5 with 15 digits or fewer, 0 with 16 or 17), 1 formula",
      "  other columns: 1; 3 numbers (3 with 15 digits or fewer, 0 with 16 or 17), 2 empty",
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
      "tab 5:",
      "  column A: 1 text",
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
      "Tabs: tab 1",
      "tab 1:",
      "  column A (Stakeholder): nothing else",
      "  column B: 1 text",
    ]);
  });

  it("reports a tab the format doesn't name by its position, and its columns by letter, naming only the format's own headers", async () => {
    // A layout of its own, as a securities ledger report might have: a title, a header row, three holders and a total.
    const ledger = workbook({
      formats: [0, 14],
      sheets: [
        { name: "Summary Snapshot", cells: row(2, ["Share Class"]) },
        {
          name: "Tamarisk securities ledger",
          cells: [
            ...row(1, ["Tamarisk Labs: securities ledger by type and class"]),
            ...row(3, ["Stakeholder", "Class", "Quantity", "Original Issue Price", "Issue Date", "Email Address"]),
            ...row(4, ["Wren Okafor", "Class A Common Stock", 4600000, 0.0001, { number: "44927", style: 1 }, "wren@tamarisk.example"]),
            ...row(5, ["Halyard Ventures", "Series Quokka Preferred Stock", 3050000, 1.4375, { number: "45369", style: 1 }, "deals@halyard.example"]),
            ...row(6, ["Ilse Brandt", "Class A Common Stock", 2650000, { number: "0.20000000000000001" }, { number: "45001", style: 1 }]),
            ...row(7, ["Total", null, { number: "0", formula: "SUM(C4:C6)" }]),
          ],
        },
      ],
    });
    const printed = structureLines(await readXlsx(ledger), "0.6.0");
    expect(printed.slice(3)).toEqual([
      "Tabs: Summary Snapshot, tab 2",
      "Summary Snapshot:",
      "  empty throughout: Share Class",
      "  not found: Shares Authorized/ Reserved, Outstanding Shares, Fully Diluted Shares, % Fully Diluted, Liquidation Preference, Voting Multiplier, Voting Power, Voting %, Security Type, # of Securities, Outstanding Amount, Discount, Valuation Cap",
      "tab 2:",
      "  column A (Stakeholder): 5 text",
      "  column B: 4 text",
      "  column C: 4 numbers (4 with 15 digits or fewer, 0 with 16 or 17), 1 text, 1 formula, 1 saved as 0",
      "  column D (Original Issue Price): 3 numbers (2 with 15 digits or fewer, 1 with 16 or 17)",
      "  column E (Issue Date): 3 dates (3 as day counts, 0 as ISO text)",
      "  column F (Email Address): not read",
    ]);
    for (const word of ["Tamarisk", "ledger", "Class A Common", "Quokka", "Quantity", "Wren", "Halyard", "example", "4600000", "1.4375", "44927"]) {
      expect(printed.join("\n")).not.toContain(word);
    }
  });

  it("prints a version label that isn't a version as other", async () => {
    const book = await readXlsx(workbook({ sheets: [{ name: "Context", cells: row(3, [null, null, "OCX Version Tamarisk-draft"]) }] }));
    expect(structureLines(book, "0.6.0")[2]).toBe("Version label: other");
  });
});

/**
 * Tamarisk Labs again, in the layout of OCX 0.7 as one Mantle export has it (06d): tab names and headers only, from
 * that export; the company, its holders, numbers and arrangement are our own, and nothing else is taken from it.
 */
function tamarisk07(): Uint8Array {
  const ledgerTitle = (r: number, what: string) => row(r, ["As of Sat, 10 Oct 2026", `Tamarisk Labs ${what} Ledger`]);
  return workbook({
    sheets: [
      {
        name: "Summary View",
        cells: [
          ...row(1, ["As of Sat, 10 Oct 2026", "Tamarisk Labs Summary Capitalization"]),
          ...row(2, ["Share Class", "Shares Authorized/Reserved", "Outstanding Shares*", "Fully Diluted Shares**", "% Fully Diluted**"]),
          ...row(2, ["Security Type", "# of Securities", "Outstanding Amount", "Discount", "Valuation Cap", "MFN"], "L"),
          ...row(4, ["Common Stock****", { formula: "SUM(B5:B5)", noValue: true }]),
          ...row(5, ["Quokka Common", 0, 7250000, 7250000, "0.94771241830065356"]),
          ...row(7, ["Total", null, { formula: "SUM(C3:C6)", noValue: true }]),
        ],
      },
      {
        name: "Stakeholder View",
        cells: [
          ...row(2, ["Stakeholder", "Stakeholder Group", "Quokka Common Stock", "Tamarisk Option Plan Options", "Stock Warrants****", "Total Stock (outstanding)*"]),
          ...row(2, ["Total Stock (as converted)", "Quokka Common Stock (outstanding)", "All Common"], "H"),
          ...row(2, ["Primary Stakeholder Type", "Email Address"], "L"),
          ...row(3, ["Wren Okafor", null, 7250000, 0, 0, { formula: "SUM(C3)", noValue: true }]),
          ...row(3, [{ formula: "SUM(C3)", noValue: true }, { formula: "C3/C6", noValue: true }], "H"),
          ...row(3, ["Founder", "wren@tamarisk.example"], "L"),
          ...row(4, ["Ilse Brandt", null, 0, 400000, 25000]),
          ...row(5, ["Options remaining for issuance", null, 0, 200000, 0]),
          ...row(6, ["Total", null, { formula: "SUM(C3:C5)", noValue: true }]),
        ],
      },
      {
        name: "Quokka Common Ledger",
        cells: [
          ...ledgerTitle(1, "Quokka Common"),
          ...row(2, ["Stockholder", "Issue Date", "Cert No.", "No. Shares Issued", "Price", "Certificate Outstanding (Y/N)", "No. Shares Outstanding", "State of Residence"]),
          ...row(3, ["Wren Okafor", "2023-02-01", "CS-1", 7250000, 0.0001, "Y", 7250000, "WA"]),
          ...row(4, ["Total", null, null, { formula: "SUM(D3)", noValue: true }]),
        ],
      },
      {
        name: "Tamarisk Option Plan Ledger",
        cells: [
          ...ledgerTitle(1, "Tamarisk Option Plan"),
          ...row(2, ["Optionholder", "Grant Date", "Shares Granted", "Exercise Price", "Shares Outstanding from Original Grant", "Share Class", "Display Status"]),
          ...row(3, ["Ilse Brandt", "2024-05-01", 400000, 0.31, 400000, "Quokka Common", "Outstanding"]),
        ],
      },
      {
        name: "Warrants Ledger",
        cells: [
          ...ledgerTitle(1, "Warrants"),
          ...row(2, ["Convertible Holder", "Issue Date", "Series of Stock", "Price Per Share", "Warrant Shares Outstanding", "Display Status"]),
          ...row(3, ["Ilse Brandt", "2024-06-01", "Quokka Common", 0.5, 25000, "Outstanding"]),
        ],
      },
      {
        name: "SAFEs Ledger",
        cells: [
          ...ledgerTitle(1, "SAFEs"),
          ...row(2, ["SAFE Holder", "Issue Date", "Investment Amount", "Valuation Cap", "Discount", "Valuation Method (Pre- or Post-Money)", "Display Status", "Most Favored Nation"]),
          ...row(3, ["Halyard Ventures", "2025-01-10", 500000, 8000000, null, "Post Money", "Outstanding"]),
        ],
      },
      {
        name: "Context",
        cells: [
          ...row(1, ["As of Sat, 10 Oct 2026", "Context"]),
          ...row(3, ["Generated at 2026-10-10T12:00:00Z", "OCX Version 0.7"]),
          ...row(5, ["Stock Plan History"]),
          ...row(6, ["Plan Name", "Date", "Action", "Stockholder Approval Date", "No. Shares", "Total Shares Reserved"]),
          ...row(7, ["Tamarisk Option Plan", "2023-03-01", "Initial Adoption", "Unknown", 600000, 600000]),
        ],
      },
    ],
  });
}

describe("OCX 0.7 (06d)", () => {
  it("knows 0.7's tabs, and the ledgers named for a class or a plan by their headers, never their names", async () => {
    const lines = structureLines(await readXlsx(tamarisk07()), "0.6.0");
    expect(lines.slice(0, lines.indexOf("plan ledger (tab 4):"))).toEqual([
      "spillpoint 0.6.0: an OCX workbook's structure, in counts and kinds",
      "Dates: the 1900 system",
      "Version label: OCX Version 0.7",
      "Tabs: Summary View, Stakeholder View, tab 3 (class ledger), tab 4 (plan ledger), Warrants Ledger, SAFEs Ledger, Context",
      "Summary View:",
      "  Share Class: 3 text",
      "  Shares Authorized/Reserved: 1 number (1 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 1 with no saved value, 1 empty",
      "  Outstanding Shares: 1 number (1 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 1 with no saved value, 1 empty",
      "  Fully Diluted Shares: 1 number (1 with 15 digits or fewer, 0 with 16 or 17), 2 empty",
      "  % Fully Diluted: 1 text, 2 empty",
      "  empty throughout: Security Type, # of Securities, Outstanding Amount, Discount, Valuation Cap, MFN",
      "  not found: Liquidation Preference, Voting Multiplier, Voting Power, Voting %",
      "Stakeholder View:",
      "  Stakeholder: 4 text",
      "  Stock Warrants: 3 numbers (3 with 15 digits or fewer, 0 with 16 or 17), 1 empty",
      "  Total Stock (outstanding): 1 formula, 1 with no saved value, 3 empty",
      "  class columns: 1; 3 numbers (3 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 1 with no saved value",
      "  option columns: 1; 3 numbers (3 with 15 digits or fewer, 0 with 16 or 17), 1 empty",
      "  empty throughout: Stakeholder Group",
      "  Voting power by stakeholder: set aside",
      "  Additional Information: not read",
      "  not found: Non-Plan Awards, Total Stock (as converted), Total Stock % (as converted), Fully Diluted Shares, Fully Diluted %",
      "class ledger (tab 3):",
      "  Stockholder: 2 text",
      "  Issue Date: 1 text (0 as YYYY.MM.DD, 1 as YYYY-MM-DD, 0 other), 1 empty",
      "  Cert No.: 1 text, 1 empty",
      "  No. Shares Issued: 1 number (1 with 15 digits or fewer, 0 with 16 or 17), 1 formula, 1 with no saved value",
      "  Price: 1 number (1 with 15 digits or fewer, 0 with 16 or 17), 1 empty",
      "  Certificate Outstanding (Y/N): 1 text, 1 empty",
      "  No. Shares Outstanding: 1 number (1 with 15 digits or fewer, 0 with 16 or 17), 1 empty",
      "  State of Residence: not read",
      `  not found: ${["Board Approval Date", "Cert. Transferred From", "Cert. Transferred To", "Basis of Issuance", "Cash Paid", "Debt Cancelled", "Cancellation Date", "Reason for Cancellation", "Vesting Commencement Date", "Vesting Schedule", "Shares Vested", "Acceleration", "Federal Exemption", "Plan Security (Y/N)", "Rule 144 Date", "Termination Date", "Comments", "Fully Diluted Ownership", "Equity Plan Name", "Price Per Share Currency", "Consolidation Currency", "Originating From", "Resulting Securities"].join(", ")}`,
    ]);
  });

  it("finds on a 0.7 Context the plan history, and says Financing History isn't there", async () => {
    const lines = structureLines(await readXlsx(tamarisk07()), "0.6.0");
    expect(lines.slice(lines.indexOf("Context:"))).toEqual([
      "Context:",
      "  Plan Name: 1 text",
      "  Date: 1 text (0 as YYYY.MM.DD, 1 as YYYY-MM-DD, 0 other)",
      "  Action: 1 text",
      "  Stockholder Approval Date: 1 text",
      "  No. Shares: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Total Shares Reserved: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  not found: Round, Initial Closing Date, Most Recent Closing Date, Original Issue Price, Adjusted Conversion Price, Conversion Ratio, Liquidation Multiple, Participating (Y/N), Participation Cap, Total Reserved, Total Granted, Outstanding Shares/Exercised Options, Outstanding Options, Outstanding RSUs, Shares Returned to Plan, Shares Available for Grant",
    ]);
  });

  it("reads each 0.7 ledger's headers, and never a holder's state of residence", async () => {
    const lines = structureLines(await readXlsx(tamarisk07()), "0.6.0");
    const section = (start: string) => lines.slice(lines.indexOf(start), lines.findIndex((l, i) => i > lines.indexOf(start) && !l.startsWith("  ")));
    expect(section("plan ledger (tab 4):").slice(0, 8)).toEqual([
      "plan ledger (tab 4):",
      "  Optionholder: 1 text",
      "  Grant Date: 1 text (0 as YYYY.MM.DD, 1 as YYYY-MM-DD, 0 other)",
      "  Shares Granted: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Exercise Price: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Shares Outstanding from Original Grant: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Share Class: 1 text",
      "  Display Status: 1 text",
    ]);
    expect(section("SAFEs Ledger:").slice(0, 8)).toEqual([
      "SAFEs Ledger:",
      "  SAFE Holder: 1 text",
      "  Issue Date: 1 text (0 as YYYY.MM.DD, 1 as YYYY-MM-DD, 0 other)",
      "  Investment Amount: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Valuation Cap: 1 number (1 with 15 digits or fewer, 0 with 16 or 17)",
      "  Valuation Method (Pre- or Post-Money): 1 text",
      "  Display Status: 1 text",
      "  empty throughout: Discount, Most Favored Nation",
    ]);
    const printed = lines.join("\n");
    for (const word of ["Tamarisk", "Quokka", "Wren", "Ilse", "Halyard", "example", "WA", "7250000", "0.31", "8000000", "2024-05-01", "Founder"]) expect(printed).not.toContain(word);
  });

  it("takes an unnamed tab's header row from its headers, never from a title above them", async () => {
    // A title row naming "Additional Information" above a block of a holder's details, as 0.7's tabs have.
    const book = await readXlsx(
      workbook({
        sheets: [
          {
            name: "Holders",
            cells: [...row(1, ["Tamarisk holders", "Additional Information"]), ...row(2, ["Stakeholder", "Email Address", "State of Residence"]), ...row(3, ["Wren Okafor", "wren@tamarisk.example", "WA"])],
          },
        ],
      }),
    );
    expect(structureLines(book, "0.6.0").slice(3)).toEqual(["Tabs: tab 1", "tab 1:", "  column A (Stakeholder): 2 text", "  column B (Email Address): not read", "  column C (State of Residence): not read"]);
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
