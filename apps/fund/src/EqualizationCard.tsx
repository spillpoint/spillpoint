// The equalization card on Payouts (plan, "Payouts", f03c): only with a later close (F25). The rate; each close, with
// its date and who joins, and what each LP in by then paid in or got back, with the interest; then all the closes
// together. It's once for the fund, not by X: it changes nothing in the waterfall.

import type { Equalization } from "spillpoint-fund";

import { CardTable } from "./CardTable.tsx";
import { EQUALIZATION_HEADINGS, equalizationBlocks } from "./equalizationCard.ts";
import type { EqualizationBlock } from "./equalizationCard.ts";
import { cents, percentText } from "./format.ts";
import { LEFTOVER, TOTAL } from "./lpsCard.ts";

interface Props {
  equalization: Equalization;
  onDownload: (blocks: EqualizationBlock[]) => void;
}

export function EqualizationCard({ equalization, onDownload }: Props) {
  const blocks = equalizationBlocks(equalization);
  return (
    <section className="card" aria-labelledby="equalization-heading">
      <h2 id="equalization-heading">Equalization at the later closes</h2>
      <p className="card__intro">Interest at {percentText(equalization.rate)} a year, simple, on the days from each call to the close (Actual/365).</p>
      {blocks.map((b, i) => (
        <section key={i} className="equalization__block" aria-labelledby={`equalization-block-${i}`}>
          <h3 id={`equalization-block-${i}`}>{b.heading}</h3>
          <CardTable
            headings={EQUALIZATION_HEADINGS}
            rows={[
              ...b.rows.map((r) => ({ name: r.name, cells: r.amounts.map(cents), kind: "row" as const })),
              { name: LEFTOVER, cells: b.leftover.map(cents), kind: "leftover" as const },
              { name: TOTAL, cells: b.total.map(cents), kind: "total" as const },
            ]}
          />
        </section>
      ))}
      <p className="equalization__outside">Equalization is outside the waterfall: it moves money between LPs at each close and changes nothing above.</p>
      <div className="flows__actions">
        <button type="button" className="button" onClick={() => onDownload(blocks)}>
          Download as CSV
        </button>
      </div>
    </section>
  );
}
