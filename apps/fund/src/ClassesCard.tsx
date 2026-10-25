// The classes card on Payouts (plan, "Payouts", f03c): with two or more accounts, one row an account, the fund's terms
// first, with its own split (F23, F26). At the NAV point it follows the NAV split, as the LPs' card does.

import type { Split } from "spillpoint-fund";

import { CardTable } from "./CardTable.tsx";
import { classesTable } from "./classesCard.ts";
import { xText } from "./format.ts";

export function ClassesCard({ split }: { split: Split }) {
  const table = classesTable(split);
  return (
    <section className="card" aria-labelledby="classes-card-heading">
      <h2 id="classes-card-heading">Each class at {xText(split.x)}</h2>
      <CardTable headings={table.headings} rows={table.rows.map((r) => ({ ...r, kind: "row" }))} />
      <p className="footnote">
        Each class runs the waterfall on its own part of every call and distribution, with its own fee rate and carry; the split
        above is their sum. Each amount is rounded on its own, so a column can differ from the split's by a cent.
      </p>
    </section>
  );
}
