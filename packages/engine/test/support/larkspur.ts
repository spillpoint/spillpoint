// Larkspur at a sale with more SAFEs, for timing the breakpoint search (05c4; Jordan, after #71): edge case 13j's table,
// or 12j's without the note, with Larkspur's two post-money SAFEs and more like them, $250,000 each at its $12M cap,
// each held by a holder of its own. Equal SAFEs are the hardest case for a solver that weighs every combination of them.

import { readCaseFile } from "./cases.ts";

type Json = Record<string, unknown>;

/** The exit input: Larkspur at a sale with `safes` post-money SAFEs (at least its own two), with or without its note. */
export function larkspurWithSafes(safes: number, withNote: boolean): Json {
  const name = withNote ? "edge-13j-larkspur-at-a-sale" : "edge-12j-larkspur-safes-at-a-sale";
  const exit = structuredClone((readCaseFile(name, "inputs.json") as { exit: Json }).exit);
  const ct = exit.cap_table as { holders: Json[]; unconverted_safes: Json[] };
  for (let i = ct.unconverted_safes.length + 1; i <= safes; i++) {
    ct.holders.push({ id: `sh-safe-${i}`, name: `SAFE Investor ${i}` });
    ct.unconverted_safes.push({ id: `safe-${i}`, holder: `sh-safe-${i}`, purchase_amount: "250000", post_money_cap: "12000000", discount: "0.2" });
  }
  return { ...exit, exit_values: [] };
}
