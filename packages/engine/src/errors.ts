// The two ways the engine says no to an input.

/** The input is malformed: a missing field, an unknown holder, a bad number. */
export class InputError extends Error {
  override name = "InputError";
  readonly path: string;

  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.path = path;
  }
}

/** When a refused term arrives: a milestone, or "later" for a term that waits until a case needs it. */
export type Milestone = "M5" | "later";

/**
 * The input uses a term the engine doesn't model yet. It is refused, never
 * skipped: ignoring a warrant or a dividend would give a wrong answer that
 * looks right.
 */
/**
 * The engine couldn't settle on an answer at an exit value: option exercise
 * didn't settle, solving from one end went round in a circle (E15), or a
 * conversion group's vote had no single comparison (E17). The engine stops
 * rather than guessing.
 */
export class NoAnswerError extends Error {
  override name = "NoAnswerError";
}

export class UnsupportedTermError extends Error {
  override name = "UnsupportedTermError";
  readonly term: string;
  readonly milestone: Milestone;
  readonly path: string;

  constructor(term: string, milestone: Milestone, path: string, what: string) {
    const when = milestone === "later" ? "once a case needs it" : `from ${milestone}`;
    super(`${path}: ${what}. The engine supports this ${when}; until then it refuses the input rather than ignoring the term.`);
    this.term = term;
    this.milestone = milestone;
    this.path = path;
  }
}
