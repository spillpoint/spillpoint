// The LPs tab (plan, "0.2.0: the LPs", f02c, and "0.3.0: classes and later closes", f03c): the classes, each with its
// name, its fee rate and its carry or the fund's (F22); then one row an LP, its name, its commitment, its class and its
// close (F25), in the order listed (F19). Each change runs the engine again; a refusal shows under the cell its path
// names, and at the top of the tab with "Show me". Rows can be pasted from a spreadsheet, into the box under the table
// or into a cell, as the cash flows can.

import { useEffect, useMemo, useRef, useState } from "react";

import { marks, ProblemText } from "./CashFlows.tsx";
import { Carry } from "./Fields.tsx";
import { exactDollars } from "./format.ts";
import { lpPasteSummary, readLpPaste } from "./lpPaste.ts";
import type { LpPasteRead, PastedLp } from "./lpPaste.ts";
import type { ClassRow, LpRow, LpsForm } from "./lps.ts";
import { classLabel, isEmptyLp, lpsSummary, nameOf, newClass, newLp, removeClass, removedLine } from "./lps.ts";
import type { Order } from "./paste.ts";
import { orderChoices } from "./paste.ts";
import { isManyCells } from "./Paste.tsx";
import type { CarryForm, Problem } from "./terms.ts";
import { toFlat, toSteps } from "./terms.ts";

interface Props {
  form: LpsForm;
  /** The fund's carry on Terms: a class's own carry starts from it. */
  fundCarry: CarryForm;
  problem: Problem | null;
  onForm: (form: LpsForm) => void;
  onShow: (path: string) => void;
}

/** A class's carry, as its picker has it: the fund's, or its own, flat or in steps. */
type CarryChoice = "fund" | "flat" | "steps";

export function Lps({ form, fundCarry, problem, onForm, onShow }: Props) {
  const setRow = (i: number, row: LpRow) => onForm({ ...form, rows: form.rows.map((r, j) => (j === i ? row : r)) });
  const setClass = (i: number, c: ClassRow) => onForm({ ...form, classes: form.classes.map((x, j) => (j === i ? c : x)) });
  // An LP or a class added is one to fill in: its name takes the focus once it's there.
  const [focusing, setFocusing] = useState<string | null>(null);
  useEffect(() => {
    if (focusing === null) return;
    document.getElementById(focusing)?.focus();
    setFocusing(null);
  }, [focusing, form]);
  const at = (i: number) => `lps[${i}]`;
  const classAt = (i: number) => `terms.lp_classes[${i}]`;
  // The line saying a removed class's LPs moved to Fund terms, until the next change.
  const [removed, setRemoved] = useState<{ text: string; after: LpsForm } | null>(null);
  const remove = (i: number) => {
    const name = classLabel(form, form.classes[i]!);
    const { form: next, moved } = removeClass(form, i);
    onForm(next);
    setRemoved(moved.length > 0 ? { text: removedLine(name, moved), after: next } : null);
  };
  /** A class's carry chosen: its own starts from the fund's, the first time (plan, "The LPs tab"). */
  const chooseCarry = (i: number, c: ClassRow, choice: CarryChoice) => {
    if (choice === "fund") return setClass(i, { ...c, ownCarry: false });
    const from = c.carry ?? fundCarry;
    setClass(i, { ...c, ownCarry: true, carry: choice === "flat" ? toFlat(from) : toSteps(from) });
  };
  const [paste, setPaste] = useState<{ text: string; order: Order } | null>(null);
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
    setPaste({ text, order: "month-first" });
  };
  /** The LPs read, after those already there, in the order pasted; empty rows give way to them. */
  const add = (pasted: PastedLp[]) => {
    const rows = pasted.map((r) => ({ ...newLp(), name: r.name, commitment: exactDollars(r.commitment), class: r.class, close: r.close ?? "" }));
    onForm({ ...form, rows: [...form.rows.filter((r) => !isEmptyLp(r)), ...rows] });
    setPaste(null);
  };
  const hasClasses = form.classes.length > 0;
  return (
    <section className="card" aria-labelledby="lps-heading">
      <h2 id="lps-heading">LPs</h2>
      <p className="card__intro">
        {hasClasses
          ? "Each LP's name and commitment, in the order you list them, with its class and its close. The LPs in a class, or on the fund's terms, share what it gets by commitment."
          : "Each LP's name and commitment, in the order you list them. Every LP is on the same terms, so each gets its commitment's share of what the LPs get."}
      </p>
      {problem && (
        <div className="notice notice--problem" role="status">
          <strong>The fund can't run as it is.</strong> {problem.message}{" "}
          <button type="button" className="link-button" onClick={() => onShow(problem.path)}>
            Show me
          </button>
        </div>
      )}

      <section className="lps__section" aria-labelledby="classes-heading">
        <h3 id="classes-heading">Classes</h3>
        {hasClasses && (
          <div className="table-scroll classes__scroll">
            <table className="split classes">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Name</th>
                  <th scope="col">
                    Fee rate <span className="flows__hint">Blank: the fund's fees.</span>
                  </th>
                  <th scope="col">Carry</th>
                  <th scope="col">
                    <span className="visually-hidden">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.classes.map((c, i) => {
                  const owner = `Class ${i + 1}`;
                  const choice: CarryChoice = c.ownCarry && c.carry ? c.carry.mode : "fund";
                  return (
                    <tr key={c.id}>
                      <th scope="row" className="classes__n">
                        {i + 1}
                      </th>
                      <td className="classes__name-cell">
                        <input
                          id={`${classAt(i)}.name`}
                          className="lps__name"
                          type="text"
                          value={c.name}
                          onChange={(e) => setClass(i, { ...c, name: e.target.value })}
                          // FA27: the page reads a class's name trimmed, as an LP's; the box shows it so once it's left.
                          onBlur={() => c.name !== nameOf(c.name) && setClass(i, { ...c, name: nameOf(c.name) })}
                          aria-label={`${owner}'s name`}
                          {...marks(problem, `${classAt(i)}.name`)}
                        />
                        <ProblemText problem={problem} path={`${classAt(i)}.name`} />
                      </td>
                      <td className="classes__fee-cell">
                        <span className="terms__percent">
                          <input
                            id={`${classAt(i)}.fee_rate`}
                            type="text"
                            inputMode="decimal"
                            value={c.feeRate}
                            onChange={(e) => setClass(i, { ...c, feeRate: e.target.value })}
                            aria-label={`${owner}'s fee rate`}
                            {...marks(problem, `${classAt(i)}.fee_rate`)}
                          />
                          <span aria-hidden="true">%</span>
                        </span>
                        <ProblemText problem={problem} path={`${classAt(i)}.fee_rate`} />
                      </td>
                      <td className="classes__carry-cell">
                        <select
                          id={`${classAt(i)}.carry-choice`}
                          value={choice}
                          onChange={(e) => chooseCarry(i, c, e.target.value as CarryChoice)}
                          aria-label={`${owner}'s carry`}
                        >
                          <option value="fund">The fund's carry</option>
                          <option value="flat">Flat</option>
                          <option value="steps">In steps</option>
                        </select>
                        {c.ownCarry && c.carry && (
                          <div className="classes__carry">
                            <Carry at={`${classAt(i)}.carry`} owner={owner} carry={c.carry} problem={problem} onCarry={(carry) => setClass(i, { ...c, carry })} inTable />
                          </div>
                        )}
                      </td>
                      <td className="lps__remove">
                        <button type="button" className="link-button" aria-label={`Remove class ${i + 1}`} onClick={() => remove(i)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="classes__line">A class changes only the fee rate and the carry; the pref, the catch-up and the GP commitment are the fund's.</p>
        {removed?.after === form && (
          <p className="classes__line classes__removed" role="status">
            {removed.text}
          </p>
        )}
        <div className="flows__actions">
          <button
            id="terms.lp_classes"
            type="button"
            className="button"
            onClick={() => {
              onForm({ ...form, classes: [...form.classes, newClass()] });
              setFocusing(`${classAt(form.classes.length)}.name`);
            }}
          >
            Add a class
          </button>
        </div>
      </section>

      <section className="lps__section" aria-labelledby="each-lp-heading">
        <h3 id="each-lp-heading">Each LP</h3>
        {form.rows.length > 0 && (
          <div className="table-scroll lps__scroll">
            <table className={`split lps${hasClasses ? " lps--classes" : ""}`}>
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Name</th>
                  <th scope="col" className="num">
                    Commitment
                  </th>
                  {hasClasses && <th scope="col">Class</th>}
                  <th scope="col">
                    Close <span className="flows__hint">Blank: in from the start.</span>
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
                    {hasClasses && (
                      <td className="lps__class-cell">
                        <select
                          id={`${at(i)}.class`}
                          value={r.class === null ? "" : String(r.class)}
                          onChange={(e) => setRow(i, { ...r, class: e.target.value === "" ? null : Number(e.target.value) })}
                          aria-label={`LP ${i + 1}'s class`}
                          {...marks(problem, `${at(i)}.class`)}
                        >
                          <option value="">Fund terms</option>
                          {form.classes.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {classLabel(form, c)}
                            </option>
                          ))}
                        </select>
                        <ProblemText problem={problem} path={`${at(i)}.class`} />
                      </td>
                    )}
                    <td className="lps__close-cell">
                      <input
                        id={`${at(i)}.close`}
                        type="date"
                        value={r.close}
                        onChange={(e) => setRow(i, { ...r, close: e.target.value })}
                        aria-label={`LP ${i + 1}'s close`}
                        {...marks(problem, `${at(i)}.close`)}
                      />
                      <ProblemText problem={problem} path={`${at(i)}.close`} />
                    </td>
                    <td className="lps__remove">
                      <button type="button" className="link-button" aria-label={`Remove LP ${i + 1}`} onClick={() => onForm({ ...form, rows: form.rows.filter((_, j) => j !== i) })}>
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
              onForm({ ...form, rows: [...form.rows, newLp()] });
              setFocusing(`${at(form.rows.length)}.name`);
            }}
          >
            Add an LP
          </button>
          <button ref={pasteButton} type="button" className="button" aria-expanded={paste !== null} onClick={() => setPaste(paste ?? { text: "", order: "month-first" })}>
            Paste rows from a spreadsheet
          </button>
        </div>
        {paste !== null && (
          <LpPasteBox
            paste={paste}
            onPaste={setPaste}
            inTable={form.rows.map((r) => nameOf(r.name)).filter((n) => n !== "")}
            classes={form.classes.map((c) => ({ id: c.id, name: nameOf(c.name) }))}
            here={form.rows.filter((r) => !isEmptyLp(r)).length}
            onAdd={add}
            onCancel={cancelPaste}
          />
        )}
      </section>
    </section>
  );
}

interface PasteProps {
  paste: { text: string; order: Order };
  onPaste: (paste: { text: string; order: Order }) => void;
  /** The names already in the table, as the page reads them. */
  inTable: string[];
  /** The classes, each by its row and its name as the page reads it. */
  classes: { id: number; name: string }[];
  /** Rows already in the table with anything in them. */
  here: number;
  onAdd: (rows: PastedLp[]) => void;
  onCancel: () => void;
}

/** "Paste rows from a spreadsheet" for LPs: a box, and a preview of the LPs as read; nothing changes until "Add them". */
function LpPasteBox({ paste, onPaste, inTable, classes, here, onAdd, onCancel }: PasteProps) {
  const read: LpPasteRead = useMemo(() => readLpPaste(paste.text, inTable, classes, paste.order), [paste.text, paste.order, inTable, classes]);
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
        Copy the rows in your spreadsheet, its columns name and commitment in that order, then a class and a close if they have
        them, and paste them here. A header row is skipped. Nothing is added until “Add them”.
      </p>
      <textarea
        ref={box}
        className="paste__text"
        rows={6}
        value={paste.text}
        onChange={(e) => onPaste({ ...paste, text: e.target.value })}
        aria-label="The LPs, pasted"
        spellCheck={false}
        wrap="off"
      />
      {read.ambiguous && (
        <fieldset className="paste__order">
          <legend>Which comes first in this paste's dates?</legend>
          {orderChoices(read.ambiguous).map((c) => (
            <label key={c.order}>
              <input type="radio" name="lp-paste-order" checked={paste.order === c.order} onChange={() => onPaste({ ...paste, order: c.order })} /> {c.text}
            </label>
          ))}
        </fieldset>
      )}
      {paste.text.trim() !== "" && (
        <div className="paste__preview" role="status">
          <p className="paste__summary">{lpPasteSummary(read, here)}</p>
          {read.orderNote && <p>{read.orderNote}</p>}
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
