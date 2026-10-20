// The LPs tab (plan, "0.2.0: the LPs", f02c): one row an LP, its name and its commitment, in the order listed (F19).
// Each change runs the engine again; a refusal shows under the cell its path names, and at the top of the tab with
// "Show me". Rows can be pasted from a spreadsheet, into the box under the table or into a cell, as the cash flows
// can.

import { useEffect, useMemo, useRef, useState } from "react";

import { marks, ProblemText } from "./CashFlows.tsx";
import { exactDollars } from "./format.ts";
import { lpPasteSummary, readLpPaste } from "./lpPaste.ts";
import type { PastedLp } from "./lpPaste.ts";
import type { LpRow, LpsForm } from "./lps.ts";
import { isEmptyLp, lpsSummary, nameOf, newLp } from "./lps.ts";
import { isManyCells } from "./Paste.tsx";
import type { Problem } from "./terms.ts";

interface Props {
  form: LpsForm;
  problem: Problem | null;
  onForm: (form: LpsForm) => void;
  onShow: (path: string) => void;
}

export function Lps({ form, problem, onForm, onShow }: Props) {
  const setRow = (i: number, row: LpRow) => onForm({ rows: form.rows.map((r, j) => (j === i ? row : r)) });
  // An LP added is one to fill in: its name takes the focus once it's there.
  const [focusing, setFocusing] = useState<string | null>(null);
  useEffect(() => {
    if (focusing === null) return;
    document.getElementById(focusing)?.focus();
    setFocusing(null);
  }, [focusing, form]);
  const at = (i: number) => `lps[${i}]`;
  const [paste, setPaste] = useState<string | null>(null);
  const pasteButton = useRef<HTMLButtonElement>(null);
  const cancelPaste = () => {
    setPaste(null);
    pasteButton.current?.focus();
  };
  /** More than one cell pasted into a cell goes to the paste box, not into the cell. */
  const pasteIntoCell = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (!isManyCells(text)) return;
    e.preventDefault();
    setPaste(text);
  };
  /** The LPs read, after those already there, in the order pasted; empty rows give way to them. */
  const add = (pasted: PastedLp[]) => {
    const rows = pasted.map((r) => ({ ...newLp(), name: r.name, commitment: exactDollars(r.commitment) }));
    onForm({ rows: [...form.rows.filter((r) => !isEmptyLp(r)), ...rows] });
    setPaste(null);
  };
  return (
    <section className="card" aria-labelledby="lps-heading">
      <h2 id="lps-heading">LPs</h2>
      <p className="card__intro">
        Each LP's name and commitment, in the order you list them. Every LP is on the same terms, so each gets its commitment's
        share of what the LPs get.
      </p>
      {problem && (
        <div className="notice notice--problem" role="status">
          <strong>The fund can't run as it is.</strong> {problem.message}{" "}
          <button type="button" className="link-button" onClick={() => onShow(problem.path)}>
            Show me
          </button>
        </div>
      )}
      {form.rows.length > 0 && (
        <div className="table-scroll lps__scroll">
          <table className="split lps">
            <thead>
              <tr>
                <th scope="col">Row</th>
                <th scope="col">Name</th>
                <th scope="col" className="num">
                  Commitment
                </th>
                <th scope="col">
                  <span className="visually-hidden">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {form.rows.map((r, i) => (
                <tr key={r.id}>
                  <th scope="row" className="lps__n">
                    {i + 1}
                  </th>
                  <td className="lps__name-cell">
                    <input
                      id={`${at(i)}.name`}
                      className="lps__name"
                      type="text"
                      value={r.name}
                      onChange={(e) => setRow(i, { ...r, name: e.target.value })}
                      // FA17: the page reads a name trimmed; the box shows it so once it's left.
                      onBlur={() => r.name !== nameOf(r.name) && setRow(i, { ...r, name: nameOf(r.name) })}
                      onPaste={pasteIntoCell}
                      aria-label={`LP ${i + 1}'s name`}
                      {...marks(problem, `${at(i)}.name`)}
                    />
                    <ProblemText problem={problem} path={`${at(i)}.name`} />
                  </td>
                  <td className="num lps__commitment-cell">
                    <input
                      id={`${at(i)}.commitment`}
                      className="lps__commitment"
                      type="text"
                      inputMode="decimal"
                      value={r.commitment}
                      onChange={(e) => setRow(i, { ...r, commitment: e.target.value })}
                      onPaste={pasteIntoCell}
                      aria-label={`LP ${i + 1}'s commitment`}
                      {...marks(problem, `${at(i)}.commitment`)}
                    />
                    <ProblemText problem={problem} path={`${at(i)}.commitment`} />
                  </td>
                  <td className="lps__remove">
                    <button type="button" className="link-button" aria-label={`Remove LP ${i + 1}`} onClick={() => onForm({ rows: form.rows.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="lps__summary">{lpsSummary(form)}</p>
      <div className="flows__actions">
        <button
          id="lps"
          type="button"
          className="button"
          onClick={() => {
            onForm({ rows: [...form.rows, newLp()] });
            setFocusing(`${at(form.rows.length)}.name`);
          }}
        >
          Add an LP
        </button>
        <button ref={pasteButton} type="button" className="button" aria-expanded={paste !== null} onClick={() => setPaste(paste ?? "")}>
          Paste rows from a spreadsheet
        </button>
      </div>
      {paste !== null && (
        <LpPasteBox
          text={paste}
          onText={setPaste}
          inTable={form.rows.map((r) => nameOf(r.name)).filter((n) => n !== "")}
          here={form.rows.filter((r) => !isEmptyLp(r)).length}
          onAdd={add}
          onCancel={cancelPaste}
        />
      )}
    </section>
  );
}

interface PasteProps {
  text: string;
  onText: (text: string) => void;
  /** The names already in the table, as the page reads them. */
  inTable: string[];
  /** Rows already in the table with anything in them. */
  here: number;
  onAdd: (rows: PastedLp[]) => void;
  onCancel: () => void;
}

/** "Paste rows from a spreadsheet" for LPs: a box, and a preview of the LPs as read; nothing changes until "Add them". */
function LpPasteBox({ text, onText, inTable, here, onAdd, onCancel }: PasteProps) {
  const read = useMemo(() => readLpPaste(text, inTable), [text, inTable]);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    box.current?.focus();
    box.current?.scrollIntoView?.({ block: "center" });
  }, []);
  return (
    <section
      className="paste"
      aria-labelledby="lp-paste-heading"
      // Escape closes the box as "Cancel" does.
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onCancel();
      }}
    >
      <h3 id="lp-paste-heading">Paste rows from a spreadsheet</h3>
      <p className="paste__how">
        Copy the rows in your spreadsheet, its columns name and commitment in that order, and paste them here. A header row is
        skipped. Nothing is added until “Add them”.
      </p>
      <textarea
        ref={box}
        className="paste__text"
        rows={6}
        value={text}
        onChange={(e) => onText(e.target.value)}
        aria-label="The LPs, pasted"
        spellCheck={false}
        wrap="off"
      />
      {text.trim() !== "" && (
        <div className="paste__preview" role="status">
          <p className="paste__summary">{lpPasteSummary(read, here)}</p>
          {read.unread.length > 0 && (
            <>
              <p className="paste__unread-intro">
                {read.unread.length === 1 ? "1 row it can't read, which won't be added:" : `${read.unread.length} rows it can't read, which won't be added:`}
              </p>
              <ul className="paste__unread" aria-label="Rows it can't read">
                {read.unread.map((why) => (
                  <li key={why}>{why}.</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="flows__actions">
        <button type="button" className="button" disabled={read.rows.length === 0} onClick={() => onAdd(read.rows)}>
          Add them
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
