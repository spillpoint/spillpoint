// The Cash flows tab (plan, "The cash flows: a table", f01j): the facts about D above, then every call and distribution
// before X, as entered (FA12). Each change runs the engine again; a refusal shows in the cell its path names, a
// cash flow's own in its row, and at the top of the tab with "Show me". Rows can be pasted from a spreadsheet (f01k),
// into the box under the table, or into a cell, which sends a paste of more than one cell to the same box.

import { Fragment, useEffect, useState } from "react";
import type { CallKind } from "spillpoint-fund";

import type { FlowRow, FlowsForm } from "./flows.ts";
import { isEmptyRow, newRow, sortByDate } from "./flows.ts";
import { exactDollars } from "./format.ts";
import type { PasteState } from "./Paste.tsx";
import { isManyCells, PasteBox } from "./Paste.tsx";
import type { PastedRow } from "./paste.ts";
import type { Problem } from "./terms.ts";
import { controlFor } from "./terms.ts";

const KINDS: { kind: CallKind; text: string }[] = [
  { kind: "investment", text: "Investment" },
  { kind: "fee", text: "Fee" },
  { kind: "expense", text: "Expense" },
];

interface Props {
  form: FlowsForm;
  problem: Problem | null;
  onForm: (form: FlowsForm) => void;
  onShow: (path: string) => void;
}

/** A refusal's words, where its path names. */
function ProblemText({ problem, path }: { problem: Problem | null; path: string }) {
  if (problem?.path !== path) return null;
  return (
    <p id={`${controlFor(path)}-problem`} className="field-error" role="alert">
      {problem.message}
    </p>
  );
}

/** What a control needs to say it has the problem: the problem's words describe it. */
function marks(problem: Problem | null, id: string) {
  const mine = problem !== null && controlFor(problem.path) === id;
  return { "aria-invalid": mine, "aria-describedby": mine ? `${id}-problem` : undefined };
}

export function CashFlows({ form, problem, onForm, onShow }: Props) {
  const setRow = (i: number, row: FlowRow) => onForm({ ...form, rows: form.rows.map((r, j) => (j === i ? row : r)) });
  // A row added is a row to fill in: its date takes the focus once it's there.
  const [focusing, setFocusing] = useState<string | null>(null);
  useEffect(() => {
    if (focusing === null) return;
    document.getElementById(focusing)?.focus();
    setFocusing(null);
  }, [focusing, form]);
  const at = (i: number) => `cash_flows[${i}]`;
  const [paste, setPaste] = useState<PasteState | null>(null);
  /** More than one cell pasted into a cell goes to the paste box, not into the cell. */
  const pasteIntoCell = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (!isManyCells(text)) return;
    e.preventDefault();
    setPaste({ text, order: "month-first" });
  };
  /** The rows read, after those already there, in the order pasted and not sorted; empty rows give way to them. */
  const add = (pasted: PastedRow[]) => {
    const rows = pasted.map((r) => ({ ...newRow(), date: r.date, type: r.type, kind: r.kind, amount: exactDollars(r.amount) }));
    onForm({ ...form, rows: [...form.rows.filter((r) => !isEmptyRow(r)), ...rows] });
    setPaste(null);
  };
  return (
    <section className="card" aria-labelledby="flows-heading">
      <h2 id="flows-heading">Cash flows</h2>
      <p className="card__intro">Every call and distribution before X, in the order entered. Amounts in dollars: 8000000, $8,000,000 or $8M.</p>
      {problem && (
        <div className="notice notice--problem" role="status">
          <strong>The fund can't run as it is.</strong> {problem.message}{" "}
          <button type="button" className="link-button" onClick={() => onShow(problem.path)}>
            Show me
          </button>
        </div>
      )}

      <div className="flows__facts">
        <div>
          <label htmlFor="as_of">As of</label>
          <input id="as_of" type="date" value={form.asOf} onChange={(e) => onForm({ ...form, asOf: e.target.value })} {...marks(problem, "as_of")} />
          <ProblemText problem={problem} path="as_of" />
        </div>
        <div>
          <label htmlFor="distribution_date">Distribution date (D)</label>
          <input
            id="distribution_date"
            type="date"
            value={form.distributionDate}
            onChange={(e) => onForm({ ...form, distributionDate: e.target.value })}
            {...marks(problem, "distribution_date")}
          />
          <span className="flows__hint">Empty: the as-of date.</span>
          <ProblemText problem={problem} path="distribution_date" />
        </div>
        <div>
          <label htmlFor="nav">NAV on D</label>
          <input id="nav" type="text" inputMode="decimal" value={form.nav} onChange={(e) => onForm({ ...form, nav: e.target.value })} {...marks(problem, "nav")} />
          <span className="flows__hint">If there is one.</span>
          <ProblemText problem={problem} path="nav" />
        </div>
        <label className="terms__check">
          <input type="checkbox" checked={form.final} onChange={(e) => onForm({ ...form, final: e.target.checked })} /> This is the fund's last distribution
        </label>
      </div>

      <div className="table-scroll">
        <table className="split flows">
          <thead>
            <tr>
              <th scope="col">Row</th>
              <th scope="col">Date</th>
              <th scope="col">Type</th>
              <th scope="col">Kind</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">
                <span className="visually-hidden">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {form.rows.map((r, i) => (
              <Fragment key={r.id}>
                <tr>
                  <th scope="row">{i + 1}</th>
                  <td>
                    <input
                      id={`${at(i)}.date`}
                      type="date"
                      value={r.date}
                      onChange={(e) => setRow(i, { ...r, date: e.target.value })}
                      onPaste={pasteIntoCell}
                      aria-label={`Row ${i + 1}'s date`}
                      {...marks(problem, `${at(i)}.date`)}
                    />
                    <ProblemText problem={problem} path={`${at(i)}.date`} />
                  </td>
                  <td>
                    <select id={`${at(i)}.type`} value={r.type} onChange={(e) => setRow(i, { ...r, type: e.target.value as FlowRow["type"] })} aria-label={`Row ${i + 1}'s type`}>
                      <option value="call">Call</option>
                      <option value="distribution">Distribution</option>
                    </select>
                  </td>
                  <td>
                    {r.type === "call" ? (
                      <select id={`${at(i)}.kind`} value={r.kind} onChange={(e) => setRow(i, { ...r, kind: e.target.value as CallKind })} aria-label={`Row ${i + 1}'s kind`}>
                        {KINDS.map((k) => (
                          <option key={k.kind} value={k.kind}>
                            {k.text}
                          </option>
                        ))}
                      </select>
                    ) : (
                      // FA12: a distribution has no kind.
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">
                    <input
                      id={`${at(i)}.amount`}
                      className="flows__amount"
                      type="text"
                      inputMode="decimal"
                      value={r.amount}
                      onChange={(e) => setRow(i, { ...r, amount: e.target.value })}
                      onPaste={pasteIntoCell}
                      aria-label={`Row ${i + 1}'s amount`}
                      {...marks(problem, `${at(i)}.amount`)}
                    />
                    <ProblemText problem={problem} path={`${at(i)}.amount`} />
                  </td>
                  <td>
                    <button type="button" className="link-button" aria-label={`Remove row ${i + 1}`} onClick={() => onForm({ ...form, rows: form.rows.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </td>
                </tr>
                {/* A cash flow's own problem, against the others or D, in its row. */}
                {problem?.path === at(i) && (
                  <tr className="flows__problem">
                    <td />
                    <td colSpan={5}>
                      <ProblemText problem={problem} path={at(i)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <ProblemText problem={problem} path="cash_flows" />
      <p className="footnote">
        On one date, calls run before distributions, and distributions run in the order shown here. “Sort by date” keeps that
        order within a date.
      </p>
      <div className="flows__actions">
        <button
          id="cash_flows"
          type="button"
          className="button"
          onClick={() => {
            onForm({ ...form, rows: [...form.rows, newRow(form.rows.at(-1))] });
            setFocusing(`${at(form.rows.length)}.date`);
          }}
        >
          Add a cash flow
        </button>
        <button type="button" className="button" onClick={() => onForm(sortByDate(form))}>
          Sort by date
        </button>
        <button type="button" className="button" aria-expanded={paste !== null} onClick={() => setPaste(paste ?? { text: "", order: "month-first" })}>
          Paste rows from a spreadsheet
        </button>
      </div>
      {paste && <PasteBox paste={paste} onPaste={setPaste} here={form.rows.filter((r) => !isEmptyRow(r)).length} onAdd={add} onCancel={() => setPaste(null)} />}
    </section>
  );
}
