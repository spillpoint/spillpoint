// The Rounds tab (M4i): each event that builds the cap table, what it did in
// plain sentences, and the cap table after it. The payouts run on the cap
// table after the event chosen at the top, the last one unless someone picks
// another, which is marked. Each event opens for editing in place (M4j), and
// can be moved or removed there; new events are added at the end (M4k). The
// list is the events as typed; what each one did is from the last rounds the
// engine built, so an event it hasn't built yet says so. On a phone each
// row's class moves under the holder's name, as the payouts table's shares
// do, so the table fits without scrolling sideways; the stylesheet shows one
// form or the other, never both. Each event that changes your fully diluted
// share says so, before and after (M4i review): founders open this tab to see
// what each round cost them. A SAFE or note that will still be outstanding at
// the sale says so on the event that creates it (M5k), and an event the engine
// can't build yet names the event whose problem it's waiting on, and links to it.

import { useState } from "react";
import { D } from "spillpoint";
import type { CapTableAfterEvent } from "spillpoint";

import { EventForm, RoundsHolders } from "./RoundsEditor.tsx";
import { percent } from "./format.ts";
import { dateText } from "./rounds.ts";
import type { EventView } from "./rounds.ts";
import { EVENT_TYPES, addEvent, draftTitle, eventFieldId, moveEvent, outstandingAtSale, removeEvent } from "./roundsDraft.ts";
import type { EventDraft, EventType, RoundsDraft, RoundsProblem } from "./roundsDraft.ts";

interface Props {
  /** What each event did, as last built; null when the cap table was entered directly. */
  events: EventView[] | null;
  /** The holder you are, by id. */
  you: string;
  /** The rounds as typed, and how to change them. */
  rounds: RoundsDraft | null;
  onRounds: (next: RoundsDraft) => void;
  problem: RoundsProblem | null;
  /** The cap table after each event, as last built. */
  tables: CapTableAfterEvent[] | null;
  /** Which events are open for editing, by key. */
  editing: ReadonlySet<string>;
  onEditing: (update: (open: ReadonlySet<string>) => ReadonlySet<string>) => void;
  /** Opens the Cap table tab at its Exit terms card. */
  onExitTerms: () => void;
}

const count = (n: D) => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const ZERO = new D(0);
const ADD_TYPE = "rounds-add-type";

export function RoundsView({ events, you, rounds, onRounds, problem, tables, editing, onEditing, onExitTerms }: Props) {
  const [adding, setAdding] = useState<EventType>("priced_round");
  if (!events || !rounds) {
    return (
      <section className="card" aria-labelledby="rounds-heading">
        <h2 id="rounds-heading">Rounds</h2>
        <p>This cap table was entered directly, not built from the company's rounds, so there are no rounds to show.</p>
      </section>
    );
  }
  // What the engine last built, by event id: events added, moved or edited since are matched by id.
  const views = new Map(events.map((e) => [e.id, e]));
  const built = new Map((tables ?? []).map((t) => [t.event, t]));
  const idOf = (e: EventDraft) => String(e.json.id);
  // From the latest state, so quick clicks on several events each open their own.
  const toggle = (key: string) => onEditing((open) => (open.has(key) ? new Set([...open].filter((k) => k !== key)) : new Set([...open, key])));

  const add = () => {
    const last = rounds.events.at(-1);
    const next = addEvent(rounds, adding, (last && built.get(idOf(last))?.capTable.seniority) ?? []);
    const key = next.events.at(-1)!.key;
    onRounds(next);
    onEditing((open) => new Set([...open, key]));
    // Straight to the new event's first field.
    setTimeout(() => document.getElementById(eventFieldId(key, "date"))?.focus(), 0);
  };
  // Moving a card can take focus off its button as the list reorders: put it back, or on the other button once it's at the end.
  const move = (event: EventDraft, by: -1 | 1) => {
    onRounds(moveEvent(rounds, event.key, by));
    setTimeout(() => {
      const same = document.getElementById(`move-${by < 0 ? "earlier" : "later"}-${event.key}`) as HTMLButtonElement | null;
      const other = document.getElementById(`move-${by < 0 ? "later" : "earlier"}-${event.key}`);
      (same && !same.disabled ? same : other)?.focus();
    }, 0);
  };
  // What's still outstanding at the sale, by the event that creates it, from the events as typed.
  const atSale = outstandingAtSale(rounds);
  const number = (key: string) => rounds.events.findIndex((e) => e.key === key) + 1;
  const holderName = (key: string) => rounds.holders.find((h) => h.key === key)?.name || "Its holder";
  const saleIndex = rounds.events.findIndex((e) => idOf(e) === rounds.after);
  const atSaleLines = (event: EventDraft) =>
    atSale
      .filter((c) => c.event === event.key)
      .map((c) => {
        const what = `${holderName(c.holder)}'s ${c.kind === "safe" ? "SAFE" : "convertible note"}`;
        return c.convertedBy === null
          ? `${what} isn't converted by any later round, so it will be outstanding at the sale.`
          : `${what} converts in event ${number(c.convertedBy)}, after the cap table the payouts use (event ${saleIndex + 1}), so it will be outstanding at the sale.`;
      });
  // An event the engine hasn't built is waiting on the problem: name the event it's in, and go to it.
  const goTo = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView?.({ block: "center" });
    el?.focus();
  };
  const waitingOn = (event: EventDraft) => {
    if (!problem) return <>Not built yet.</>;
    const target = `round-problem-${problem.event ?? "rounds"}`;
    const link = (text: string) => (
      <button type="button" className="link-button" onClick={() => goTo(target)}>
        {text}
      </button>
    );
    if (problem.event === event.key) return <>Not built yet: the engine builds it once {link("this event's problem")} is fixed.</>;
    const n = number(problem.event ?? "");
    if (n === 0) return <>Not built yet: the engine builds it once {link("the problem at the top of the list")} is fixed.</>;
    return <>Not built yet: the engine builds it once the problem in {link(`event ${n}, ${draftTitle(rounds.events[n - 1]!.json)}`)}, is fixed.</>;
  };
  const remove = (event: EventDraft, n: number) => {
    if (!window.confirm(`Remove event ${n}, ${draftTitle(event.json)}? What it did goes, and the events after it are built again without it.`)) return;
    onRounds(removeEvent(rounds, event.key));
    setTimeout(() => document.getElementById(ADD_TYPE)?.focus(), 0);
  };

  return (
    <div className="rounds">
      <section className="card" aria-labelledby="rounds-heading">
        <h2 id="rounds-heading">How the cap table was built</h2>
        <p>
          {rounds.events.length === 1 ? "1 event" : `${rounds.events.length} events`}, in order. Open any event's cap table to see who held what after it,
          or edit an event to change it.
        </p>
        <div className="field">
          <label htmlFor="rounds-after" className="field__label">
            The payouts use the cap table after
          </label>
          <select id="rounds-after" value={rounds.after} onChange={(e) => onRounds({ ...rounds, after: e.target.value })}>
            {rounds.events.map((e, i) => (
              <option key={e.key} value={idOf(e)}>
                {i + 1}. {draftTitle(e.json)}
                {i === rounds.events.length - 1 ? " (the last event)" : ""}
              </option>
            ))}
          </select>
          <span className="field__hint">The last event, unless you choose an earlier one: then events added later don't change it.</span>
        </div>
        {/* The sale's terms aren't events: they're on the Cap table tab, editable here too (M5 plan, item 13). */}
        <p className="rounds__terms">
          The sale's terms (date, management carve-out, earnout or escrow) are on the Cap table tab, under{" "}
          <button type="button" className="link-button" onClick={onExitTerms}>
            Exit terms
          </button>
          .
        </p>
      </section>
      {problem && !problem.event && (
        <p className="notice notice--problem" role="alert" id="round-problem-rounds" tabIndex={-1}>
          <strong>The payouts can't update until this is fixed:</strong> {problem.message}
        </p>
      )}
      <ol className="rounds__list">
        {rounds.events.map((event, i) => {
          const id = idOf(event);
          const view = views.get(id);
          const previous = rounds.events[i - 1];
          const before = previous ? (built.get(idOf(previous)) ?? null) : null;
          // The series this event made from its SAFEs and notes, as last built (R28): they rank with its new series.
          const series = String((event.json.series as { id?: string } | undefined)?.id ?? "");
          const made = (built.get(id)?.capTable.securities ?? []).map((s) => s.id).filter((s) => s !== series && !before?.capTable.securities.some((b) => b.id === s));
          const title = draftTitle(event.json);
          const open = editing.has(event.key);
          const formId = `round-form-${event.key}`;
          const date = typeof event.json.date === "string" && event.json.date ? dateText(event.json.date) : null;
          return (
            <li key={event.key} className="card rounds__event">
              <div className="rounds__heading">
                <h3 id={`round-${event.key}`}>
                  <span className="rounds__number">{i + 1}.</span> {title}
                </h3>
                <span className="rounds__date">{date ?? "No date"}</span>
                <button
                  type="button"
                  className="file-button rounds__edit"
                  aria-label={`${open ? "Done" : "Edit"} ${title}`}
                  aria-expanded={open}
                  aria-controls={formId}
                  onClick={() => toggle(event.key)}
                >
                  {open ? "Done" : "Edit"}
                </button>
              </div>
              {problem?.event === event.key && (
                <p className="rounds__problem" role="alert" id={`round-problem-${event.key}`} tabIndex={-1}>
                  <strong>This event has a problem, so the payouts can't update:</strong> {problem.message}
                </p>
              )}
              {open && (
                <div id={formId}>
                  <EventForm event={event} draft={rounds} onDraft={onRounds} problem={problem} before={before} conversions={made} />
                  <div className="event-form__actions">
                    <button type="button" className="add" id={`move-earlier-${event.key}`} aria-label={`Move ${title} earlier`} disabled={i === 0} onClick={() => move(event, -1)}>
                      Move earlier
                    </button>
                    <button
                      type="button"
                      className="add"
                      id={`move-later-${event.key}`}
                      aria-label={`Move ${title} later`}
                      disabled={i === rounds.events.length - 1}
                      onClick={() => move(event, 1)}
                    >
                      Move later
                    </button>
                    <button type="button" className="remove" aria-label={`Remove ${title}`} disabled={rounds.events.length === 1} onClick={() => remove(event, i + 1)}>
                      Remove this event
                    </button>
                  </div>
                </div>
              )}
              {id === rounds.after && <p className="tag rounds__used">The payouts use the cap table after this event.</p>}
              {view ? (
                <Built view={view} previous={previous ? views.get(idOf(previous)) : undefined} you={you} atSale={atSaleLines(event)} />
              ) : (
                <>
                  <p className="rounds__unbuilt">{waitingOn(event)}</p>
                  <AtSale lines={atSaleLines(event)} />
                </>
              )}
            </li>
          );
        })}
      </ol>
      <section className="card rounds__add" aria-labelledby="rounds-add-heading">
        <h2 id="rounds-add-heading">Add an event</h2>
        <div className="rounds__add-row">
          <div className="field">
            <label htmlFor={ADD_TYPE} className="field__label">
              Type of event
            </label>
            <select id={ADD_TYPE} value={adding} onChange={(e) => setAdding(e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="add" onClick={add}>
            Add it at the end
          </button>
        </div>
        <p className="field__hint">It opens for you to fill in. Move it earlier from its own card.</p>
      </section>
      <RoundsHolders draft={rounds} onDraft={onRounds} problem={problem} />
    </div>
  );
}

/** The SAFEs and notes an event creates that will still be outstanding at the sale, one line each. */
function AtSale({ lines }: { lines: string[] }) {
  return lines.map((line) => (
    <p key={line} className="rounds__at-sale">
      {line}
    </p>
  ));
}

/** What an event did, as last built: the "For you" line, the sentences, what's still outstanding at the sale, and the cap table after it. */
function Built({ view: e, previous, you, atSale }: { view: EventView; previous: EventView | undefined; you: string; atSale: string[] }) {
  return (
    <>
      {forYou(previous?.stakes.get(you) ?? ZERO, e.stakes.get(you) ?? ZERO)}
      <ul className="rounds__lines">
        {e.lines.map((line, j) =>
          typeof line === "string" ? (
            <li key={j}>{line}</li>
          ) : (
            <li key={j}>
              {line.text}
              <ul className="rounds__details">
                {line.details.map((detail, k) => (
                  <li key={k}>{detail}</li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
      <AtSale lines={atSale} />
      <details className="rounds__table">
        <summary>The cap table after it</summary>
        <div className="table-scroll">
          <table className="payouts">
            <thead>
              <tr>
                <th scope="col">Holder</th>
                <th scope="col" className="rounds__class">
                  Class
                </th>
                <th scope="col" className="num">
                  Shares
                </th>
                <th scope="col" className="num">
                  Fully diluted
                </th>
              </tr>
            </thead>
            <tbody>
              {e.rows.map((r, j) => (
                <tr key={j}>
                  <th scope="row">
                    {r.holder}
                    <span className="rounds__class-under">{r.security}</span>
                  </th>
                  <td className="rounds__class">{r.security}</td>
                  <td className="num">{count(r.shares)}</td>
                  <td className="num">{percent(r.fullyDiluted)}</td>
                </tr>
              ))}
              {e.pool.shares.gt(0) && (
                <tr>
                  <th scope="row">Unissued option pool</th>
                  <td className="rounds__class" />
                  <td className="num">{count(e.pool.shares)}</td>
                  <td className="num">{percent(e.pool.fullyDiluted)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="rounds__class" />
                <td />
                <td className="num">{percent(new D(1))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="footnote">Fully diluted: every share, option and preferred share as converted, and the unissued option pool.</p>
        {e.outstanding.length > 0 && <p className="rounds__outstanding">Not yet converted: {e.outstanding.join("; ")}.</p>}
      </details>
    </>
  );
}

/**
 * "For you: 46.5% → 25.5% fully diluted.", when an event changes your share.
 * Shown to one decimal place, or more when one place would show the same
 * figure twice.
 */
function forYou(before: D, after: D) {
  if (before.eq(after)) return null;
  let places = 1;
  const shown = (x: D) => `${x.times(100).toDecimalPlaces(places, D.ROUND_HALF_UP).toFixed(places)}%`;
  while (places < 4 && shown(before) === shown(after)) places++;
  return <p className="rounds__yours">For you: {shown(before)} → {shown(after)} fully diluted.</p>;
}
