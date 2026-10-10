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
 * An Open Cap Format package the importer won't read (O1–O12). "unsupported":
 * valid OCF that spillpoint doesn't model, so reading it would change payouts
 * without saying so. "malformed": the files disagree with each other or with
 * OCF, so there's no single cap table to build. The term names the problem;
 * the subject is the object id, file name or version it's about.
 */
export class OcfRefusal extends Error {
  override name = "OcfRefusal";
  readonly kind: "unsupported" | "malformed";
  readonly term: string;
  readonly subject: string;

  constructor(kind: "unsupported" | "malformed", term: string, subject: string, message: string) {
    super(message);
    this.kind = kind;
    this.term = term;
    this.subject = subject;
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
