// An OCX workbook, as readOcx will take it (0.6.0): the Open Cap Table Coalition's Excel layout of a cap table.
//
// OCX is developed by the Open Cap Table Coalition: https://github.com/Open-Cap-Table-Coalition/ocx. spillpoint reads
// files in that format.
//
// The engine does no I/O and never opens a spreadsheet. The page, or a script, unzips the .xlsx and reads its XML, and
// hands over each tab's cells as Excel stored them (ASSUMPTIONS OX1). A number stays the text Excel wrote, never a
// JavaScript number, so nothing reaches the engine's money math through floating point (hard rule 2).

/** One cell with something in it. Empty cells, even styled ones, aren't listed. */
export interface OcxCell {
  /** Where it is, in Excel's form: "B12". */
  address: string;
  /**
   * "number" for a number, "date" for a number formatted as a date (a day count in the workbook's `dateSystem`) or a
   * date Excel wrote as text in ISO form, "text", "boolean" ("1" or "0") or "error" ("#DIV/0!").
   */
  kind: "number" | "text" | "boolean" | "error" | "date";
  /** The value exactly as stored: "0.20000000000000001", not 0.2. For a formula, the value Excel saved with it, or "" if none was saved. */
  text: string;
  /** The cell holds a formula. Its value is never worked out here: `text` is what Excel saved. */
  formula: boolean;
}

export interface OcxSheet {
  /** The tab's name. */
  name: string;
  /** Its cells with something in them, row by row. */
  cells: OcxCell[];
}

export interface OcxWorkbook {
  /**
   * What a date-formatted number counts days from: 1900, Excel's usual, where day 1 is 1 January 1900 and day 60 is
   * the 29 February 1900 that never existed; or 1904, an older Mac setting, where day 0 is 1 January 1904.
   */
  dateSystem: 1900 | 1904;
  /** Its worksheets, in the workbook's order. */
  sheets: OcxSheet[];
}
