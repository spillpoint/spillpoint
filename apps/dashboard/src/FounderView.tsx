// The first screen (M3 plan, answer 1): who you are, what you get at this
// exit value, your share of the proceeds against your share of the company,
// and where your payout starts.

import type { Answer, PreparedCapTable } from "spillpoint";
import { D } from "spillpoint";

import { fractionOf, fullyDiluted, holderShares, payoutStart } from "./capTable.ts";
import type { AnalysisState } from "./analysis.ts";
import { percent, shortDollars, withoutCodes } from "./format.ts";

type Decimal = D;

interface Props {
  pc: PreparedCapTable;
  range: readonly [Decimal, Decimal];
  answer: Answer;
  exitValue: Decimal;
  you: string;
  onChooseYou: (holder: string) => void;
  breakpoints: AnalysisState;
}

export function FounderView({ pc, range, answer, exitValue, you, onChooseYou, breakpoints }: Props) {
  const gets = answer.payout.holderTotals.get(you) ?? new D(0);
  const ofProceeds = fractionOf(gets, exitValue);
  const ofCompany = fractionOf(holderShares(pc, you), fullyDiluted(pc));

  return (
    <section className="founder" aria-labelledby="founder-headline">
      <label className="founder__you">
        You are{" "}
        <select value={you} onChange={(e) => onChooseYou(e.target.value)}>
          {pc.capTable.holders.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <h1 id="founder-headline" className="founder__headline">
        At {shortDollars(exitValue)} you get {shortDollars(gets)}
      </h1>
      <p className="founder__compare">
        That's {percent(ofProceeds)} of the proceeds, for {percent(ofCompany)} of the company (fully diluted
        {pc.capTable.unissuedPool.gt(0) ? ", including the option pool" : ""}).{yourOutstanding(pc, you)}
      </p>
      <p className="founder__start">
        <PayoutStartLine pc={pc} range={range} you={you} breakpoints={breakpoints} />
      </p>
    </section>
  );
}

/** A SAFE or note holds no shares until it converts (C8, C9), so your share of the company leaves it out: say so. */
function yourOutstanding(pc: PreparedCapTable, you: string): string {
  const safes = (pc.capTable.unconvertedSafes ?? []).filter((f) => f.holder === you).length;
  const notes = (pc.capTable.unconvertedNotes ?? []).filter((n) => n.holder === you).length;
  if (safes + notes === 0) return "";
  const what = [safes > 0 ? (safes === 1 ? "SAFE" : "SAFEs") : null, notes > 0 ? (notes === 1 ? "convertible note" : "convertible notes") : null].filter(Boolean).join(" and ");
  return ` Your ${what} ${safes + notes === 1 ? "holds" : "hold"} no shares until ${safes + notes === 1 ? "it converts, so it isn't" : "they convert, so they aren't"} counted in that share.`;
}

function PayoutStartLine({ pc, range, you, breakpoints }: Omit<Props, "answer" | "exitValue" | "onChooseYou">) {
  if (breakpoints.status === "computing") return <span className="muted">Working out where your payout starts…</span>;
  if (breakpoints.status === "error") return <span className="muted">Couldn't work out where your payout starts: {withoutCodes(breakpoints.message)}</span>;
  const start = payoutStart(
    pc,
    you,
    range,
    breakpoints.breakpoints.map((b) => new D(b.exitValue)),
  );
  if (start.kind === "first dollar") return <>You're paid from the first dollar.</>;
  if (start.kind === "from") return <>You get nothing below {shortDollars(start.exitValue)}.</>;
  return <>You get nothing up to {shortDollars(start.upTo)}.</>;
}
