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

/** The milestones that add the terms the engine refuses for now. */
export type Milestone = "M4" | "M5";

/**
 * The input uses a term the engine doesn't model yet. It is refused, never
 * skipped: ignoring a warrant or a dividend would give a wrong answer that
 * looks right.
 */
export class UnsupportedTermError extends Error {
  override name = "UnsupportedTermError";
  readonly term: string;
  readonly milestone: Milestone;
  readonly path: string;

  constructor(term: string, milestone: Milestone, path: string, what: string) {
    super(
      `${path}: ${what}. The engine supports this from ${milestone}; until then it refuses the input ` +
        "rather than ignoring the term.",
    );
    this.term = term;
    this.milestone = milestone;
    this.path = path;
  }
}
