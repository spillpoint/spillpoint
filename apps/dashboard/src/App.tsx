// The dashboard: the founder view, the exit value, the payoff curves, who
// gets what, what each payment pays when the price is paid over time (M5l),
// and the breakpoints, on one tab; the cap table editor on the
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
import { PaymentsView } from "./PaymentsView.tsx";
import { PayoutTable } from "./PayoutTable.tsx";
import { RoundsView } from "./RoundsView.tsx";
import { useAnalysis } from "./analysis.ts";
import { defaultHolder } from "./capTable.ts";
import { changeAt, nodeAt, seriesNodes } from "./curves.ts";
import { buildExit, carryExitTerms, checkBuilt, fieldId, scratchDraft } from "./draft.ts";
import type { Built, Checked, Draft } from "./draft.ts";
import { fileName, fileText, readFile } from "./file.ts";
import { ImportReview } from "./ImportReview.tsx";
import type { ImportUse } from "./ImportReview.tsx";
import { importOcf } from "./ocfImport.ts";
import type { Imported } from "./ocfImport.ts";
import { shortDollars, withoutCodes } from "./format.ts";
import { dateText, eventViews, exampleContents, fromRounds } from "./rounds.ts";
import type { Rounds } from "./rounds.ts";
import { BLANK, addEvent, blankRounds, buildRounds, draftFromRounds, draftTitle, eventFieldId, locate, otherBlanks, startingRounds, withStart } from "./roundsDraft.ts";
import type { Origin, RoundsDraft, RoundsProblem } from "./roundsDraft.ts";

const SCRATCH = "scratch";
const SCRATCH_ROUNDS = "scratch-rounds";
const FILE = "file";
/** A cap table imported from an Open Cap Format export (M6). */
const IMPORTED = "imported";

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
  /** An import's date and issue order, kept for "Add a round". */
  origin?: Origin;
}

function startFrom(id: string): Start {
  const example = examples.find((e) => e.id === id);
  if (id === SCRATCH_ROUNDS) {
    // One founder with all the common stock, as one event to build on (M4k).
    const rounds = blankRounds();
    const built = fromRounds(rounds, ["0", "100000000"]);
    if (!built.ok) throw built.error;
    return { id, label: "Your own company", fictional: false, draft: built.draft, name: "My company", defaultExitValue: "50000000", rounds };
  }
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
  /** The import's date and issue order, while the cap table is still the one it gave. */
  origin: Origin | null;
  /** An event to open on the Rounds tab as the workspace starts, by key: the round an import was used to add. */
  opening: string | null;
}

function newSession(start: Start, n: number): Session {
  // You start as the holder a saved view names, or else whoever holds the most common stock; edits don't move you.
  const built = buildExit(start.draft);
  const checked = checkBuilt(built);
  const you = start.you ?? (checked.ok ? defaultHolder(checked.exit.capTable) : undefined);
  const youKey = [...built.holderIds].find(([, id]) => id === you)?.[0] ?? null;
  const rounds = start.rounds ? draftFromRounds(start.rounds) : null;
  return {
    start, n, draft: start.draft, name: start.name, youKey, exitValue: new D(start.defaultExitValue), rounds, roundsGood: start.rounds, roundsProblem: null,
    origin: start.origin ?? null,
    opening: null,
  };
}

/**
 * A company's rounds started on a cap table (R31): the table on its own, and with a new priced round after it, whose
 * key is given. Or why the table can't start them yet.
 */
function roundsOn(table: Draft, origin: Origin | null): { ok: true; first: RoundsDraft; next: RoundsDraft; key: string } | { ok: false; message: string } {
  const first = startingRounds(table, origin);
  const result = fromRounds(buildRounds(first), table.range);
  if (!result.ok) return { ok: false, message: result.message };
  const next = addEvent(first, "priced_round", result.tables.at(-1)!.capTable);
  return { ok: true, first, next, key: next.events.at(-1)!.key };
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
  // An OCF import being reviewed: its report and questions come before its cap table is used (M6 plan, answer 9).
  const [importing, setImporting] = useState<Extract<Imported, { ok: true }> | null>(null);
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
        const problem = locate(next, path, result.message);
        // A blank field: the event's other blanks too, all at once.
        if (problem.message !== BLANK || !problem.event) return { ...s, rounds: next, roundsProblem: problem };
        const ask = (r: typeof built) => {
          const again = fromRounds(r, s.draft.range);
          return again.ok ? null : { path: (again.error as { path?: string }).path ?? "", message: again.message };
        };
        return { ...s, rounds: next, roundsProblem: { ...problem, blanks: otherBlanks(next, built, problem, path, ask) } };
      }
      // The sale's terms stay as typed: its date, its carve-out and its payment schedules (M5 plan, item 13).
      const draft = carryExitTerms(s.draft, result.draft);
      const id = s.youKey !== null ? buildExit(s.draft).holderIds.get(s.youKey) : undefined;
      const youKey = id ? ([...buildExit(draft).holderIds].find(([, v]) => v === id)?.[0] ?? null) : s.youKey;
      return { ...s, rounds: next, roundsGood: built, roundsProblem: null, draft, youKey };
    });
    edit();
  };
  const begin = (start: Start, status: FileStatus) => {
    setImporting(null);
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
    // R31: with a starting table on this tab, the table that stays is another one, the one the payouts use.
    const used = rounds.events.find((e) => String(e.json.id) === rounds.after);
    const stays = rounds.start
      ? `The cap table the payouts use, after ${used ? draftTitle(used.json) : "the last event"}, stays exactly as it is now, and you edit it here in place of the one the company starts from. `
      : "The cap table itself stays exactly as it is now, and you can edit it. ";
    const yes = window.confirm(
      `Edit the cap table directly? This drops the ${rounds.events.length} events that build it, and what each one worked out on the Rounds tab. ` +
        `${stays}A save will keep the cap table, not the rounds. ` +
        `To get the rounds back, ${back}.`,
    );
    // The table left is no longer the import's, so its date and issue order go with the rounds.
    if (yes) {
      setSession((s) => ({ ...s, origin: null }));
      change({ rounds: null, roundsGood: null });
    }
  };
  /**
   * "Add a round" (R31; 0.5.0 plan, answer 8): the cap table as it stands becomes the one the company starts from,
   * and a new priced round follows it, for the Rounds tab to open. Its key, or null, with the reason, if the table
   * can't start a company yet.
   */
  const addRound = (): string | null => {
    if (session.rounds) return null;
    const made = roundsOn(session.draft, session.origin);
    if (!made.ok) {
      setFileStatus({ kind: "problem", text: `A round can't be added yet. ${made.message}` });
      return null;
    }
    // Built once on its own, so the payouts have the starting table while the new round's fields are blank.
    changeRounds(made.first);
    changeRounds(made.next);
    return made.key;
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
    download(name, fileText(session.name, session.draft, view, session.roundsGood, session.origin));
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
      ...(result.origin ? { origin: result.origin } : {}),
    };
    begin(start, { kind: "done", text: `Opened ${file.name}.` });
  };

  const importPicker = useRef<HTMLInputElement>(null);
  const openImport = () => {
    if (okToLose("Open an OCF export")) importPicker.current?.click();
  };
  const imported = async (chosen: File[]) => {
    const picked = await Promise.all(chosen.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    const result = await importOcf(picked);
    if (!result.ok) {
      setFileStatus({ kind: "problem", text: result.message });
      return;
    }
    setFileStatus(null);
    setImporting(result);
  };
  /** An import's cap table, once its questions are answered, opens as a saved file would; it isn't saved until you save it. */
  const applyImport = (use: ImportUse) => {
    const start = {
      id: IMPORTED,
      label: `${use.name}, imported from ${use.source}`,
      fictional: false,
      draft: use.draft,
      name: use.name,
      defaultExitValue: middleOf(use.draft.range),
      rounds: null,
      origin: { date: use.asOf, issueOrder: use.issueOrder },
    };
    if (!use.addRound) {
      begin(start, { kind: "done", text: `Imported ${use.name} from ${use.source}. It isn't saved yet: Save keeps it as a spillpoint file.` });
      setUnsaved(true);
      return;
    }
    // "Use it to add a round" (05b3b): the table starts the company's rounds, and the Rounds tab opens at a round that
    // converts its SAFEs and notes. Until one does, the Payouts tab says why it can't pay out.
    const made = roundsOn(use.draft, start.origin);
    if (!made.ok) {
      setFileStatus({ kind: "problem", text: `A round can't be added to it yet. ${made.message}` });
      return;
    }
    begin(start, null);
    changeRounds(made.first);
    changeRounds(made.next);
    setSession((s) => ({ ...s, opening: made.key }));
    setFileStatus({
      kind: "done",
      text: `Imported ${use.name} from ${use.source}, with a round to convert its SAFEs and notes. It isn't saved yet: Save keeps it as a spillpoint file.`,
    });
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
              <option value={SCRATCH_ROUNDS}>A blank company, built from its rounds</option>
              {session.start.id === FILE && <option value={FILE}>{session.start.name} (from a file)</option>}
              {session.start.id === IMPORTED && <option value={IMPORTED}>{session.start.name} (imported)</option>}
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
          <button type="button" className="file-button" onClick={openImport}>
            Open an OCF export
          </button>
          <input
            ref={importPicker}
            type="file"
            multiple
            accept=".zip,.json,application/zip,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Open an OCF export: a .zip, or the package's .ocf.json files"
            onChange={(e) => {
              const chosen = [...(e.target.files ?? [])];
              e.target.value = "";
              if (chosen.length > 0) void imported(chosen);
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
      {importing && (
        <ImportReview
          result={importing.result}
          files={importing.files}
          source={importing.source}
          skipped={importing.skipped}
          onUse={applyImport}
          onCancel={() => setImporting(null)}
        />
      )}
      {/* A new start begins fresh: its own holder, exit value and breakpoints. */}
      {!importing && <Workspace
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
        tables={tables}
        events={events}
        onEditDirectly={editDirectly}
        onAddRound={addRound}
        opening={session.opening}
      />}
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

/**
 * The Payouts tab before the engine has accepted any cap table to pay out: an import used to add a round, whose SAFEs
 * and notes no round converts yet (05b3b; Jordan's answer 2). It shows the engine's message, and what the round still
 * needs.
 */
function NoPayoutsYet({ problem, rounds, onFixRounds }: { problem: DraftError | null; rounds: RoundsProblem | null; onFixRounds: () => void }) {
  return (
    <>
      <div className="notice notice--problem" role="status">
        <strong>The payouts can't be worked out yet.</strong> {problem?.message} Once a round on the Rounds tab converts the SAFEs and notes, the payouts
        use the cap table after it.
      </div>
      {rounds && (
        <div className="notice notice--problem" role="status">
          <strong>The rounds have a problem to fix first.</strong> {rounds.message}{" "}
          <button type="button" className="link-button" onClick={onFixRounds}>
            Fix it
          </button>
        </div>
      )}
    </>
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
  tables: ReturnType<typeof buildCapTables> | null;
  events: ReturnType<typeof eventViews> | null;
  onEditDirectly: () => void;
  /** Starts the company's rounds on this cap table, with a new round; its key, or null if it can't. */
  onAddRound: () => string | null;
  /** An event to open on the Rounds tab as the workspace starts, by key. */
  opening: string | null;
}

function Workspace(props: WorkspaceProps) {
  const { start, draft, name, built, checked, edited, unsaved, onDraft, onName, youKey, onYouKey, chosenExitValue, onExitValue: setExitValue } = props;
  const { rounds, onRounds, roundsProblem, tables, events, onEditDirectly, onAddRound, opening } = props;
  const lastGood = useRef<Good | null>(null);
  if (checked.ok && lastGood.current?.built !== built) lastGood.current = { built, checked };
  // Null until the engine first accepts a cap table to pay out: an import used to add a round whose SAFEs and notes no
  // round converts yet (05b3b). The Payouts tab then says why.
  const good = lastGood.current;
  const draftError: DraftError | null = checked.ok ? null : { field: checked.field, message: checked.message };

  const exit = good?.checked.exit ?? null;
  const pc = good?.checked.pc ?? null;
  const keyOf = (id: string) => [...(good?.built.holderIds ?? [])].find(([, v]) => v === id)?.[0] ?? "";
  const you = good && exit ? youIn(good.built, exit.capTable, youKey) : "";
  const yourName = exit?.capTable.holders.find((h) => h.id === you)?.name ?? "";

  const [lo, hi] = exit?.range ?? [null, null];
  const exitValue = useMemo(() => (lo && hi ? insideRange(chosenExitValue, [lo, hi]) : chosenExitValue), [lo, hi, chosenExitValue]);
  const solved = useMemo(() => {
    if (!pc) return { ok: false as const, message: "" };
    try {
      return { ok: true as const, answer: solve(pc, exitValue).answers[0]! };
    } catch (e) {
      return { ok: false as const, message: withoutCodes((e as Error).message) };
    }
  }, [pc, exitValue]);

  const analysis = useAnalysis(good?.built.json ?? null);
  const ready = analysis.status === "ready" ? analysis : null;
  // How your payout bends or jumps at each breakpoint, if it does: the curves mark those breakpoints,
  // and the list says how. On a curved side the rate is the one right at the breakpoint (X17).
  const changes = useMemo(() => {
    if (!ready) return [];
    const nodes = seriesNodes(ready.curve, "holder", you);
    const rate = (r: { holders: Record<string, string> } | undefined) => (r ? new D(r.holders[you] ?? "0") : undefined);
    return ready.breakpoints.map((b) => changeAt(nodes, nodeAt(nodes, new D(b.exitValue)), { below: rate(b.rates.below), above: rate(b.rates.above) }));
  }, [ready, you]);
  const yours = useMemo(() => changes.map((c) => c !== null), [changes]);

  const [tab, setTab] = useState<Tab>(opening ? "rounds" : "payouts");
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
  // The Rounds tab's link to the sale's terms: the Cap table tab, at its Exit terms card.
  const toExitTerms = () => {
    focusAfterSwitch.current = fieldId.exitTerms;
    setTab("editor");
  };
  // Which events are open for editing on the Rounds tab, by key.
  const [editing, setEditing] = useState<ReadonlySet<string>>(() => new Set(opening ? [opening] : []));
  // An event opened as the workspace starts gets the keyboard at its first field.
  useEffect(() => {
    if (opening) setTimeout(() => document.getElementById(eventFieldId(opening, "date"))?.focus(), 0);
    // Only as it starts: a new start remounts the workspace.
  }, []);
  const fixRounds = () => {
    if (!roundsProblem) return;
    // R31: a problem in the starting table is fixed where it's edited, on the Cap table tab.
    if (roundsProblem.onTable) {
      focusAfterSwitch.current = roundsProblem.fields[0] ?? null;
      setTab("editor");
      return;
    }
    if (roundsProblem.event) setEditing((open) => new Set([...open, roundsProblem.event!]));
    setTab("rounds");
    // The field once the event's form has rendered: the one the engine named, or the nearest one above it.
    setTimeout(() => {
      const field = roundsProblem.fields.map((f) => document.getElementById(f)).find((el) => el);
      (field ?? document.getElementById(`round-problem-${roundsProblem.event ?? "rounds"}`))?.focus();
    }, 0);
  };

  // "Add a round": straight to the new round, open for editing at its first field.
  const addRound = () => {
    const key = onAddRound();
    if (!key) return;
    setEditing((open) => new Set([...open, key]));
    setTab("rounds");
    setTimeout(() => document.getElementById(eventFieldId(key, "date"))?.focus(), 0);
  };
  const toCapTable = (field?: string) => {
    focusAfterSwitch.current = field ?? null;
    setTab("editor");
  };
  // R31: the cap table a company starts from, edited on the Cap table tab; the rounds after it are built again on each change.
  const startEvent = rounds?.events[0]?.json.type === "start" ? rounds.events[0] : undefined;
  const after = rounds?.events.find((e) => String(e.json.id) === rounds.after);
  const startTable =
    rounds?.start && startEvent
      ? {
          draft: rounds.start,
          onDraft: (table: Draft) => onRounds(withStart(rounds, table)),
          error: roundsProblem?.onTable ? { field: roundsProblem.fields[0] ?? null, message: roundsProblem.message } : null,
          date: typeof startEvent.json.date === "string" && startEvent.json.date ? dateText(startEvent.json.date) : null,
          after: after && after !== startEvent ? draftTitle(after.json) : null,
        }
      : null;

  const summary = solved.ok
    ? `At ${shortDollars(exitValue)}, ${yourName} gets ${shortDollars(solved.answer.payout.holderTotals.get(you) ?? new D(0))}.`
    : "";

  return (
    <main>
      <p className="example-label">
        {start.fictional && <span className="badge">Fictional example</span>} {start.label}
        {rounds ? `, built from its ${rounds.events.length === 1 ? "1 event" : `${rounds.events.length} events`}` : ""}
        {edited && start.id !== SCRATCH && start.id !== SCRATCH_ROUNDS ? ", with your changes" : ""}
        {unsaved && <span className="tag tag--quiet example-label__unsaved">Not saved</span>}
      </p>
      <Tabs tab={tab} onTab={setTab} />

      <div role="tabpanel" id="panel-payouts" aria-labelledby="tab-payouts" hidden={tab !== "payouts"}>
        {good && exit && pc ? (
          <>
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
              key={`${exit.range[0].toString()}-${exit.range[1].toString()}`}
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
          {exit.paymentSchedules && <PaymentsView pc={pc} schedules={exit.paymentSchedules} you={you} />}
          {ready && <BreakpointList breakpoints={ready.breakpoints} changes={changes} yourName={yourName} exitValue={exitValue} onExitValue={setExitValue} />}
          </>
        ) : (
          <NoPayoutsYet problem={draftError} rounds={roundsProblem} onFixRounds={fixRounds} />
        )}
      </div>

      <div role="tabpanel" id="panel-editor" aria-labelledby="tab-editor" hidden={tab !== "editor"}>
        <CapTableEditor
          draft={draft}
          onDraft={onDraft}
          name={name}
          onName={onName}
          error={draftError}
          summary={summary}
          rounds={rounds ? { events: rounds.events.length, onEditDirectly, start: startTable } : null}
          onAddRound={rounds ? null : addRound}
        />
      </div>

      <div role="tabpanel" id="panel-rounds" aria-labelledby="tab-rounds" hidden={tab !== "rounds"}>
        <RoundsView
          events={events}
          you={you}
          rounds={rounds}
          onRounds={onRounds}
          problem={roundsProblem}
          tables={tables}
          editing={editing}
          onEditing={setEditing}
          onExitTerms={toExitTerms}
          onCapTable={toCapTable}
          onAddRound={rounds ? null : addRound}
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
