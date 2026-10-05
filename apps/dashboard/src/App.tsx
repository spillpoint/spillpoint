// The dashboard: the founder view, the exit value, the payoff curves, who
// gets what, and the breakpoints.

import { useMemo, useState } from "react";
import { D, prepare, readExit, solve } from "spillpoint";
import examples from "virtual:examples";
import type { Example } from "virtual:examples";

import { BreakpointList } from "./BreakpointList.tsx";
import { ExitSlider } from "./ExitSlider.tsx";
import { FounderView } from "./FounderView.tsx";
import { PayoffChart } from "./PayoffChart.tsx";
import { PayoutTable } from "./PayoutTable.tsx";
import { useAnalysis } from "./analysis.ts";
import { defaultHolder } from "./capTable.ts";
import { changeAt, seriesNodes } from "./curves.ts";

export function App() {
  const [exampleId, setExampleId] = useState(examples[0]!.id);
  const example = examples.find((e) => e.id === exampleId)!;
  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__title">
          <span className="wordmark">spillpoint</span>
          <span className="masthead__tagline">Who gets what when the company is sold</span>
        </div>
        <label className="masthead__example">
          Example{" "}
          <select value={exampleId} onChange={(e) => setExampleId(e.target.value)}>
            {examples.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {e.fictional ? " (fictional)" : ""}
              </option>
            ))}
          </select>
        </label>
      </header>
      <GovernanceNote />
      {/* A new example starts fresh: its own holder, exit value and breakpoints. */}
      <Workspace key={example.id} example={example} />
    </div>
  );
}

function GovernanceNote() {
  return (
    <aside className="notice" aria-label="Before you rely on this">
      <strong>The charter and the signed documents govern, not this tool.</strong> spillpoint models common terms with
      documented defaults; where your documents differ, they win. Everything runs on this computer: nothing you enter is sent
      anywhere.
    </aside>
  );
}

function Workspace({ example }: { example: Example }) {
  const exit = useMemo(() => readExit(example.exit), [example]);
  const pc = useMemo(() => prepare(exit.capTable), [exit]);
  const [you, setYou] = useState(() => defaultHolder(exit.capTable));
  const [exitValue, setExitValue] = useState(() => new D(example.defaultExitValue));
  const answer = useMemo(() => solve(pc, exitValue).answers[0]!, [pc, exitValue]);
  const analysis = useAnalysis(example.exit);
  const ready = analysis.status === "ready" ? analysis : null;
  // How your payout bends or jumps at each breakpoint, if it does: the curves mark those breakpoints,
  // and the list says how.
  const changes = useMemo(() => {
    if (!ready) return [];
    const nodes = seriesNodes(ready.curve, "holder", you);
    return ready.breakpoints.map((_, i) => changeAt(nodes, i + 1));
  }, [ready, you]);
  const yours = useMemo(() => changes.map((c) => c !== null), [changes]);
  const yourName = exit.capTable.holders.find((h) => h.id === you)?.name ?? "";

  return (
    <main>
      {example.fictional && (
        <p className="example-label">
          <span className="badge">Fictional example</span> {example.label}
        </p>
      )}
      <FounderView pc={pc} range={exit.range} answer={answer} exitValue={exitValue} you={you} onChooseYou={setYou} breakpoints={analysis} />
      <ExitSlider range={exit.range} value={exitValue} onChange={setExitValue} breakpoints={ready ? ready.breakpoints : []} />
      {analysis.status === "computing" && <p className="card card--quiet">Working out the curves and breakpoints…</p>}
      {analysis.status === "error" && <p className="card card--quiet">Couldn't work out the curves and breakpoints: {analysis.message}</p>}
      {ready && (
        <PayoffChart
          pc={pc}
          curve={ready.curve}
          breakpoints={ready.breakpoints.map((b) => new D(b.exitValue))}
          yours={yours}
          range={exit.range}
          exitValue={exitValue}
          onExitValue={setExitValue}
          you={you}
        />
      )}
      <PayoutTable pc={pc} answer={answer} exitValue={exitValue} you={you} />
      {ready && <BreakpointList breakpoints={ready.breakpoints} changes={changes} yourName={yourName} exitValue={exitValue} onExitValue={setExitValue} />}
    </main>
  );
}
