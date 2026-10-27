// The fund page (notes/plan-fund-page.md): an example fund from the locked cases, or a blank one, with an X box and a
// slider, the split at X for X alone and the fund to date (f01f), the chart and the breakpoints (f01g), the clawback
// with the NAV button (f01h), with LPs each LP's amounts (f02c), and with classes each class's, and with later closes
// the equalization (f03c), on the Payouts tab; the fund behind them, editable, on the Terms (f01i), Cash flows (f01j)
// and LPs (f02c, f03c) tabs, with from 0.4.0 a management fee schedule on Terms and its calls on Cash flows (f04c).
// Pasting cash flows and files come in f01k to f01m.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { D, equalization, feeCalls, FundRefusal, readFund, splitAt, splitAtNav } from "spillpoint-fund";
import type { CarryStep, Clawback as ClawbackAmounts, Fund, FundTerms, Split, Tiers } from "spillpoint-fund";
import examples from "virtual:fund-examples";
import build from "virtual:fund-build";

import { bendsClawback, breakpointViews, chartPoints, defaultTop, niceUp, owedPoints } from "./analysis.ts";
import type { BreakpointView } from "./analysis.ts";
import { Breakpoints } from "./Breakpoints.tsx";
import { CashFlows } from "./CashFlows.tsx";
import type { ScheduleView } from "./CashFlows.tsx";
import { Chart } from "./Chart.tsx";
import { ClassesCard } from "./ClassesCard.tsx";
import { Clawback, owesSomething } from "./Clawback.tsx";
import { EqualizationCard } from "./EqualizationCard.tsx";
import { equalizationCsv, equalizationCsvName } from "./equalizationCard.ts";
import type { EqualizationBlock } from "./equalizationCard.ts";
import { Terms } from "./Terms.tsx";
import { fileName, fileText, inputOf, readFile, UNNAMED } from "./file.ts";
import { blankFlows, flowsFrom, flowsProblem } from "./flows.ts";
import type { FlowsForm } from "./flows.ts";
import { useNarrow, useTooWide } from "./layout.ts";
import { Lps } from "./Lps.tsx";
import { FUND_TERMS, fundTermsClass, LP_WORDS, lpsFrom, lpsProblem, noLps } from "./lps.ts";
import type { LpsForm } from "./lps.ts";
import { LpsCard } from "./LpsCard.tsx";
import { lpsCsv, lpsCsvName } from "./lpsCard.ts";
import type { LpsTable } from "./lpsCard.ts";
import { controlFor, formFrom, TAB_WORDS, tabFor, termsProblem } from "./terms.ts";
import type { Problem, TermsForm } from "./terms.ts";
import { cents, dateText, lpMultipleText, parseDollars, percentText, short, stepMultiple, xText } from "./format.ts";

/** What the X box holds: the text typed, and the last amount that split, which the page shows while the text doesn't. */
interface XState {
  text: string;
  shown: D;
  problem: string | null;
}

const NOT_AN_AMOUNT = "Write an amount in dollars, 0 or more: 40000000, 40,000,000 or $40M.";

/** The range's top as typed: its text, the amount it set (null: the page's own choice), and why the text doesn't read. */
interface TopState {
  text: string | null;
  set: D | null;
  problem: string | null;
}

/**
 * The page's fund: the input the two forms write, the forms themselves, and the last fund the engine accepted, which
 * every payout shows. While the input has a problem, the payouts stay on that fund and say so (plan, "Refusals").
 */
interface Opened {
  input: Record<string, unknown>;
  terms: TermsForm;
  flows: FlowsForm;
  lps: LpsForm;
  /** Null for a blank fund until the engine first runs it. */
  fund: Fund | null;
  problem: Problem | null;
  /** Something has changed since the example or file was picked. */
  edited: boolean;
  /** The fund's name: a saved file is named after it (f01l). */
  name: string;
  opening: D;
  x: XState;
  top: TopState;
}

/** The picker's value for a blank fund, a fund opened from a file, and once an example has changed. */
const BLANK = "blank";
const FILE = "file";
const EDITED = "edited";

/** A blank fund's terms: F9's 20% carry, flat, and nothing else, each to change on the Terms tab. */
const BLANK_TERMS: FundTerms = { carry: [{ rate: new D("0.2"), fromLpMultiple: null }], pref: null, catchUp: null, gpCommitment: null, feeRate: null, equalizationRate: null, lpClasses: [], managementFee: null };

function opened(id: string): Opened {
  const fresh = { problem: null, edited: false, top: { text: null, set: null, problem: null } };
  if (id === BLANK) {
    const zero = new D(0);
    const s: Opened = { ...fresh, name: UNNAMED, input: {}, terms: formFrom(BLANK_TERMS), flows: blankFlows(), lps: noLps(), fund: null, opening: zero, x: { text: xText(zero), shown: zero, problem: null } };
    return { ...run(s, s.terms, s.flows, s.lps), edited: false };
  }
  const example = examples.find((e) => e.id === id)!;
  return fromFund(readFund(example.fund), example.label, parseDollars(example.defaultX)!);
}

/**
 * A fund the engine read, an example's or a file's, in the two tabs' forms. The input is the forms' own, so the fund
 * in the form is the fund in the file: a save with no change writes the same values back (f01l).
 */
function fromFund(fund: Fund, name: string, x: D): Opened {
  const terms = formFrom(fund.terms);
  const flows = flowsFrom(fund);
  const lps = lpsFrom(fund);
  return {
    problem: null,
    edited: false,
    top: { text: null, set: null, problem: null },
    name,
    input: inputOf(terms, flows, lps),
    terms,
    flows,
    lps,
    fund,
    opening: x,
    x: { text: xText(x), shown: x, problem: null },
  };
}

/**
 * The fund the three forms write, or the engine's refusal in the page's words, at the path it names. The engine checks
 * in its order (FA2, the LPs last by FA19), so the problem shown is its first, on whichever tab. Then the page's own
 * rule: no class takes "Fund terms", its name for the fund's own terms (f03c review, answer 3).
 */
function run(s: Opened, terms: TermsForm, flows: FlowsForm, lps: LpsForm): Opened {
  const input = inputOf(terms, flows, lps);
  try {
    const fund = readFund(input);
    const named = fundTermsClass(fund);
    if (named >= 0) return { ...s, input, terms, flows, lps, edited: true, problem: { path: `terms.lp_classes[${named}].name`, message: LP_WORDS.classFundTerms } };
    return { ...s, input, terms, flows, lps, edited: true, fund, problem: null };
  } catch (e) {
    if (!(e instanceof FundRefusal)) throw e;
    const tab = tabFor(e.path);
    const problem = tab === "terms" ? termsProblem(e, terms) : tab === "lps" ? lpsProblem(e, lps, terms) : flowsProblem(e, flows);
    return { ...s, input, terms, flows, lps, edited: true, problem };
  }
}

type Tab = "payouts" | "terms" | "flows" | "lps";
const TABS: { id: Tab; label: string }[] = [
  { id: "payouts", label: "Payouts" },
  { id: "terms", label: "Terms" },
  { id: "flows", label: "Cash flows" },
  { id: "lps", label: "LPs" },
];

/** The slider's positions: X moves in steps of a thousandth of the range. */
const POSITIONS = 1000;
/** Marks under the slider closer than this, in percent of its width, step down a row: about 30 pixels on a phone. */
const CROWDED = 9;

export function App() {
  const [exampleId, setExampleId] = useState(examples[0]!.id);
  // A fund opened from a file: "<name>, opened from <file>" in the picker.
  const [fileLabel, setFileLabel] = useState("");
  const [tab, setTab] = useState<Tab>("payouts");
  const [state, setState] = useState(() => opened(examples[0]!.id));
  const { fund, terms, flows, problem, edited, x } = state;
  // F30: with a schedule, its calls show on Cash flows once the fund runs, since they're the engine's.
  const schedule: ScheduleView | null =
    terms.managementFee.mode === "schedule"
      ? { calls: !problem && fund ? feeCalls(fund) : null, start: fund?.terms.managementFee?.start ?? terms.managementFee.start, gpPart: fund?.terms.gpCommitment?.paysFees ?? false }
      : null;
  // Where a schedule's start starts: the fund's first call, as the Cash flows tab has it.
  const firstCall = flows.rows.filter((r) => r.type === "call" && r.date).map((r) => r.date).sort()[0] ?? "";
  // A problem's field, to focus once its tab shows it.
  const [focusing, setFocusing] = useState<string | null>(null);
  useEffect(() => {
    if (focusing === null || tab === "payouts") return;
    // A class's carry in steps refused as a whole (F8, F22) has no box of its own: its first step's rate carries it.
    const el = document.getElementById(focusing) ?? document.getElementById(`${focusing}.steps[0].rate`);
    el?.focus();
    el?.scrollIntoView?.({ block: "center" });
    setFocusing(null);
  }, [focusing, tab]);
  const show = (path: string) => {
    setTab(tabFor(path));
    setFocusing(controlFor(path));
  };

  // Unsaved: changed since the last open, save or example (f01l). Moving X isn't a change, though a save keeps it.
  const [unsaved, setUnsaved] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus>(null);
  useUnsavedWarning(unsaved);
  /** A change to the fund: its terms, its cash flows or its name. */
  const change = (next: (s: Opened) => Opened) => {
    setState(next);
    setUnsaved(true);
    setFileStatus(null);
  };
  // As the main page asks before unsaved changes are lost.
  const okToLose = (what: string) => !unsaved || window.confirm(`${what}? Your unsaved changes to this fund will be lost.`);

  const choose = (id: string) => {
    if (!okToLose("Start over")) return;
    setExampleId(id);
    setState(opened(id));
    setUnsaved(false);
    setFileStatus(null);
  };

  /** Only a fund the engine accepts is saved, so a saved file always opens; X goes in too, so it reopens where it was. */
  const save = () => {
    if (!fund || problem) {
      const where = `the ${TAB_WORDS[problem ? tabFor(problem.path) : "flows"]} have`;
      setFileStatus({ kind: "problem", text: `Not saved: ${where} a problem to fix first. ${problem?.message ?? ""}`.trim() });
      return;
    }
    const name = fileName(state.name);
    download(name, fileText(state.name, inputOf(terms, flows, state.lps), x.shown), "application/json");
    setUnsaved(false);
    setFileStatus({ kind: "done", text: `Saved as ${name}, in your downloads.` });
  };
  const picker = useRef<HTMLInputElement>(null);
  const open = () => {
    if (okToLose("Open a file")) picker.current?.click();
  };
  /** A saved fund, a bare input or a case's inputs.json; refused in one line, the current fund kept. */
  const openFile = async (file: File) => {
    const result = readFile(await file.text());
    if (!result.ok) {
      setFileStatus({ kind: "problem", text: `Couldn't open ${file.name}. ${result.message}` });
      return;
    }
    setExampleId(FILE);
    setFileLabel(`${result.name}, opened from ${file.name}`);
    setState(fromFund(result.fund, result.name, result.x ?? new D(0)));
    setUnsaved(false);
    // A fraction is kept to the engine's 40 digits, and a save writes it so: said, not silent (f01l review, answer 2).
    const fractions = result.fraction ? ` Its fractions, like ${result.fraction}, are kept to 40 digits, and a save writes them that way.` : "";
    setFileStatus({ kind: "done", text: `Opened ${file.name}.${fractions}` });
  };

  /** The LPs' card as a CSV, named after the fund, X and D; as with Save, nothing leaves the computer. */
  const downloadLps = (table: LpsTable, at: D) => {
    if (!fund) return;
    const name = lpsCsvName(state.name, at, fund.distributionDate);
    download(name, lpsCsv(table), "text/csv;charset=utf-8");
    setFileStatus({ kind: "done", text: `Downloaded as ${name}, in your downloads.` });
  };
  /** The equalization card as a CSV, named after the fund: it has no X or D. */
  const downloadEqualization = (blocks: EqualizationBlock[]) => {
    const name = equalizationCsvName(state.name);
    download(name, equalizationCsv(blocks), "text/csv;charset=utf-8");
    setFileStatus({ kind: "done", text: `Downloaded as ${name}, in your downloads.` });
  };

  /** X set exactly, by the slider, a mark or a breakpoint: the box shows it. */
  const setX = (v: D) => setState((s) => ({ ...s, x: { text: xText(v), shown: v, problem: null } }));

  const typeTop = (text: string) => {
    const amount = parseDollars(text);
    setState((s) =>
      amount && amount.gt(0)
        ? { ...s, top: { text, set: amount, problem: null } }
        : { ...s, top: { ...s.top, text, problem: "Write an amount above $0: 100000000, 100,000,000 or $100M." } },
    );
  };

  const typeX = (text: string) => {
    const amount = parseDollars(text);
    if (amount === null) {
      setState((s) => ({ ...s, x: { ...s.x, text, problem: NOT_AN_AMOUNT } }));
      return;
    }
    try {
      if (fund) splitAt(fund, amount);
      setState((s) => ({ ...s, x: { text, shown: amount, problem: null } }));
    } catch (e) {
      // FA13: the engine refuses an X it can't split, at the path "x"; the page says so beside the box.
      if (!(e instanceof FundRefusal)) throw e;
      setState((s) => ({ ...s, x: { ...s.x, text, problem: NOT_AN_AMOUNT } }));
    }
  };

  // A blank fund stays "A blank fund" as it's filled in, and a file its name; an example changed isn't the case any
  // more (f01i).
  const pickerValue = edited && exampleId !== BLANK && exampleId !== FILE ? EDITED : exampleId;
  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__title">
          <span className="wordmark">spillpoint</span>
          <span className="masthead__tagline">How a fund's distribution splits between LPs and GP</span>
        </div>
        <div className="masthead__controls">
          <label className="masthead__example">
            Start from{" "}
            <select value={pickerValue} onChange={(e) => e.target.value !== EDITED && choose(e.target.value)}>
              {pickerValue === EDITED && <option value={EDITED}>An example, with your changes</option>}
              {examples.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                  {e.fictional ? " (fictional)" : ""}
                </option>
              ))}
              <option value={BLANK}>A blank fund</option>
              {exampleId === FILE && <option value={FILE}>{fileLabel}</option>}
            </select>
          </label>
          <button type="button" className="file-button" onClick={save}>
            Save
          </button>
          <button type="button" className="file-button" onClick={open}>
            Open a file
          </button>
          <input
            ref={picker}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Open a saved fund"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void openFile(file);
            }}
          />
        </div>
      </header>
      {fileStatus && (
        <p className={`file-status file-status--${fileStatus.kind}`} role={fileStatus.kind === "problem" ? "alert" : "status"}>
          <Coded text={fileStatus.text} />
        </p>
      )}
      <GovernanceNote />
      <main>
        <p className="example-label">
          {fund ? summaryText(fund, edited && exampleId !== BLANK) : "A blank fund: its payouts show here once it has an as-of date, its terms and its cash flows."}
          {unsaved && <span className="tag tag--quiet example-label__unsaved">Not saved</span>}
        </p>
        <Tabs tab={tab} onTab={setTab} />
        <div role="tabpanel" id="panel-payouts" aria-labelledby="tab-payouts" hidden={tab !== "payouts"}>
          {fund ? (
            <>
              {problem && (
                <div className="notice notice--problem" role="status">
                  <strong>Your last change to the {TAB_WORDS[tabFor(problem.path)]} has a problem, so these payouts are from the fund before it.</strong>{" "}
                  {problem.message}{" "}
                  <button type="button" className="link-button" onClick={() => show(problem.path)}>
                    Fix it
                  </button>
                </div>
              )}
              <Payouts fund={fund} state={state} onX={setX} onTypeX={typeX} onTop={typeTop} onDownloadLps={downloadLps} onDownloadEqualization={downloadEqualization} />
            </>
          ) : (
            <div className="card" role="status">
              <strong>No payouts yet.</strong> {problem?.message}{" "}
              {problem && (
                <button type="button" className="link-button" onClick={() => show(problem.path)}>
                  Fix it
                </button>
              )}
            </div>
          )}
        </div>
        <div role="tabpanel" id="panel-terms" aria-labelledby="tab-terms" hidden={tab !== "terms"}>
          <Terms
            name={state.name}
            onName={(name) => change((s) => ({ ...s, name, edited: true }))}
            form={terms}
            problem={problem}
            onForm={(next) => change((s) => run(s, next, s.flows, s.lps))}
            onShow={show}
            listsLps={state.lps.rows.length > 0}
            firstCall={firstCall}
          />
        </div>
        <div role="tabpanel" id="panel-flows" aria-labelledby="tab-flows" hidden={tab !== "flows"}>
          <CashFlows form={flows} problem={problem} onForm={(next) => change((s) => run(s, s.terms, next, s.lps))} onShow={show} schedule={schedule} />
        </div>
        <div role="tabpanel" id="panel-lps" aria-labelledby="tab-lps" hidden={tab !== "lps"}>
          <Lps
            form={state.lps}
            fundCarry={terms.carry}
            problem={problem}
            onForm={(next) => change((s) => run(s, s.terms, s.flows, next))}
            onShow={show}
            scheduled={terms.managementFee.mode === "schedule"}
          />
        </div>
      </main>
      {/* Which engine made these numbers: the page runs spillpoint-fund's sources as of this commit. The main page is
          one level up on the site, as this one is under /fund/ (f01n). */}
      <footer className="page-footer">
        spillpoint-fund {build.fundVersion} ({build.commit}) · <a href="../">Exit waterfall</a>
      </footer>
    </div>
  );
}

interface PayoutsProps {
  fund: Fund;
  state: Opened;
  onX: (x: D) => void;
  onTypeX: (text: string) => void;
  onTop: (text: string) => void;
  onDownloadLps: (table: LpsTable, x: D) => void;
  onDownloadEqualization: (blocks: EqualizationBlock[]) => void;
}

/** Everything about X's split, for a fund the engine accepted. */
function Payouts({ fund, state, onX, onTypeX, onTop, onDownloadLps, onDownloadEqualization }: PayoutsProps) {
  const { opening, x, top: topState } = state;
  const split = useMemo(() => splitAt(fund, x.shown), [fund, x.shown]);
  const breakpoints = useMemo(() => breakpointViews(fund), [fund]);
  // The range's top: as typed, or the page's own; an X past it raises it to 1.25 × X, so X's mark is never off the chart
  // (f01g review, answer 1).
  const base = topState.set ?? defaultTop(fund, breakpoints, opening);
  const top = x.shown.gt(base) ? niceUp(x.shown.times("1.25")) : base;
  const points = useMemo(() => chartPoints(fund, breakpoints, top), [fund, breakpoints, top]);
  // The clawback (F12): a final fund's at X; for a fund that isn't final, the NAV point's alone, which F14 takes as final.
  const atNav = fund.nav !== null && x.shown.eq(fund.nav);
  const clawbackAt = fund.final ? split : atNav ? splitAtNav(fund) : null;
  const owed = useMemo(() => (fund.final ? owedPoints(fund, breakpoints, top) : null), [fund, breakpoints, top]);
  const bends = useMemo(() => breakpoints.filter(bendsClawback), [breakpoints]);
  // F25: once for the fund, not by X; null without a later close.
  const moves = useMemo(() => equalization(fund), [fund]);
  // The cards after the split follow the NAV split at the NAV point, its clawback included, as the clawback card does.
  const shown = clawbackAt ?? split;
  return (
    <>
      <Headline fund={fund} split={split} clawback={clawbackAt?.clawback ?? null} />
      <XBox fund={fund} x={x} onType={onTypeX} top={top} topState={topState} onTop={onTop} breakpoints={breakpoints} onX={onX} />
      {/* The chart and the split are both about this distribution, so they sit together; the clawback, about the fund's life, after them (f01i). */}
      <Chart
        points={points}
        breakpoints={breakpoints}
        nav={fund.nav}
        x={x.shown}
        top={top}
        at={{ lps: split.distribution.lps.total, gp: split.distribution.gp.total, gpCommitment: split.distribution.gpCommitment }}
        hasCommitment={fund.terms.gpCommitment !== null}
        onX={onX}
      />
      <SplitTable fund={fund} split={split} />
      {/* Each class's own split (F26), only with two or more accounts. */}
      {shown.byAccount.length > 1 && <ClassesCard split={shown} />}
      {clawbackAt?.clawback && (
        <Clawback fund={fund} clawback={clawbackAt.clawback} accounts={clawbackAt.byAccount} points={owed} breakpoints={bends} x={x.shown} top={top} onX={onX} />
      )}
      {/* Each LP's amounts (F20), only with LPs: at the NAV point, the NAV split's, its clawback included. */}
      {fund.lps.length > 0 && <LpsCard split={shown} onDownload={(table) => onDownloadLps(table, x.shown)} />}
      {moves && <EqualizationCard equalization={moves} onDownload={onDownloadEqualization} />}
      <Breakpoints fund={fund} breakpoints={breakpoints} x={x.shown} onX={onX} />
    </>
  );
}

type FileStatus = { kind: "done" | "problem"; text: string } | null;

/** Saving means downloading the file; nothing leaves the computer, and the link is let go straight after. */
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Leaving or reloading the page with unsaved changes asks first, as the main page does. */
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

/** A line with a term in backticks set as code: "a term the page doesn't model: `hurdle_irr`." */
function Coded({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

function GovernanceNote() {
  return (
    <aside className="notice" aria-label="Before you rely on this">
      <strong>The fund's documents govern, not this tool.</strong> spillpoint models common fund terms with documented
      defaults; where your LPA differs, it wins. Everything runs on this computer: nothing you enter is sent anywhere.
    </aside>
  );
}

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

/**
 * The fund behind the answers, in one line under the picker, as the main page's "built from its 10 events" (f01i):
 * what's been paid in, what's been distributed before X, the NAV if there is one, and whether X is the last
 * distribution. The amounts are the cash flows' own, added up as entered, with a fee schedule's calls among them.
 */
export function summaryText(fund: Fund, edited = false): string {
  const calls = fund.cashFlows.filter((f) => f.type === "call");
  const distributions = fund.cashFlows.filter((f) => f.type === "distribution");
  const total = (flows: typeof calls) => flows.reduce((sum, f) => sum.plus(f.amount), new D(0));
  // F30: a schedule's fee calls are calls the engine works out, so what's paid in counts them too.
  const scheduled = feeCalls(fund) ?? [];
  const paidIn = scheduled.reduce((sum, c) => sum.plus(c.call), total(calls));
  const n = calls.length + scheduled.length;
  const ofThem = scheduled.length === 0 ? "" : ` (${scheduled.length === n ? "all" : scheduled.length} from its fee schedule)`;
  const parts = [
    `${short(paidIn)} paid in over ${n === 1 ? "1 call" : `${n} calls`}${ofThem}`,
    distributions.length === 0 ? "nothing distributed before X" : `${short(total(distributions))} distributed before X`,
    ...(fund.nav ? [`a NAV of ${short(fund.nav)} on ${dateText(fund.distributionDate)}`] : []),
  ];
  return `This fund${edited ? ", with your changes" : ""}: ${listed(parts)}. X ${fund.final ? "is" : "isn't"} its last distribution.`;
}

/** "a, b and c". */
function listed(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** A carry in words: "20%, 25% from 3.0x and 30% from 5.0x". */
function carryText(carry: readonly CarryStep[]): string {
  return listed(carry.map((s) => (s.fromLpMultiple ? `${percentText(s.rate)} from ${stepMultiple(s.fromLpMultiple)}` : percentText(s.rate))));
}

/**
 * The fund's terms in one line: "Carry 20%, 25% from 3.0x and 30% from 5.0x; no pref; GP commitment 1%, fee-free."
 * Then each class with LPs, by what it changes (F22): "Friends and family: carry 0%, no fees."
 */
function termsText(fund: Fund): string {
  const t = fund.terms;
  const carry = `Carry ${carryText(t.carry)}`;
  const pref = !t.pref
    ? "no pref"
    : `pref ${percentText(t.pref.rate)}, ${!t.catchUp ? "no catch-up" : t.catchUp.gpShare.eq(1) ? "full catch-up" : `${percentText(t.catchUp.gpShare)} catch-up`}`;
  const g = t.gpCommitment;
  const gp = !g
    ? "no GP commitment"
    : `GP commitment ${percentText(g.share)}, ${g.paysFees ? "paying its share of fees" : "fee-free"}${g.paysExpenses ? "" : ", not paying its share of expenses"}`;
  const classes = (t.lpClasses ?? []).filter((c) => fund.lps.some((lp) => lp.class === c.name));
  const classText = (c: (typeof classes)[number]) => {
    const parts = [...(c.carry ? [`carry ${carryText(c.carry)}`] : []), ...(c.feeRate === null ? [] : [c.feeRate.isZero() ? "no fees" : `fees at ${percentText(c.feeRate)}`])];
    return `${c.name}: ${parts.length > 0 ? parts.join(", ") : "the fund's terms"}.`;
  };
  return [`${carry}; ${pref}; ${gp}.`, ...classes.map(classText)].join(" ");
}

/**
 * The answer first, in neutral words: the same file goes to LPs and co-GPs (plan answer 6), and in one frame (f01i).
 * - A final fund: the GP's carry over the fund's life, if X is its last distribution, with what it gets now and gives
 *   back when it owes a clawback, so the carry is never shown without it (f01h).
 * - At NAV, a fund that isn't final: the same, as if it were liquidated there, since NAV is final by definition (F14;
 *   f01i review, answer 1).
 * - Otherwise: this distribution.
 */
export function answerText(fund: Fund, split: Split, clawback: ClawbackAmounts | null): string {
  const date = dateText(fund.distributionDate);
  const now = split.distribution.gp.total;
  if (clawback) {
    // F12, one way only: the GP ends with what it was paid less what it gives back, which is the less of what it was
    // paid and what it earned on the fund's totals.
    const ends = short(D.min(clawback.carryPaid, clawback.entitlement));
    const owes = owesSomething(clawback.owed);
    const gets = owesSomething(now);
    if (!fund.final) {
      const back = !owes ? "" : gets ? `: it would get ${short(now)} now and give back ${short(clawback.owed)}` : `: it would give back ${short(clawback.owed)}`;
      return `If the fund were liquidated at NAV, ${short(split.x)} on ${date}, the GP would end with ${ends} of carry${back}.`;
    }
    const lead = split.x.isZero() ? `If nothing more is distributed after ${date}` : `If ${short(split.x)} on ${date} is the last distribution`;
    const back = !owes ? "" : gets ? `: it gets ${short(now)} now and gives back ${short(clawback.owed)}` : `: it gives back ${short(clawback.owed)}`;
    return `${lead}, the GP ends with ${ends} of carry${back}.`;
  }
  const lead = split.x.isZero() ? `With nothing distributed on ${date}` : `At a ${short(split.x)} distribution on ${date}`;
  return `${lead}, the GP's carry is ${short(now)}.`;
}

/**
 * The LPs' side of this distribution. When the line above is about the fund's life (a final fund, or NAV), it says
 * it's this distribution's; at $0 there's none (f01i review, answer 2).
 */
export function restText(fund: Fund, split: Split, lifeFrame: boolean): string | null {
  const d = split.distribution;
  const commitment = fund.terms.gpCommitment ? ` and the GP commitment ${short(d.gpCommitment)}` : "";
  if (!lifeFrame) return `The LPs get ${short(d.lps.total)}${commitment}.`;
  return split.x.isZero() ? null : `Of the ${short(split.x)}, the LPs get ${short(d.lps.total)}${commitment}.`;
}

function Headline({ fund, split, clawback }: { fund: Fund; split: Split; clawback: ClawbackAmounts | null }) {
  const rest = restText(fund, split, clawback !== null);
  return (
    <section className="headline" aria-label="The answer">
      <p className="headline__terms">{termsText(fund)}</p>
      <p className="headline__answer">{answerText(fund, split, clawback)}</p>
      {rest && <p className="headline__rest">{rest}</p>}
    </section>
  );
}

interface XBoxProps {
  fund: Fund;
  x: XState;
  onType: (text: string) => void;
  top: D;
  topState: TopState;
  onTop: (text: string) => void;
  breakpoints: readonly BreakpointView[];
  onX: (x: D) => void;
}

/**
 * X: typed exactly, or set by the slider beside the box, from $0 to the range's top. Under the slider, each breakpoint
 * is a numbered mark and NAV a mark of its own; choosing one moves X there exactly.
 */
function XBox({ fund, x, onType, top, topState, onTop, breakpoints, onX }: XBoxProps) {
  const position = D.min(POSITIONS, x.shown.div(top).times(POSITIONS).round()).toNumber();
  const percent = (v: D) => v.div(top).times(100).toNumber();
  const marks = breakpoints.filter((b) => b.x.lte(top));
  // Each mark under the slider, breakpoints and NAV in order of X. A mark closer to the one before than CROWDED percent
  // of the slider steps down a row, so none overlap on a phone; the chart's numbers step up the same way.
  const placed: { key: string; at: number; label: string; text: string; nav: boolean; onClick: () => void }[] = [
    ...marks.map((b) => ({ key: `b${b.n}`, at: percent(b.x), label: `Breakpoint ${b.n}, at ${cents(b.x)}`, text: String(b.n), nav: false, onClick: () => onX(b.x) })),
    ...(fund.nav && fund.nav.lte(top) ? [{ key: "nav", at: percent(fund.nav), label: `NAV, at ${cents(fund.nav)}`, text: "NAV", nav: true, onClick: () => onX(fund.nav!) }] : []),
  ].sort((m, n) => m.at - n.at);
  const lastInRow: number[] = [];
  const rows = placed.map((m) => {
    let row = 0;
    while (lastInRow[row] !== undefined && m.at - lastInRow[row]! < CROWDED) row++;
    lastInRow[row] = m.at;
    return row;
  });
  return (
    <section className="card x-box" aria-label="The distribution">
      <div className="x-box__typed">
        <label htmlFor="x">Distribution on {dateText(fund.distributionDate)} (X)</label>
        <input id="x" type="text" inputMode="decimal" value={x.text} onChange={(e) => onType(e.target.value)} aria-describedby="x-problem" aria-invalid={x.problem !== null} />
      </div>
      {fund.nav && (
        // The NAV point (plan, "The NAV point"): X at NAV is the split as if the fund were liquidated on D (F14).
        <p className="x-box__nav">
          <button type="button" className="button" onClick={() => onX(fund.nav!)}>
            Set X to NAV
          </button>
          <span>
            At NAV, {cents(fund.nav)}, as if the fund were liquidated on {dateText(fund.distributionDate)}
            {fund.final ? "" : "; the clawback card then shows what the GP would owe back"}.
          </span>
          {x.shown.eq(fund.nav) && <span className="tag tag--quiet">X is at NAV</span>}
        </p>
      )}
      {x.problem && (
        <p id="x-problem" className="field-error" role="alert">
          {x.problem} Showing {xText(x.shown)}, the last amount that worked.
        </p>
      )}
      <div className="x-box__slider">
        <input
          type="range"
          min={0}
          max={POSITIONS}
          step={1}
          value={position}
          onChange={(e) => onX(top.times(Number(e.target.value)).div(POSITIONS))}
          aria-label={`X, from $0 to ${short(top)}`}
          aria-valuetext={xText(x.shown)}
        />
        <div className="x-box__marks" style={{ height: `${22 * Math.max(1, ...rows.map((r) => r + 1))}px` }}>
          {placed.map((m, i) => (
            <button
              key={m.key}
              type="button"
              className={`x-box__mark${m.nav ? " x-box__mark--nav" : ""}`}
              style={{ left: `${m.at}%`, top: `${rows[i]! * 22}px` }}
              aria-label={m.label}
              onClick={m.onClick}
            >
              {m.text}
            </button>
          ))}
        </div>
        <div className="x-box__ends" aria-hidden="true">
          <span>$0</span>
          <span>{short(top)}</span>
        </div>
      </div>
      <div className="x-box__top">
        <label htmlFor="top">The slider and the chart run up to</label>
        <input
          id="top"
          type="text"
          inputMode="decimal"
          value={topState.text ?? xText(top)}
          onChange={(e) => onTop(e.target.value)}
          aria-invalid={topState.problem !== null}
          aria-describedby="top-problem"
        />
        {topState.problem && (
          <p id="top-problem" className="field-error" role="alert">
            {topState.problem}
          </p>
        )}
      </div>
      {marks.length > 0 && <p className="x-box__caption">Each numbered mark is a breakpoint, listed below; choose one to move X there.</p>}
    </section>
  );
}

const NONE = "—";

/** One row of the split: X's amount and the fund to date's, for the LPs and the GP. */
function Row({ label, lps, gp }: { label: string; lps: [D, D] | null; gp: [D, D] | null }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num">{lps ? cents(lps[0]) : NONE}</td>
      <td className="num">{gp ? cents(gp[0]) : NONE}</td>
      <td className="num split__group">{lps ? cents(lps[1]) : NONE}</td>
      <td className="num">{gp ? cents(gp[1]) : NONE}</td>
    </tr>
  );
}

/** A tier of the split: its name, and X's amount and the fund to date's for each side, or none. */
interface SplitRow {
  label: string;
  lps: [D, D] | null;
  gp: [D, D] | null;
}

/**
 * One half of the split on a phone: "This distribution" (0) or "The fund to date" (1), with each tier's name on its own
 * line above its two amounts, as the main page's payouts table puts each holder's shares under the name (M3e). Each
 * tier is a row group, so its name is the header for both amounts.
 */
function NarrowSplit({ caption, which, rows, total }: { caption: string; which: 0 | 1; rows: SplitRow[]; total: SplitRow }) {
  const lines = (r: SplitRow) => (
    <>
      <tr>
        <th scope="rowgroup" colSpan={2}>
          {r.label}
        </th>
      </tr>
      <tr>
        <td className="num">{r.lps ? cents(r.lps[which]) : NONE}</td>
        <td className="num">{r.gp ? cents(r.gp[which]) : NONE}</td>
      </tr>
    </>
  );
  return (
    <table className="split split--narrow">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col" colSpan={2}>
            Tier
          </th>
        </tr>
        <tr>
          <th scope="col" className="num">
            LPs
          </th>
          <th scope="col" className="num">
            GP
          </th>
        </tr>
      </thead>
      {rows.map((r, i) => (
        <tbody key={i}>{lines(r)}</tbody>
      ))}
      <tfoot>{lines(total)}</tfoot>
    </table>
  );
}

/** The split as one table: each tier a row, X's amounts and the fund to date's side by side. */
function WideSplit({ ref, rows, total }: { ref: Ref<HTMLTableElement>; rows: SplitRow[]; total: SplitRow }) {
  return (
    <table ref={ref} className="split">
      <thead>
        <tr>
          <td />
          <th scope="colgroup" colSpan={2}>
            This distribution
          </th>
          <th scope="colgroup" colSpan={2} className="split__group">
            The fund to date
          </th>
        </tr>
        <tr>
          <th scope="col">Tier</th>
          <th scope="col" className="num">
            LPs
          </th>
          <th scope="col" className="num">
            GP
          </th>
          <th scope="col" className="num split__group">
            LPs
          </th>
          <th scope="col" className="num">
            GP
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <Row key={i} {...r} />
        ))}
      </tbody>
      <tfoot>
        <Row {...total} />
      </tfoot>
    </table>
  );
}

/** The split by tier (F16): a tier the terms don't have isn't shown, though the engine gives it as zero. */
function SplitTable({ fund, split }: { fund: Fund; split: Split }) {
  const box = useRef<HTMLDivElement>(null);
  const wide = useRef<HTMLTableElement>(null);
  const phone = useNarrow();
  const tooWide = useTooWide(box, wide, split);
  // Two tables on a phone always (f01m2), and wherever the one table wouldn't fit its card (f01n).
  const narrow = phone || tooWide;
  const now = split.distribution;
  const all = split.toDate;
  const pair = (f: (t: Tiers) => D): [D, D] => [f(now), f(all)];
  // The split's own steps: each account's, in order, the fund's terms first (F26). With one account they're its own,
  // the fund's or, when every LP is in one class, that class's (FA36).
  const steps = now.gp.carry;
  const named = split.byAccount.length > 1;
  // Each step is a band of the LPs' net multiple, one carry, not carry on top of carry (f01g, from Jordan's look at the
  // page): "Carry at 20% (up to 3.0x)", "Carry at 25% (3.0x to 5.0x)", "Carry at 30% (above 5.0x)". Flat: "Carry at 20%".
  // With two or more accounts, each names its class: "Fund terms: carry at 20% (up to 3.0x)" (f03c).
  const stepLabel = (i: number) => {
    const step = steps[i]!;
    const next = steps[i + 1]?.class === step.class ? steps[i + 1] : undefined;
    const [from, to] = [step.fromLpMultiple, next?.fromLpMultiple];
    const band = from && to ? `${stepMultiple(from)} to ${stepMultiple(to)}` : to ? `up to ${stepMultiple(to)}` : from ? `above ${stepMultiple(from)}` : null;
    const words = `at ${percentText(step.rate)}${band ? ` (${band})` : ""}`;
    return named ? `${step.class ?? FUND_TERMS}: carry ${words}` : `Carry ${words}`;
  };
  const rows: SplitRow[] = [
    { label: "Capital", lps: pair((t) => t.lps.capital), gp: null },
    ...(fund.terms.pref ? [{ label: "Pref", lps: pair((t) => t.lps.pref), gp: null }] : []),
    ...(fund.terms.catchUp ? [{ label: "Catch-up", lps: pair((t) => t.lps.catchUp), gp: pair((t) => t.gp.catchUp) }] : []),
    // One row a carry step, each side's share of it (f01f review, answer 2).
    ...steps.map((_, i) => ({ label: stepLabel(i), lps: pair((t) => t.gp.carry[i]!.lps), gp: pair((t) => t.gp.carry[i]!.amount) })),
  ];
  const total: SplitRow = { label: "Total", lps: pair((t) => t.lps.total), gp: pair((t) => t.gp.total) };
  return (
    <section className="card" aria-labelledby="split-heading">
      <h2 id="split-heading">The split at {xText(split.x)}</h2>
      <div ref={box}>
        {narrow ? (
          <>
            <NarrowSplit caption="This distribution" which={0} rows={rows} total={total} />
            <NarrowSplit caption="The fund to date" which={1} rows={rows} total={total} />
            {/* The one table, out of sight and out of the accessibility tree, measured to see when it fits again. */}
            <div className="split__measure" aria-hidden="true">
              <WideSplit ref={wide} rows={rows} total={total} />
            </div>
          </>
        ) : (
          <div className="table-scroll">
            <WideSplit ref={wide} rows={rows} total={total} />
          </div>
        )}
      </div>
      {fund.terms.gpCommitment && (
        <p className="split__commitment">
          The GP commitment's line, outside the tiers: {cents(now.gpCommitment)} of this distribution, {cents(all.gpCommitment)} to date.
        </p>
      )}
      <dl className="facts">
        <div>
          <dt>Distributed</dt>
          <dd>
            {cents(now.amount)} now, {cents(all.amount)} to date
          </dd>
        </div>
        <div>
          <dt>The LPs' paid-in</dt>
          <dd>{cents(split.lpsPaidIn)}</dd>
        </div>
        {fund.terms.gpCommitment && (
          <div>
            <dt>The GP commitment's paid-in</dt>
            <dd>{cents(split.gpCommitmentPaidIn)}</dd>
          </div>
        )}
        {split.prefAccrued && (
          <div>
            <dt>The pref accrued to {dateText(fund.distributionDate)}</dt>
            <dd>{cents(split.prefAccrued)}</dd>
          </div>
        )}
        <div>
          <dt>The LPs' net multiple to date</dt>
          <dd>{lpMultipleText(split.lpMultiple)}</dd>
        </div>
      </dl>
      {fund.lps.length > 0 ? (
        <p className="footnote">
          Amounts are to the cent. "The LPs" is every LP together; each LP's amount, rounded down as it would be paid, is in the
          card below. Each row here is rounded on its own and can differ from its total by a cent.
        </p>
      ) : (
        <p className="footnote">
          Amounts are to the cent. "The LPs" is every LP together, not one payment, so nothing here is rounded down as it would
          be paid; each row is rounded on its own and can differ from its total by a cent.
        </p>
      )}
    </section>
  );
}
