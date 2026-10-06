// The dashboard: the founder view, the exit value, the payoff curves, who
// gets what, and the breakpoints, on one tab; the cap table editor on the
// second; and the rounds that built the cap table, if it was built from them,
// on the third (M4i). It starts from an example, a blank table or a saved
// file (M3 plan, answers 2 and 4), and saves to a file; nothing is kept
// anywhere else.

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { D, buildCapTables, parseExact, solve } from "spillpoint";
import type { CapTable } from "spillpoint";
import build from "virtual:build";
import examples from "virtual:examples";

import { BreakpointList } from "./BreakpointList.tsx";
import { CapTableEditor } from "./CapTableEditor.tsx";
import type { DraftError } from "./CapTableEditor.tsx";
import { ExitSlider } from "./ExitSlider.tsx";
import { FounderView } from "./FounderView.tsx";
import { PayoffChart } from "./PayoffChart.tsx";
import { PayoutTable } from "./PayoutTable.tsx";
import { RoundsView } from "./RoundsView.tsx";
import { useAnalysis } from "./analysis.ts";
import { defaultHolder } from "./capTable.ts";
import { changeAt, seriesNodes } from "./curves.ts";
import { buildExit, checkBuilt, scratchDraft } from "./draft.ts";
import type { Built, Checked, Draft } from "./draft.ts";
import { fileName, fileText, readFile } from "./file.ts";
import { shortDollars, withoutCodes } from "./format.ts";
import { eventViews, exampleContents, fromRounds } from "./rounds.ts";
import type { Rounds } from "./rounds.ts";
import { buildRounds, draftFromRounds, locate } from "./roundsDraft.ts";
import type { RoundsDraft, RoundsProblem } from "./roundsDraft.ts";

const SCRATCH = "scratch";
const FILE = "file";

/** Where a cap table starts: an example from cases/, a blank table, or a file. */
interface Start {
  id: string;
  label: string;
  fictional: boolean;
  draft: Draft;
  /** What it's called, and so what its file is called when saved. */
  name: string;
  defaultExitValue: string;
  /** The holder it opens on, by id; otherwise the largest common holder. */
  you?: string;
  /** The company's rounds, when the cap table is built from them (M4i). */
  rounds: Rounds | null;
}

function startFrom(id: string): Start {
  const example = examples.find((e) => e.id === id);
  if (!example) {
    return { id: SCRATCH, label: "Your own cap table, started blank", fictional: false, draft: scratchDraft(), name: "My cap table", defaultExitValue: "50000000", rounds: null };
  }
  return {
    id,
    label: example.label,
    fictional: example.fictional,
    ...exampleContents(example),
    name: `${example.label}${example.fictional ? " (fictional)" : ""}`,
    defaultExitValue: example.defaultExitValue,
  };
}

/** A file without a saved view starts halfway up its range. */
function middleOf(range: [string, string]): string {
  const [lo, hi] = range.map((v, i) => parseExact(v, `range[${i}]`));
  return lo!.plus(hi!).div(2).toSignificantDigits(3, D.ROUND_HALF_UP).toFixed();
}

/**
 * The cap table being worked on, from where it started, and where you're
 * looking at it: the holder you are and the exit value, which a save keeps.
 * A new one remounts the workspace.
 */
interface Session {
  start: Start;
  n: number;
  draft: Draft;
  name: string;
  /** The holder you are, by editor key; null for the largest common holder. */
  youKey: string | null;
  /** The exit value as chosen; it's kept inside the range when shown. */
  exitValue: D;
  /** The rounds that build the cap table, as typed (M4j), until someone edits the table directly. */
  rounds: RoundsDraft | null;
  /** The last rounds the engine built: what the Rounds tab shows and a save keeps. */
  roundsGood: Rounds | null;
  /** The engine's objection to the rounds as typed, if it has one. */
  roundsProblem: RoundsProblem | null;
}

function newSession(start: Start, n: number): Session {
  // You start as the holder a saved view names, or else whoever holds the most common stock; edits don't move you.
  const built = buildExit(start.draft);
  const checked = checkBuilt(built);
  const you = start.you ?? (checked.ok ? defaultHolder(checked.exit.capTable) : undefined);
  const youKey = [...built.holderIds].find(([, id]) => id === you)?.[0] ?? null;
  const rounds = start.rounds ? draftFromRounds(start.rounds) : null;
  return { start, n, draft: start.draft, name: start.name, youKey, exitValue: new D(start.defaultExitValue), rounds, roundsGood: start.rounds, roundsProblem: null };
}

/** The holder you are, by id in this cap table: the one chosen, or else whoever holds the most common stock. */
function youIn(built: Built, capTable: CapTable, youKey: string | null): string {
  return (youKey !== null ? built.holderIds.get(youKey) : undefined) ?? defaultHolder(capTable);
}

/** The exit value, kept inside the range even when an edit narrows it. */
const insideRange = (x: D, [lo, hi]: readonly [D, D]) => D.min(hi, D.max(lo, x));

type FileStatus = { kind: "done" | "problem"; text: string } | null;

/** Saving means downloading the file; nothing leaves the computer, and the link is let go straight after. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Leaving or reloading the page with unsaved changes asks first (M3 plan, answer 4). */
function useUnsavedWarning(unsaved: boolean) {
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers ask only when this is set.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
}

export function App() {
  const [session, setSession] = useState(() => newSession(startFrom(examples[0]!.id), 0));
  // Edited: changed since it started. Unsaved: changed since it started or was last saved.
  const [edited, setEdited] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus>(null);
  useUnsavedWarning(unsaved);

  const built = useMemo(() => buildExit(session.draft), [session.draft]);
  const checked = useMemo(() => checkBuilt(built), [built]);

  const edit = () => {
    setEdited(true);
    setUnsaved(true);
    setFileStatus(null);
  };
  const change = (patch: Partial<Pick<Session, "draft" | "name" | "rounds" | "roundsGood">>) => {
    setSession((s) => ({ ...s, ...patch }));
    edit();
  };
  /**
   * An edit to the rounds: the engine builds them again. If it accepts them,
   * the cap table they build replaces the old one, and you stay the same
   * holder; if not, its message is kept to show, and the payouts stay on the
   * last rounds it accepted.
   */
  const changeRounds = (next: RoundsDraft) => {
    setSession((s) => {
      const built = buildRounds(next);
      const result = fromRounds(built, s.draft.range);
      if (!result.ok) {
        const path = (result.error as { path?: string }).path ?? "";
        return { ...s, rounds: next, roundsProblem: locate(next, path, result.message) };
      }
      const id = s.youKey !== null ? buildExit(s.draft).holderIds.get(s.youKey) : undefined;
      const youKey = id ? ([...buildExit(result.draft).holderIds].find(([, v]) => v === id)?.[0] ?? null) : s.youKey;
      return { ...s, rounds: next, roundsGood: built, roundsProblem: null, draft: result.draft, youKey };
    });
    edit();
  };
  const begin = (start: Start, status: FileStatus) => {
    setSession((s) => newSession(start, s.n + 1));
    setEdited(false);
    setUnsaved(false);
    setFileStatus(status);
  };
  const okToLose = (what: string) => !unsaved || window.confirm(`${what}? Your unsaved changes to this cap table will be lost.`);

  // The cap table after each event, for the Rounds tab, from the last rounds the engine built.
  const rounds = session.rounds;
  const good = session.roundsGood;
  const tables = useMemo(() => (good ? buildCapTables({ holders: good.holders, events: good.events }) : null), [good]);
  const events = useMemo(() => (good && tables ? eventViews(good, tables) : null), [good, tables]);
  /** Asks first, and says what goes (M4 plan, answer 9): the rounds go, the cap table they built stays. */
  const editDirectly = () => {
    if (!rounds) return;
    const back = session.start.id === FILE ? "open the file again" : `start again from ${session.start.label}`;
    const yes = window.confirm(
      `Edit the cap table directly? This drops the ${rounds.events.length} events that build it, and what each one worked out on the Rounds tab. ` +
        `The cap table itself stays exactly as it is now, and you can edit it. A save will keep the cap table, not the rounds. ` +
        `To get the rounds back, ${back}.`,
    );
    if (yes) change({ rounds: null, roundsGood: null });
  };

  const choose = (id: string) => {
    if (okToLose("Start over")) begin(startFrom(id), null);
  };
  const save = () => {
    // Only a table the engine accepts is saved, so a saved file always opens.
    if (!checked.ok) {
      setFileStatus({ kind: "problem", text: `Not saved: the cap table has a problem to fix first. ${checked.message}` });
      return;
    }
    if (session.roundsProblem) {
      setFileStatus({ kind: "problem", text: `Not saved: the rounds have a problem to fix first. ${session.roundsProblem.message}` });
      return;
    }
    const name = fileName(session.name);
    // The view goes in too, so the file reopens where you were.
    const view = { exitValue: insideRange(session.exitValue, checked.exit.range).toString(), you: youIn(built, checked.exit.capTable, session.youKey) };
    download(name, fileText(session.name, session.draft, view, session.roundsGood));
    setUnsaved(false);
    setFileStatus({ kind: "done", text: `Saved as ${name}, in your downloads.` });
  };
  const picker = useRef<HTMLInputElement>(null);
  const open = () => {
    if (okToLose("Open a file")) picker.current?.click();
  };
  const opened = async (file: File) => {
    const result = readFile(await file.text());
    if (!result.ok) {
      setFileStatus({ kind: "problem", text: `Couldn't open ${file.name}. ${result.message}` });
      return;
    }
    const start = {
      id: FILE,
      label: `${result.name}, opened from ${file.name}`,
      fictional: false,
      draft: result.draft,
      name: result.name,
      defaultExitValue: result.view?.exitValue ?? middleOf(result.draft.range),
      ...(result.view ? { you: result.view.you } : {}),
      rounds: result.rounds,
    };
    begin(start, { kind: "done", text: `Opened ${file.name}.` });
  };

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__title">
          <span className="wordmark">spillpoint</span>
          <span className="masthead__tagline">Who gets what when the company is sold</span>
        </div>
        <div className="masthead__controls">
          <label className="masthead__example">
            Start from{" "}
            <select value={session.start.id} onChange={(e) => choose(e.target.value)}>
              {examples.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                  {e.fictional ? " (fictional)" : ""}
                </option>
              ))}
              <option value={SCRATCH}>A blank cap table</option>
              {session.start.id === FILE && <option value={FILE}>{session.start.name} (from a file)</option>}
            </select>
          </label>
          <button type="button" className="file-button" onClick={save}>
            Save
          </button>
          <button type="button" className="file-button" onClick={open}>
            Open
          </button>
          <input
            ref={picker}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Open a saved cap table"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void opened(file);
            }}
          />
        </div>
      </header>
      {fileStatus && (
        <p className={`file-status file-status--${fileStatus.kind}`} role={fileStatus.kind === "problem" ? "alert" : "status"}>
          {fileStatus.text}
        </p>
      )}
      <GovernanceNote />
      {/* A new start begins fresh: its own holder, exit value and breakpoints. */}
      <Workspace
        key={session.n}
        start={session.start}
        draft={session.draft}
        name={session.name}
        built={built}
        checked={checked}
        edited={edited}
        unsaved={unsaved}
        onDraft={(draft) => change({ draft })}
        onName={(name) => change({ name })}
        youKey={session.youKey}
        onYouKey={(youKey) => setSession((s) => ({ ...s, youKey }))}
        chosenExitValue={session.exitValue}
        onExitValue={(exitValue) => setSession((s) => ({ ...s, exitValue }))}
        rounds={rounds}
        onRounds={changeRounds}
        roundsProblem={session.roundsProblem}
        after={good?.after ?? null}
        tables={tables}
        events={events}
        onEditDirectly={editDirectly}
      />
      {/* Which engine made these numbers: the page runs the engine as of this commit, which can be ahead of the published version. */}
      <footer className="page-footer">
        spillpoint {build.engineVersion} ({build.commit})
      </footer>
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

type Tab = "payouts" | "editor" | "rounds";

interface WorkspaceProps {
  start: Start;
  draft: Draft;
  name: string;
  built: Built;
  checked: Checked;
  edited: boolean;
  unsaved: boolean;
  onDraft: (draft: Draft) => void;
  onName: (name: string) => void;
  /** Where you're looking. Changing it isn't an unsaved change to the cap table, though a save keeps it. */
  youKey: string | null;
  onYouKey: (key: string) => void;
  chosenExitValue: D;
  onExitValue: (x: D) => void;
  /** The rounds that build the cap table, as typed, and what each event did as last built; null when it was entered directly. */
  rounds: RoundsDraft | null;
  onRounds: (next: RoundsDraft) => void;
  roundsProblem: RoundsProblem | null;
  after: string | null;
  tables: ReturnType<typeof buildCapTables> | null;
  events: ReturnType<typeof eventViews> | null;
  onEditDirectly: () => void;
}

function Workspace(props: WorkspaceProps) {
  const { start, draft, name, built, checked, edited, unsaved, onDraft, onName, youKey, onYouKey, chosenExitValue, onExitValue: setExitValue } = props;
  const { rounds, onRounds, roundsProblem, after, tables, events, onEditDirectly } = props;
  const lastGood = useRef<Good | null>(null);
  if (checked.ok && lastGood.current?.built !== built) lastGood.current = { built, checked };
  const good = lastGood.current!;
  const draftError: DraftError | null = checked.ok ? null : { field: checked.field, message: checked.message };

  const { exit, pc } = good.checked;
  const keyOf = (id: string) => [...good.built.holderIds].find(([, v]) => v === id)?.[0] ?? "";
  const you = youIn(good.built, exit.capTable, youKey);
  const yourName = exit.capTable.holders.find((h) => h.id === you)?.name ?? "";

  const [lo, hi] = exit.range;
  const exitValue = useMemo(() => insideRange(chosenExitValue, [lo, hi]), [lo, hi, chosenExitValue]);
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
  // Which events are open for editing on the Rounds tab, by key.
  const [editing, setEditing] = useState<ReadonlySet<string>>(new Set());
  const fixRounds = () => {
    if (!roundsProblem) return;
    if (roundsProblem.event) setEditing((open) => new Set([...open, roundsProblem.event!]));
    setTab("rounds");
    // The field once the event's form has rendered: the one the engine named, or the nearest one above it.
    setTimeout(() => {
      const field = roundsProblem.fields.map((f) => document.getElementById(f)).find((el) => el);
      (field ?? document.getElementById(`round-problem-${roundsProblem.event ?? "rounds"}`))?.focus();
    }, 0);
  };

  const summary = solved.ok
    ? `At ${shortDollars(exitValue)}, ${yourName} gets ${shortDollars(solved.answer.payout.holderTotals.get(you) ?? new D(0))}.`
    : "";

  return (
    <main>
      <p className="example-label">
        {start.fictional && <span className="badge">Fictional example</span>} {start.label}
        {rounds ? `, built from its ${rounds.events.length} events` : ""}
        {edited && start.id !== SCRATCH ? ", with your changes" : ""}
        {unsaved && <span className="tag tag--quiet example-label__unsaved">Not saved</span>}
      </p>
      <Tabs tab={tab} onTab={setTab} />

      <div role="tabpanel" id="panel-payouts" aria-labelledby="tab-payouts" hidden={tab !== "payouts"}>
        {roundsProblem && (
          <div className="notice notice--problem" role="status">
            <strong>Your last change to the rounds has a problem, so these payouts are from before it.</strong> {roundsProblem.message}{" "}
            <button type="button" className="link-button" onClick={fixRounds}>
              Fix it
            </button>
          </div>
        )}
        {draftError && (
          <div className="notice notice--problem" role="status">
            <strong>Your last change to the cap table has a problem, so these payouts are from before it.</strong> {draftError.message}{" "}
            <button type="button" className="link-button" onClick={fixIt}>
              Fix it
            </button>
          </div>
        )}
        {solved.ok ? (
          <FounderView pc={pc} range={exit.range} answer={solved.answer} exitValue={exitValue} you={you} onChooseYou={(id) => onYouKey(keyOf(id))} breakpoints={analysis} />
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
        <CapTableEditor
          draft={draft}
          onDraft={onDraft}
          name={name}
          onName={onName}
          error={draftError}
          summary={summary}
          rounds={rounds ? { events: rounds.events.length, onEditDirectly } : null}
        />
      </div>

      <div role="tabpanel" id="panel-rounds" aria-labelledby="tab-rounds" hidden={tab !== "rounds"}>
        <RoundsView
          events={events}
          after={after}
          you={you}
          rounds={rounds}
          onRounds={onRounds}
          problem={roundsProblem}
          tables={tables}
          editing={editing}
          onEditing={setEditing}
        />
      </div>
    </main>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "payouts", label: "Payouts" },
  { id: "editor", label: "Cap table" },
  { id: "rounds", label: "Rounds" },
];

/** The tabs, with the keys screen-reader users expect: arrows to move between them, Home and End for the first and last. */
function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = TABS.findIndex((t) => t.id === tab);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = TABS[(to + TABS.length) % TABS.length]!.id;
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
