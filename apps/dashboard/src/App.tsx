// The dashboard: the founder view, the exit value, the payoff curves, who
// gets what, and the breakpoints, on one tab; the cap table editor on the
// other. It starts from an example or from scratch (M3 plan, answer 2).

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { D, solve } from "spillpoint";
import examples from "virtual:examples";

import { BreakpointList } from "./BreakpointList.tsx";
import { CapTableEditor } from "./CapTableEditor.tsx";
import type { DraftError } from "./CapTableEditor.tsx";
import { ExitSlider } from "./ExitSlider.tsx";
import { FounderView } from "./FounderView.tsx";
import { PayoffChart } from "./PayoffChart.tsx";
import { PayoutTable } from "./PayoutTable.tsx";
import { useAnalysis } from "./analysis.ts";
import { defaultHolder } from "./capTable.ts";
import { changeAt, seriesNodes } from "./curves.ts";
import { buildExit, checkBuilt, draftFromExit, scratchDraft } from "./draft.ts";
import type { Built, Checked, Draft } from "./draft.ts";
import { shortDollars, withoutCodes } from "./format.ts";

const SCRATCH = "scratch";

/** Where a cap table starts: an example from cases/, or scratch. */
interface Start {
  id: string;
  label: string;
  fictional: boolean;
  draft: Draft;
  defaultExitValue: string;
}

function startFrom(id: string): Start {
  const example = examples.find((e) => e.id === id);
  if (!example) return { id: SCRATCH, label: "Your own cap table, started blank", fictional: false, draft: scratchDraft(), defaultExitValue: "50000000" };
  return { id, label: example.label, fictional: example.fictional, draft: draftFromExit(example.exit), defaultExitValue: example.defaultExitValue };
}

export function App() {
  const [start, setStart] = useState(() => ({ ...startFrom(examples[0]!.id), n: 0 }));
  const [edited, setEdited] = useState(false);
  const choose = (id: string) => {
    // Nothing is kept between visits or saved yet, so starting over loses the edits: ask first.
    if (edited && !window.confirm("Start over? Your changes to this cap table will be lost.")) return;
    setEdited(false);
    setStart((s) => ({ ...startFrom(id), n: s.n + 1 }));
  };
  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__title">
          <span className="wordmark">spillpoint</span>
          <span className="masthead__tagline">Who gets what when the company is sold</span>
        </div>
        <label className="masthead__example">
          Start from{" "}
          <select value={start.id} onChange={(e) => choose(e.target.value)}>
            {examples.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {e.fictional ? " (fictional)" : ""}
              </option>
            ))}
            <option value={SCRATCH}>A blank cap table</option>
          </select>
        </label>
      </header>
      <GovernanceNote />
      {/* A new start begins fresh: its own cap table, holder, exit value and breakpoints. */}
      <Workspace key={start.n} start={start} edited={edited} onEdited={() => setEdited(true)} />
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

/** The last cap table the engine accepted: the payouts show it while an edit has a problem. */
interface Good {
  built: Built;
  checked: Extract<Checked, { ok: true }>;
}

type Tab = "payouts" | "editor";

function Workspace({ start, edited, onEdited }: { start: Start; edited: boolean; onEdited: () => void }) {
  const [draft, setDraft] = useState(start.draft);
  const edit = (next: Draft) => {
    setDraft(next);
    if (!edited) onEdited();
  };
  const built = useMemo(() => buildExit(draft), [draft]);
  const checked = useMemo(() => checkBuilt(built), [built]);
  const lastGood = useRef<Good | null>(null);
  if (checked.ok && lastGood.current?.built !== built) lastGood.current = { built, checked };
  const good = lastGood.current!;
  const draftError: DraftError | null = checked.ok ? null : { field: checked.field, message: checked.message };

  const { exit, pc } = good.checked;
  const keyOf = (id: string) => [...good.built.holderIds].find(([, v]) => v === id)?.[0] ?? "";
  const [youKey, setYouKey] = useState(() => keyOf(defaultHolder(exit.capTable)));
  const you = good.built.holderIds.get(youKey) ?? defaultHolder(exit.capTable);
  const yourName = exit.capTable.holders.find((h) => h.id === you)?.name ?? "";

  // The exit value stays inside the range, even when an edit narrows it.
  const [chosenExitValue, setExitValue] = useState(() => new D(start.defaultExitValue));
  const [lo, hi] = exit.range;
  const exitValue = useMemo(() => D.min(hi, D.max(lo, chosenExitValue)), [lo, hi, chosenExitValue]);
  const solved = useMemo(() => {
    try {
      return { ok: true as const, answer: solve(pc, exitValue).answers[0]! };
    } catch (e) {
      return { ok: false as const, message: withoutCodes((e as Error).message) };
    }
  }, [pc, exitValue]);

  const analysis = useAnalysis(good.built.json);
  const ready = analysis.status === "ready" ? analysis : null;
  // How your payout bends or jumps at each breakpoint, if it does: the curves mark those breakpoints,
  // and the list says how.
  const changes = useMemo(() => {
    if (!ready) return [];
    const nodes = seriesNodes(ready.curve, "holder", you);
    return ready.breakpoints.map((_, i) => changeAt(nodes, i + 1));
  }, [ready, you]);
  const yours = useMemo(() => changes.map((c) => c !== null), [changes]);

  const [tab, setTab] = useState<Tab>("payouts");
  // "Fix it" on the payouts tab opens the editor at the field the engine named.
  const focusAfterSwitch = useRef<string | null>(null);
  useEffect(() => {
    if (tab === "editor" && focusAfterSwitch.current) {
      document.getElementById(focusAfterSwitch.current)?.focus();
      focusAfterSwitch.current = null;
    }
  }, [tab]);
  const fixIt = () => {
    focusAfterSwitch.current = draftError?.field ?? null;
    setTab("editor");
  };

  const summary = solved.ok
    ? `At ${shortDollars(exitValue)}, ${yourName} gets ${shortDollars(solved.answer.payout.holderTotals.get(you) ?? new D(0))}.`
    : "";

  return (
    <main>
      <p className="example-label">
        {start.fictional && <span className="badge">Fictional example</span>} {start.label}
        {edited && start.id !== SCRATCH ? ", with your changes" : ""}
      </p>
      <Tabs tab={tab} onTab={setTab} />

      <div role="tabpanel" id="panel-payouts" aria-labelledby="tab-payouts" hidden={tab !== "payouts"}>
        {draftError && (
          <div className="notice notice--problem" role="status">
            <strong>Your last change to the cap table has a problem, so these payouts are from before it.</strong> {draftError.message}{" "}
            <button type="button" className="link-button" onClick={fixIt}>
              Fix it
            </button>
          </div>
        )}
        {solved.ok ? (
          <FounderView pc={pc} range={exit.range} answer={solved.answer} exitValue={exitValue} you={you} onChooseYou={(id) => setYouKey(keyOf(id))} breakpoints={analysis} />
        ) : (
          <p className="card card--quiet">
            The engine couldn't settle on an answer at {shortDollars(exitValue)}: {solved.message}
          </p>
        )}
        <ExitSlider range={exit.range} value={exitValue} onChange={setExitValue} breakpoints={ready ? ready.breakpoints : []} />
        {analysis.status === "computing" && <p className="card card--quiet">Working out the curves and breakpoints…</p>}
        {analysis.status === "error" && <p className="card card--quiet">Couldn't work out the curves and breakpoints: {withoutCodes(analysis.message)}</p>}
        {ready && (
          <PayoffChart
            // A new range starts the chart over at the whole range.
            key={`${lo.toString()}-${hi.toString()}`}
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
        {solved.ok && <PayoutTable pc={pc} answer={solved.answer} exitValue={exitValue} you={you} />}
        {ready && <BreakpointList breakpoints={ready.breakpoints} changes={changes} yourName={yourName} exitValue={exitValue} onExitValue={setExitValue} />}
      </div>

      <div role="tabpanel" id="panel-editor" aria-labelledby="tab-editor" hidden={tab !== "editor"}>
        <CapTableEditor draft={draft} onDraft={edit} error={draftError} summary={summary} />
      </div>
    </main>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "payouts", label: "Payouts" },
  { id: "editor", label: "Cap table" },
];

/** Two tabs, with the arrow keys moving between them as screen-reader users expect. */
function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + 1) % TABS.length]!.id;
    onTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label="View">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={tab === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={tab === t.id ? 0 : -1}
          onClick={() => onTab(t.id)}
          onKeyDown={onKeyDown}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
