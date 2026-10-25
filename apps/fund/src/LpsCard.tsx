// The LPs' card on Payouts (plan, "The LPs' card, on Payouts", f02c): one row an LP, its share and its amounts as it
// would be paid, rounded down to the cent; then what rounding down leaves, and the LPs' own amounts, which match the
// rest of the page. With classes, each LP's class beside its name (f03c). Only for a fund with LPs; at the NAV point it
// follows the NAV split, its clawback included.

import type { Split } from "spillpoint-fund";

import { CardTable } from "./CardTable.tsx";
import type { CardRow } from "./CardTable.tsx";
import { cents, xText } from "./format.ts";
import { LEFTOVER, lpsTable, TOTAL } from "./lpsCard.ts";
import type { LpsTable } from "./lpsCard.ts";

const NONE = "—";

/** The rows as the card shows them: each LP, the leftover and the total, with their class, share and amounts. */
function cardRows(table: LpsTable): CardRow[] {
  const cls = (c: string | null) => (table.classes ? [c ?? ""] : []);
  return [
    ...table.rows.map((r) => ({ name: r.name, cells: [...cls(r.class), r.share, ...r.amounts.map(cents)], kind: "row" as const })),
    { name: LEFTOVER, cells: [...cls(null), NONE, ...table.leftover.map(cents)], kind: "leftover" as const },
    { name: TOTAL, cells: [...cls(null), "100%", ...table.total.map(cents)], kind: "total" as const },
  ];
}

interface Props {
  /** The card's split: X's, or at NAV the NAV split, final by definition (F14). */
  split: Split;
  onDownload: (table: LpsTable) => void;
}

export function LpsCard({ split, onDownload }: Props) {
  const table = lpsTable(split);
  return (
    <section className="card" aria-labelledby="lps-card-heading">
      <h2 id="lps-card-heading">Each LP at {xText(split.x)}</h2>
      <CardTable headings={table.headings} rows={cardRows(table)} wordColumns={table.classes ? 1 : 0} />
      <p className="footnote">
        Each LP's amount is rounded down to the cent, as it would be paid; the leftover row is what rounding down leaves.{" "}
        {table.classes
          ? "Shares are of all the LPs' commitments, rounded for display; an LP in a class gets its commitment's part of its class's amounts."
          : "Shares are rounded for display; every amount is worked from the exact share."}
      </p>
      <div className="flows__actions">
        <button type="button" className="button" onClick={() => onDownload(table)}>
          Download as CSV
        </button>
      </div>
    </section>
  );
}
