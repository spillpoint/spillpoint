// The Rounds tab (M4i): each event that builds the cap table, what it did in
// plain sentences, and the cap table after it. The payouts run on the cap
// table after the event the exit names, which is marked. Each event opens for
// editing in place (M4j), and the holders are edited above them; what the
// cards say is from the last rounds the engine built. On a phone each row's
// class moves under the holder's name, as the payouts table's shares do, so
// the table fits without scrolling sideways; the stylesheet shows one form or
// the other, never both. Each event that changes your fully diluted share
// says so, before and after (M4i review): founders open this tab to see what
// each round cost them.

import { D } from "spillpoint";
import type { CapTableAfterEvent } from "spillpoint";

import { EventForm, RoundsHolders } from "./RoundsEditor.tsx";
import { percent } from "./format.ts";
import type { EventView } from "./rounds.ts";
import type { RoundsDraft, RoundsProblem } from "./roundsDraft.ts";

interface Props {
  /** Null when the cap table was entered directly. */
  events: EventView[] | null;
  /** The event whose cap table the payouts use. */
  after: string | null;
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
}

const count = (n: D) => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function RoundsView({ events, after, you, rounds, onRounds, problem, tables, editing, onEditing }: Props) {
  if (!events || !rounds) {
    return (
      <section className="card" aria-labelledby="rounds-heading">
        <h2 id="rounds-heading">Rounds</h2>
        <p>This cap table was entered directly, not built from the company's rounds, so there are no rounds to show.</p>
      </section>
    );
  }
  const last = events.findIndex((e) => e.id === after);
  // From the latest state, so quick clicks on several events each open their own.
  const toggle = (key: string) => onEditing((open) => (open.has(key) ? new Set([...open].filter((k) => k !== key)) : new Set([...open, key])));
  return (
    <div className="rounds">
      <section className="card" aria-labelledby="rounds-heading">
        <h2 id="rounds-heading">How the cap table was built</h2>
        <p>
          {events.length} events, in order. The payouts use the cap table after the {ordinal(last + 1)} event: {events[last]?.title}. Open any
          event's cap table to see who held what after it, or edit an event to change it.
        </p>
      </section>
      {problem && !problem.event && (
        <p className="notice notice--problem" role="alert" id="round-problem-rounds" tabIndex={-1}>
          <strong>The payouts can't update until this is fixed:</strong> {problem.message}
        </p>
      )}
      <ol className="rounds__list">
        {events.map((e, i) => {
          const event = rounds.events[i]!;
          const open = editing.has(event.key);
          const formId = `round-form-${event.key}`;
          // The series this event made from its SAFEs and notes, as last built (R28): they rank with its new series.
          const before = tables?.[i - 1] ?? null;
          const made = (tables?.[i]?.capTable.securities ?? []).map((s) => s.id).filter((id) => !before?.capTable.securities.some((s) => s.id === id));
          const series = String((event.json.series as { id?: string } | undefined)?.id ?? "");
          return (
            <li key={event.key} className="card rounds__event">
              <div className="rounds__heading">
                <h3 id={`round-${e.id}`}>
                  <span className="rounds__number">{i + 1}.</span> {e.title}
                </h3>
                <span className="rounds__date">{e.date ?? "No date"}</span>
                <button
                  type="button"
                  className="file-button rounds__edit"
                  aria-label={`${open ? "Done" : "Edit"} ${e.title}`}
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
                  <EventForm event={event} draft={rounds} onDraft={onRounds} problem={problem} before={before} conversions={made.filter((id) => id !== series)} />
                </div>
              )}
              {e.id === after && <p className="tag rounds__used">The payouts use the cap table after this event.</p>}
              {forYou(events[i - 1]?.stakes.get(you) ?? ZERO, e.stakes.get(you) ?? ZERO)}
              <ul className="rounds__lines">
              {e.lines.map((line, j) => (
                <li key={j}>{line}</li>
              ))}
            </ul>
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
          </li>
          );
        })}
      </ol>
      <RoundsHolders draft={rounds} onDraft={onRounds} problem={problem} />
    </div>
  );
}

const ZERO = new D(0);

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

/** 1 → "1st", 10 → "10th": which event, counting from the first. */
function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}
