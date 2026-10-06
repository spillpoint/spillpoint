// Reading a whole case's inputs.json: an exit on a cap table given in full,
// or, for a case built from its rounds, on the cap table after one of its own
// events (C2), which the engine builds from the events (M4e). Millrace's exit
// runs on the post–Series B table this way, never on a table copied from
// expected.json.

import { InputError, UnsupportedTermError } from "./errors.ts";
import { object, readExit, readExitOn } from "./input.ts";
import type { ExitInput } from "./model.ts";
import { buildCapTables } from "./rounds.ts";

export function readCase(value: unknown): ExitInput {
  const inputs = object(value, "inputs");
  if (inputs.exit == null) {
    throw new InputError("inputs", inputs.events != null ? "a round case with no exit to run; buildCapTables builds its cap tables" : "no exit to run");
  }
  if (inputs.events == null) return readExit(inputs.exit, undefined, "exit");

  // Every event is built and checked, even after the one the exit runs on.
  const built = buildCapTables(inputs);
  return readExitOn(
    inputs.exit,
    (eventId, at) => {
      const after = built.find((t) => t.event === eventId);
      if (!after) throw new InputError(at, `no event ${eventId} in inputs.events`);
      // Refused at exit until M5, as on a cap table given in full (C8, C9).
      if (after.unconvertedSafes.length > 0) {
        throw new UnsupportedTermError("unconverted_safe", "M5", at, `SAFEs still outstanding at exit (X1): ${after.unconvertedSafes.map((f) => f.id).join(", ")}`);
      }
      if (after.unconvertedNotes.length > 0) {
        throw new UnsupportedTermError(
          "unconverted_note", "M5", at, `Convertible notes still outstanding at exit (X3, X10–X12): ${after.unconvertedNotes.map((n) => n.id).join(", ")}`,
        );
      }
      return after.capTable;
    },
    "exit",
  );
}
