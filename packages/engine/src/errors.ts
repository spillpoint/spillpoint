// The ways the engine says no to an input.

/** The input is malformed: a missing field, an unknown holder, a bad number. */
export class InputError extends Error {
  override name = "InputError";
  readonly path: string;

  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.path = path;
  }
}

/**
 * The engine couldn't settle on an answer at an exit value: option exercise
 * didn't settle, solving from one end went round in a circle (E15), or a
 * conversion group's vote had no single comparison (E17). The engine stops
 * rather than guessing.
 */
export class NoAnswerError extends Error {
  override name = "NoAnswerError";
}

/**
 * A cap table export an importer won't read: an Open Cap Format package
 * (O1–O12) or an OCX workbook (0.6.0). "unsupported": valid in its format, but
 * spillpoint doesn't model it, so reading it would change payouts without
 * saying so. "malformed": the files disagree with each other or with their
 * format, so there's no single cap table to build. The term names the problem;
 * the subject is what it's about (for OCF, the object id, file name or
 * version), and `format` says which importer refused. One class for both
 * imports, so a page catches one (the naming review's item 7).
 */
export class ImportRefusal extends Error {
  override name = "ImportRefusal";
  readonly format: "ocf" | "ocx";
  readonly kind: "unsupported" | "malformed";
  readonly term: string;
  readonly subject: string;

  constructor(format: "ocf" | "ocx", kind: "unsupported" | "malformed", term: string, subject: string, message: string) {
    super(message);
    this.format = format;
    this.kind = kind;
    this.term = term;
    this.subject = subject;
  }
}

/**
 * An Open Cap Format package readOcf won't read: an ImportRefusal whose format
 * is "ocf".
 *
 * @deprecated Catch ImportRefusal instead. From 0.7.0 readOcf throws
 * ImportRefusal itself, and this name goes.
 */
export class OcfRefusal extends ImportRefusal {
  override name = "OcfRefusal";

  constructor(kind: "unsupported" | "malformed", term: string, subject: string, message: string) {
    super("ocf", kind, term, subject, message);
  }
}

/**
 * The input uses a term the engine doesn't model. It is refused, never
 * skipped: ignoring a warrant or a dividend would give a wrong answer that
 * looks right. The message says what isn't modeled, not when it might be:
 * since 0.6.0 a refusal carries no milestone (the 0.2.0 deprecation).
 */
export class UnsupportedTermError extends Error {
  override name = "UnsupportedTermError";
  readonly term: string;
  readonly path: string;

  constructor(term: string, path: string, what: string) {
    super(`${path}: ${what}. The engine doesn't model this, so it refuses the input rather than ignoring the term.`);
    this.term = term;
    this.path = path;
  }
}
