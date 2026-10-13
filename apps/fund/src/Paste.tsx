// "Paste rows from a spreadsheet" (plan, f01k): a box under the cash flows table, and a preview of the rows as read
// before anything is added. Nothing changes until "Add them"; "Cancel" leaves the table as it was.

import { useEffect, useMemo, useRef } from "react";

import type { Order } from "./paste.ts";
import { orderChoices, pasteSummary, readPaste } from "./paste.ts";
import type { PastedRow } from "./paste.ts";

export interface PasteState {
  text: string;
  /** The order picked for dates that could be either; month first until changed. */
  order: Order;
}

interface Props {
  paste: PasteState;
  onPaste: (paste: PasteState) => void;
  /** Rows already in the table with anything in them. */
  here: number;
  onAdd: (rows: PastedRow[]) => void;
  onCancel: () => void;
}

export function PasteBox({ paste, onPaste, here, onAdd, onCancel }: Props) {
  const read = useMemo(() => readPaste(paste.text, paste.order), [paste.text, paste.order]);
  const box = useRef<HTMLTextAreaElement>(null);
  // The box takes the focus when it opens, with what was pasted into a cell already in it.
  useEffect(() => {
    box.current?.focus();
    box.current?.scrollIntoView?.({ block: "center" });
  }, []);
  const pasted = paste.text.trim() !== "";
  return (
    <section
      className="paste"
      aria-labelledby="paste-heading"
      // Escape closes the box as "Cancel" does (f01m).
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onCancel();
      }}
    >
      <h3 id="paste-heading">Paste rows from a spreadsheet</h3>
      <p className="paste__how">
        Copy the rows in your spreadsheet, its columns date, type, kind and amount in that order, and paste them here. A header row
        is skipped. Nothing is added until “Add them”.
      </p>
      <textarea
        ref={box}
        className="paste__text"
        rows={6}
        value={paste.text}
        onChange={(e) => onPaste({ ...paste, text: e.target.value })}
        aria-label="The rows, pasted"
        spellCheck={false}
        // One pasted row a line, scrolling inside the box on a phone rather than wrapping.
        wrap="off"
      />
      {read.ambiguous && (
        <fieldset className="paste__order">
          <legend>Which comes first in this paste's dates?</legend>
          {orderChoices(read.ambiguous).map((c) => (
            <label key={c.order}>
              <input type="radio" name="paste-order" checked={paste.order === c.order} onChange={() => onPaste({ ...paste, order: c.order })} /> {c.text}
            </label>
          ))}
        </fieldset>
      )}
      {pasted && (
        <div className="paste__preview" role="status">
          <p className="paste__summary">{pasteSummary(read, here)}</p>
          {read.orderNote && <p>{read.orderNote}</p>}
          {read.noKind > 0 && (
            <p>
              {read.noKind === 1 ? "1 call had" : `${read.noKind} calls had`} no kind: read as {read.noKind === 1 ? "an investment" : "investments"}.
            </p>
          )}
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

/** A paste of more than one cell: tabs or line breaks, after the line break a spreadsheet puts after a single cell. */
export function isManyCells(text: string): boolean {
  return /[\t\r\n]/.test(text.replace(/\r?\n$/, ""));
}
