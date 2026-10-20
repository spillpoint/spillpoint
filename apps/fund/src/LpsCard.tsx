// The LPs' card on Payouts (plan, "The LPs' card, on Payouts", f02c): one row an LP, its share and its amounts as it
// would be paid, rounded down to the cent; then what rounding down leaves, and the LPs' own amounts, which match the
// rest of the page. Only for a fund with LPs; at the NAV point it follows the NAV split, its clawback included.

import { useRef } from "react";
import type { Ref } from "react";
import type { Split } from "spillpoint-fund";

import { cents, xText } from "./format.ts";
import { useNarrow, useTooWide } from "./layout.ts";
import { LEFTOVER, lpsTable, TOTAL } from "./lpsCard.ts";
import type { LpsTable } from "./lpsCard.ts";

const NONE = "—";

/** The rows as the card shows them: each LP, the leftover and the total, with their share and their amounts. */
function cardRows(table: LpsTable) {
  return [
    ...table.rows.map((r) => ({ name: r.name, share: r.share, amounts: r.amounts, kind: "lp" as const })),
    { name: LEFTOVER, share: NONE, amounts: table.leftover, kind: "leftover" as const },
    { name: TOTAL, share: "100%", amounts: table.total, kind: "total" as const },
  ];
}

/** The card as one table, each LP a row. */
function WideLps({ ref, table }: { ref: Ref<HTMLTableElement>; table: LpsTable }) {
  const rows = cardRows(table);
  const body = rows.filter((r) => r.kind !== "total");
  const total = rows.at(-1)!;
  return (
    <table ref={ref} className="split lps-card">
      <thead>
        <tr>
          {table.headings.map((h, i) => (
            <th key={h} scope="col" className={i === 0 ? undefined : "num"}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((r) => (
          <tr key={r.name} className={r.kind === "leftover" ? "lps-card__leftover" : undefined}>
            <th scope="row" className="lps-card__name">
              {r.name}
            </th>
            <td className="num">{r.share}</td>
            {r.amounts.map((a, i) => (
              <td key={i} className="num">
                {cents(a)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">{total.name}</th>
          <td className="num">{total.share}</td>
          {total.amounts.map((a, i) => (
            <td key={i} className="num">
              {cents(a)}
            </td>
          ))}
        </tr>
      </tfoot>
    </table>
  );
}

/** The card on a narrow screen: each LP a group, its name on its own line, wrapping, each amount under it beside its column's name. */
function NarrowLps({ table }: { table: LpsTable }) {
  const rows = cardRows(table);
  const group = (r: (typeof rows)[number]) => (
    <>
      <tr>
        <th scope="rowgroup" colSpan={2} className="lps-card__name">
          {r.name}
        </th>
      </tr>
      {[table.headings[1]!, ...table.headings.slice(2)].map((h, i) => (
        <tr key={h}>
          <td>{h}</td>
          <td className="num">{i === 0 ? r.share : cents(r.amounts[i - 1]!)}</td>
        </tr>
      ))}
    </>
  );
  return (
    <table className="split split--narrow lps-card lps-card--narrow">
      <thead className="visually-hidden">
        <tr>
          <th scope="col">What</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      {rows
        .filter((r) => r.kind !== "total")
        .map((r) => (
          <tbody key={r.name} className={r.kind === "leftover" ? "lps-card__leftover" : undefined}>
            {group(r)}
          </tbody>
        ))}
      <tfoot>{group(rows.at(-1)!)}</tfoot>
    </table>
  );
}

interface Props {
  /** The card's split: X's, or at NAV the NAV split, final by definition (F14). */
  split: Split;
  onDownload: (table: LpsTable) => void;
}

export function LpsCard({ split, onDownload }: Props) {
  const table = lpsTable(split);
  const box = useRef<HTMLDivElement>(null);
  const wide = useRef<HTMLTableElement>(null);
  const phone = useNarrow();
  const tooWide = useTooWide(box, wide, table);
  const narrow = phone || tooWide;
  return (
    <section className="card" aria-labelledby="lps-card-heading">
      <h2 id="lps-card-heading">Each LP at {xText(split.x)}</h2>
      <div ref={box}>
        {narrow ? (
          <>
            <NarrowLps table={table} />
            {/* The one table, out of sight and out of the accessibility tree, measured to see when it fits again. */}
            <div className="split__measure" aria-hidden="true">
              <WideLps ref={wide} table={table} />
            </div>
          </>
        ) : (
          <div className="table-scroll">
            <WideLps ref={wide} table={table} />
          </div>
        )}
      </div>
      <p className="footnote">
        Each LP's amount is rounded down to the cent, as it would be paid; the leftover row is what rounding down leaves. Shares
        are rounded for display; every amount is worked from the exact share.
      </p>
      <div className="flows__actions">
        <button type="button" className="button" onClick={() => onDownload(table)}>
          Download as CSV
        </button>
      </div>
    </section>
  );
}
