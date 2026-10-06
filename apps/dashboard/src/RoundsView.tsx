// The Rounds tab (M4i): each event that builds the cap table, what it did in
// plain sentences, and the cap table after it. The payouts run on the cap
// table after the event the exit names, which is marked. Editing the events
// comes in M4j; until then they're shown as loaded. On a phone each row's
// class moves under the holder's name, as the payouts table's shares do, so
// the table fits without scrolling sideways; the stylesheet shows one form or
// the other, never both. Each event that changes your fully diluted share
// says so, before and after (M4i review): founders open this tab to see what
// each round cost them.

import { D } from "spillpoint";

import { percent } from "./format.ts";
import type { EventView } from "./rounds.ts";

interface Props {
  /** Null when the cap table was entered directly. */
  events: EventView[] | null;
  /** The event whose cap table the payouts use. */
  after: string | null;
  /** The holder you are, by id. */
  you: string;
}

const count = (n: D) => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function RoundsView({ events, after, you }: Props) {
  if (!events) {
    return (
      <section className="card" aria-labelledby="rounds-heading">
        <h2 id="rounds-heading">Rounds</h2>
        <p>This cap table was entered directly, not built from the company's rounds, so there are no rounds to show.</p>
      </section>
    );
  }
  const last = events.findIndex((e) => e.id === after);
  return (
    <div className="rounds">
      <section className="card" aria-labelledby="rounds-heading">
        <h2 id="rounds-heading">How the cap table was built</h2>
        <p>
          {events.length} events, in order. The payouts use the cap table after the {ordinal(last + 1)} event: {events[last]?.title}. Open any
          event's cap table to see who held what after it.
        </p>
      </section>
      <ol className="rounds__list">
        {events.map((e, i) => (
          <li key={e.id} className="card rounds__event">
            <div className="rounds__heading">
              <h3 id={`round-${e.id}`}>
                <span className="rounds__number">{i + 1}.</span> {e.title}
              </h3>
              <span className="rounds__date">{e.date ?? "No date"}</span>
            </div>
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
        ))}
      </ol>
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
