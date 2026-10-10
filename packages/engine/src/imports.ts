// What an import gives, whichever format it read (O1, O10, O14): the cap table as of the export's date, in the
// case-file format (C1–C4), with a blank (null) wherever the format doesn't settle a term, the list of those blanks to
// fill in, the order its series, SAFEs and notes were issued in, and a report of what was read, set aside and noted.
// readOcf returns it, and readOcx will (0.6.0). Its names are snake_case because it's case-file data: it's saved as
// JSON, read with readCapTable once its blanks are filled, and passed on as a start event's fields (the naming review's
// item 2).

/** One line of an import's report (O10): a choice the import made, by code, about a subject and sometimes a field. */
export interface ImportNote {
  code: string;
  subject?: string;
  field?: string;
}

/** A term an import leaves blank, for the page to ask about (O1). A blank that belongs to no one security, SAFE or note names only its field. */
export interface ImportBlank {
  security?: string;
  safe?: string;
  note?: string;
  field: string;
}

export interface ImportReport {
  /** How many of each kind of object set the cap table. */
  read: Record<string, number>;
  /** How many of each kind were read and set aside, since they don't change payouts. */
  not_needed: Record<string, number>;
  notes: ImportNote[];
}

/** An import, in the case-file format: `cap_table` reads with readCapTable once its blanks are filled in. */
export interface CapTableImport {
  as_of: string;
  cap_table: Record<string, unknown>;
  /**
   * The order its preferred series, SAFEs and notes were issued in, earliest first (O14), in the shape a starting cap
   * table takes it (R31, C17), so a round added to the import reads R25's "issued before the series" as the export has it.
   */
  issue_order: string[];
  to_fill: ImportBlank[];
  report: ImportReport;
}
