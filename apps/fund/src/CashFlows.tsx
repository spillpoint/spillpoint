// The fund behind the answers: its cash flows and the facts about D (SPEC.md, "Inputs"), as entered. Read-only for
// now; the table becomes a form in its own step (plan, "The cash flows: a table").

import type { Fund } from "spillpoint-fund";

import { cents, dateText } from "./format.ts";

const KINDS = { investment: "Investment", fee: "Fee", expense: "Expense" } as const;

export function CashFlows({ fund }: { fund: Fund }) {
  // As entered (FA12): the engine orders them by F4 to run them, and keeps each one's place in the input.
  const rows = [...fund.cashFlows].sort((a, b) => a.index - b.index);
  return (
    <section className="card" aria-labelledby="flows-heading">
      <h2 id="flows-heading">Cash flows</h2>
      <p className="card__intro">Every call and distribution before X, in the order entered. Read-only for now.</p>
      <dl className="facts">
        <div>
          <dt>As of</dt>
          <dd>{dateText(fund.asOf)}</dd>
        </div>
        <div>
          <dt>Distribution date (D)</dt>
          <dd>{dateText(fund.distributionDate)}</dd>
        </div>
        <div>
          <dt>This is the fund's last distribution</dt>
          <dd>{fund.final ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>NAV on D</dt>
          <dd>{fund.nav ? cents(fund.nav) : "None given"}</dd>
        </div>
      </dl>
      <div className="table-scroll">
        <table className="split flows">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Type</th>
              <th scope="col">Kind</th>
              <th scope="col" className="num">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.index}>
                <td>{dateText(f.date)}</td>
                <td>{f.type === "call" ? "Call" : "Distribution"}</td>
                <td>{f.kind ? KINDS[f.kind] : "—"}</td>
                <td className="num">{cents(f.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
