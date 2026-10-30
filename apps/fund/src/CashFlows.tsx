// The Cash flows tab (plan, "The cash flows: a table", f01j): the facts about D above, then every call and distribution
// before X, as entered (FA12). Each change runs the engine again; a refusal shows in the cell its path names, a
// cash flow's own in its row, and at the top of the tab with "Show me". Rows can be pasted from a spreadsheet (f01k),
// into the box under the table, or into a cell, which sends a paste of more than one cell to the same box. From 0.4.0,
// with a management fee schedule, Fee isn't a kind to choose, and the schedule's fee calls show under the table (F30,
// F31). From 0.5.0 a distribution's From and Share sold, and a write-off with its investment and no amount (F33).

import { Fragment, useEffect, useRef, useState } from "react";
import { D } from "spillpoint-fund";
import type { CallKind, FeeCall } from "spillpoint-fund";

import { CardTable } from "./CardTable.tsx";
import type { FlowRow, FlowsForm } from "./flows.ts";
import { isEmptyRow, newRow, sortByDate } from "./flows.ts";
import { cents, dateText, exactDollars } from "./format.ts";
import type { InvestmentRow } from "./investments.ts";
import { investmentLabel, investmentOf } from "./investments.ts";
import type { PasteState } from "./Paste.tsx";
import { isManyCells, PasteBox } from "./Paste.tsx";
import type { PastedRow } from "./paste.ts";
import type { Problem } from "./terms.ts";
import { controlFor, isAt } from "./terms.ts";

/** None, in a cell or a picker. */
const NONE = "—";

const KINDS: { kind: CallKind; text: string }[] = [
  { kind: "investment", text: "Investment" },
  { kind: "fee", text: "Fee" },
  { kind: "expense", text: "Expense" },
];

/** The schedule's fee calls as the tab shows them under its table (F31), or why there are none to show. */
export interface ScheduleView {
  /** The engine's calls, in date order; null while the fund can't run, since they're the engine's. */
  calls: readonly FeeCall[] | null;
  /** The schedule's start, for a schedule that starts after D. */
  start: string;
  /** The GP commitment pays fees, so its part of each call shows (F3). */
  gpPart: boolean;
}

interface Props {
  form: FlowsForm;
  problem: Problem | null;
  onForm: (form: FlowsForm) => void;
  onShow: (path: string) => void;
  /** With a management fee schedule (F30): its calls, under the table; null with fees entered as fee calls. */
  schedule: ScheduleView | null;
  /** F34: deal by deal, every distribution comes from an investment, so "—" isn't offered on one. */
  dealByDeal: boolean;
}

/** A refusal's words, where its path names, or one of its others. The LPs tab's cells show theirs the same way. */
export function ProblemText({ problem, path }: { problem: Problem | null; path: string }) {
  if (!isAt(problem, path)) return null;
  return (
    <p id={`${controlFor(path)}-problem`} className="field-error" role="alert">
      {problem!.message}
    </p>
  );
}

/** What a control needs to say it has the problem: the problem's words describe it. */
export function marks(problem: Problem | null, id: string) {
  const mine = problem !== null && [problem.path, ...(problem.also ?? [])].some((p) => controlFor(p) === id);
  return { "aria-invalid": mine, "aria-describedby": mine ? `${id}-problem` : undefined };
}

interface PickerProps {
  id: string;
  /** For a cell, whose label is for screen readers only: "Row 6's investment". */
  label?: string | undefined;
  value: number | null;
  rows: readonly InvestmentRow[];
  /** "—" for none is offered: on a distribution, on the whole fund. Elsewhere only while it's chosen, to show it. */
  offerNone: boolean;
  problem: Problem | null;
  onChange: (id: number | null) => void;
}

/** An investment to choose, by its row (F33): each by name, or "Investment 2" while it has none. */
export function InvestmentPicker({ id, label, value, rows, offerNone, problem, onChange }: PickerProps) {
  const chosen = investmentOf(rows, value);
  return (
    <select id={id} value={chosen ? String(chosen.id) : ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} aria-label={label} {...marks(problem, id)}>
      {(offerNone || chosen === null) && <option value="">{NONE}</option>}
      {rows.map((r) => (
        <option key={r.id} value={r.id}>
          {investmentLabel(rows, r)}
        </option>
      ))}
    </select>
  );
}


export function CashFlows({ form, problem, onForm, onShow, schedule, dealByDeal }: Props) {
  // F30: with a schedule, the schedule works out the fee calls, so Fee isn't a kind to choose. A row already of kind
  // Fee keeps it in its own picker, to show what it is, with the problem under it.
  const kinds = (r: FlowRow) => KINDS.filter((k) => !schedule || k.kind !== "fee" || r.kind === "fee");
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
  const pasteButton = useRef<HTMLButtonElement>(null);
  /** "Cancel", or Escape: the box closes, the table as it was, and the focus goes back to the button that opened it. */
  const cancelPaste = () => {
    setPaste(null);
    pasteButton.current?.focus();
  };
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
      <p className="card__intro">Every call, distribution and write-off before X, in the order entered. Amounts in dollars: 8000000, $8,000,000 or $8M.</p>
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

      <div className="table-scroll flows__scroll">
        <table className="split flows">
          <thead>
            <tr>
              <th scope="col">Row</th>
              <th scope="col">Date</th>
              <th scope="col">Type</th>
              {/* A call's kind, or a distribution's or write-off's investment: a row has one or the other (F33). */}
              <th scope="col">Kind / From</th>
              <th scope="col">Share sold</th>
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
                <tr className={`flows__row--${r.type}`}>
                  <th scope="row" className="flows__n">{i + 1}</th>
                  <td className="flows__date">
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
                  <td className="flows__type">
                    <select id={`${at(i)}.type`} value={r.type} onChange={(e) => setRow(i, { ...r, type: e.target.value as FlowRow["type"] })} aria-label={`Row ${i + 1}'s type`}>
                      <option value="call">Call</option>
                      <option value="distribution">Distribution</option>
                      <option value="write_off">Write-off</option>
                    </select>
                  </td>
                  <td className="flows__kind">
                    {r.type === "call" ? (
                      <select
                        id={`${at(i)}.kind`}
                        value={r.kind}
                        onChange={(e) => setRow(i, { ...r, kind: e.target.value as CallKind })}
                        aria-label={`Row ${i + 1}'s kind`}
                        {...marks(problem, `${at(i)}.kind`)}
                      >
                        {kinds(r).map((k) => (
                          <option key={k.kind} value={k.kind}>
                            {k.text}
                          </option>
                        ))}
                      </select>
                    ) : (
                      // FA12: a distribution has no kind, nor has a write-off; each has the investment it's from (F33).
                      <>
                        <InvestmentPicker
                          id={`${at(i)}.investment`}
                          label={`Row ${i + 1}'s investment`}
                          value={r.from}
                          rows={form.investments}
                          // F37: a write-off names the investment it ends, and deal by deal a distribution the one it comes from.
                          offerNone={r.type === "distribution" && !dealByDeal}
                          problem={problem}
                          onChange={(from) => setRow(i, { ...r, from })}
                        />
                        <ProblemText problem={problem} path={`${at(i)}.investment`} />
                      </>
                    )}
                  </td>
                  <td className={`flows__share${r.type === "distribution" && investmentOf(form.investments, r.from) ? "" : " flows__na"}`}>
                    {r.type === "distribution" && investmentOf(form.investments, r.from) ? (
                      // F33: a share of what's left of its investment, only with one.
                      <>
                        <span className="terms__percent">
                          <input
                            id={`${at(i)}.share`}
                            className="flows__share-box"
                            type="text"
                            inputMode="decimal"
                            value={r.share}
                            onChange={(e) => setRow(i, { ...r, share: e.target.value })}
                            aria-label={`Row ${i + 1}'s share sold`}
                            {...marks(problem, `${at(i)}.share`)}
                          />
                          <span aria-hidden="true">%</span>
                        </span>
                        <ProblemText problem={problem} path={`${at(i)}.share`} />
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className={`num flows__amount-cell${r.type === "write_off" ? " flows__na" : ""}`}>
                    {r.type === "write_off" ? (
                      // F33: a write-off has no amount: nothing is distributed.
                      <span className="muted">—</span>
                    ) : (
                      <>
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
                      </>
                    )}
                  </td>
                  <td className="flows__remove">
                    <button type="button" className="link-button" aria-label={`Remove row ${i + 1}`} onClick={() => onForm({ ...form, rows: form.rows.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </td>
                </tr>
                {/* A cash flow's own problem, against the others or D, in its row; with a schedule, a Fee row's, at its kind. */}
                {[at(i), `${at(i)}.kind`]
                  .filter((p) => isAt(problem, p))
                  .map((p) => (
                    <tr key={p} className="flows__problem">
                      <td />
                      <td colSpan={6}>
                        <ProblemText problem={problem} path={p} />
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <ProblemText problem={problem} path="cash_flows" />
      <p className="footnote">
        On one date, calls run first, then the investments' checks, then write-offs, then distributions in the order shown
        here. “Sort by date” keeps that order within a date.
      </p>
      <div className="flows__actions">
        <button
          id="cash_flows"
          type="button"
          className="button"
          onClick={() => {
            // A new row copies the kind of the one above, but with a schedule not Fee.
            const row = newRow(form.rows.at(-1));
            onForm({ ...form, rows: [...form.rows, schedule && row.kind === "fee" ? { ...row, kind: "investment" } : row] });
            setFocusing(`${at(form.rows.length)}.date`);
          }}
        >
          Add a cash flow
        </button>
        <button type="button" className="button" onClick={() => onForm(sortByDate(form))}>
          Sort by date
        </button>
        <button ref={pasteButton} type="button" className="button" aria-expanded={paste !== null} onClick={() => setPaste(paste ?? { text: "", order: "month-first" })}>
          Paste rows from a spreadsheet
        </button>
      </div>
      {paste && <PasteBox paste={paste} onPaste={setPaste} here={form.rows.filter((r) => !isEmptyRow(r)).length} onAdd={add} onCancel={cancelPaste} scheduled={schedule !== null} />}
      {schedule && <ScheduleCalls schedule={schedule} />}
    </section>
  );
}

/**
 * The schedule's fee calls (F31), read-only, under the table: each call's date, the days it covers, the call, and the
 * GP commitment's part when it pays fees (F3); then a total. To the cent, as the split table's amounts. One table where
 * it fits, and on a phone each call a card, as Payouts' cards are.
 */
function ScheduleCalls({ schedule }: { schedule: ScheduleView }) {
  const { calls, start, gpPart } = schedule;
  const sum = (f: (c: FeeCall) => D) => (calls ?? []).reduce((t, c) => t.plus(f(c)), new D(0));
  const amounts = (call: D, gp: D) => (gpPart ? [cents(call), cents(gp)] : [cents(call)]);
  return (
    <section className="flows__schedule" aria-labelledby="schedule-heading">
      <h3 id="schedule-heading">The schedule's fee calls</h3>
      <p className="classes__line">Worked out from the schedule on the Terms tab, and run as fee calls. They aren't rows of the table above.</p>
      {calls === null ? (
        <p className="classes__line">The schedule's fee calls show here once the fund can run.</p>
      ) : calls.length === 0 ? (
        <p className="classes__line">No fee call yet: fees start on {dateText(start)}.</p>
      ) : (
        <CardTable
          headings={["Date", "Covers", "Call", ...(gpPart ? ["The GP commitment's part"] : [])]}
          wordColumns={1}
          rows={[
            ...calls.map((c) => ({ name: dateText(c.date), cells: [`${dateText(c.firstDay)} to ${dateText(c.lastDay)}`, ...amounts(c.call, c.gpCommitment)], kind: "row" as const })),
            { name: "Total", cells: [calls.length === 1 ? "1 call" : `${calls.length} calls`, ...amounts(sum((c) => c.call), sum((c) => c.gpCommitment))], kind: "total" as const },
          ]}
        />
      )}
    </section>
  );
}
