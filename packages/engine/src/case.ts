// Reading a whole input, the shape of a case's inputs.json: an exit on a cap
// table given in full, or, for a company built from its rounds, on the cap
// table after one of its own events (C2), which the engine builds from the
// events (M4e). Millrace's exit runs on the post–Series B table this way,
// never on a table copied from expected.json. SAFEs and notes still
// outstanding there are paid at the sale.

import { InputError } from "./errors.ts";
import { checkSaleLimits, object, readExit, readExitOn } from "./input.ts";
import type { ExitInput } from "./model.ts";
import { buildCapTables } from "./rounds.ts";

export function readInputs(value: unknown): ExitInput {
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
      // SAFEs and notes still outstanding come with the table and are paid at the sale (C8, C9), within the limits a
      // sale puts on them (X12–X15), as on a table given in full.
      checkSaleLimits(after.capTable, at);
      return after.capTable;
    },
    "exit",
  );
}
