// The import report's notes (O10): one line for each choice an import makes,
// by code, about a subject (an object id or file name) and sometimes a field.

export interface OcfNote {
  code: string;
  subject?: string;
  field?: string;
}

export class Notes {
  private readonly lines: OcfNote[] = [];
  private readonly seen = new Set<string>();

  /** Adds a note once: a class whose conversion is adjusted still gets one rounding line. */
  add(code: string, subject?: string, field?: string): void {
    const key = `${code}\u0000${subject ?? ""}\u0000${field ?? ""}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.lines.push({ code, ...(subject === undefined ? {} : { subject }), ...(field === undefined ? {} : { field }) });
  }

  list(): OcfNote[] {
    return [...this.lines];
  }
}
