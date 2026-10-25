// The tables of Payouts' cards after the split (f02c, f03c): the LPs', the classes' and the equalization's. One row a
// name, its cells already written, then any leftover and total rows. As the split does, it's one table wherever it fits
// its card, and on a phone, or wherever it wouldn't fit, each row is a group: its name on its own line, wrapping, each
// cell under it beside its column's name.

import { useRef } from "react";
import type { Ref } from "react";

import { useNarrow, useTooWide } from "./layout.ts";

export interface CardRow {
  name: string;
  /** One a column after the name, as shown. */
  cells: string[];
  /** A leftover row is set apart; the total is the table's foot. */
  kind: "row" | "leftover" | "total";
}

interface Props {
  /** The name column's heading, then one a cell. */
  headings: string[];
  rows: CardRow[];
  /** Says what the table is, where a card has more than one. */
  caption?: string | undefined;
  /** How many cells after the name are words, set left, not amounts: the LPs' card's class. */
  wordColumns?: number | undefined;
}

/** A cell's class: an amount is set right, never wrapping; a word, as the name is. */
const cellClass = (i: number, words = 0) => (i < words ? undefined : "num");

/** The card's table as one table, each row a row. */
function Wide({ ref, headings, rows, caption, wordColumns }: Props & { ref: Ref<HTMLTableElement> }) {
  const body = rows.filter((r) => r.kind !== "total");
  const foot = rows.filter((r) => r.kind === "total");
  const line = (r: CardRow) => (
    <>
      <th scope="row" className="card-table__name">
        {r.name}
      </th>
      {r.cells.map((c, i) => (
        <td key={i} className={cellClass(i, wordColumns)}>
          {c}
        </td>
      ))}
    </>
  );
  return (
    <table ref={ref} className="split card-table">
      {caption && <caption>{caption}</caption>}
      <thead>
        <tr>
          {headings.map((h, i) => (
            <th key={h} scope="col" className={i === 0 ? undefined : cellClass(i - 1, wordColumns)}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((r, i) => (
          <tr key={i} className={r.kind === "leftover" ? "card-table__leftover" : undefined}>
            {line(r)}
          </tr>
        ))}
      </tbody>
      {foot.length > 0 && (
        <tfoot>
          {foot.map((r, i) => (
            <tr key={i}>{line(r)}</tr>
          ))}
        </tfoot>
      )}
    </table>
  );
}

/** The card's table on a narrow screen: each row a group, its name on its own line, each cell beside its column's name. */
function Narrow({ headings, rows, caption, wordColumns }: Props) {
  const group = (r: CardRow) => (
    <>
      <tr>
        <th scope="rowgroup" colSpan={2} className="card-table__name">
          {r.name}
        </th>
      </tr>
      {r.cells.map((c, i) => (
        <tr key={headings[i + 1]}>
          <td>{headings[i + 1]}</td>
          <td className={cellClass(i, wordColumns) ?? "card-table__word"}>{c}</td>
        </tr>
      ))}
    </>
  );
  return (
    <table className="split split--narrow card-table card-table--narrow">
      {caption && <caption>{caption}</caption>}
      <thead className="visually-hidden">
        <tr>
          <th scope="col">What</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      {rows
        .filter((r) => r.kind !== "total")
        .map((r, i) => (
          <tbody key={i} className={r.kind === "leftover" ? "card-table__leftover" : undefined}>
            {group(r)}
          </tbody>
        ))}
      {rows
        .filter((r) => r.kind === "total")
        .map((r, i) => (
          <tfoot key={i}>{group(r)}</tfoot>
        ))}
    </table>
  );
}

export function CardTable(props: Props) {
  const box = useRef<HTMLDivElement>(null);
  const wide = useRef<HTMLTableElement>(null);
  const phone = useNarrow();
  const tooWide = useTooWide(box, wide, props.rows);
  return (
    <div ref={box}>
      {phone || tooWide ? (
        <>
          <Narrow {...props} />
          {/* The one table, out of sight and out of the accessibility tree, measured to see when it fits again. */}
          <div className="split__measure" aria-hidden="true">
            <Wide ref={wide} {...props} />
          </div>
        </>
      ) : (
        <div className="table-scroll">
          <Wide ref={wide} {...props} />
        </div>
      )}
    </div>
  );
}
