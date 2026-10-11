// What an import read, shown before its cap table is used (M6 plan, answer 9; O13): what to check, what was read and
// set aside, and a question for each term the format leaves open. "Use this cap table" opens it as a saved file would
// be; until then nothing changes. A table the engine refuses at a sale only for its SAFEs or notes still outstanding
// can start a company's rounds instead (R31; 0.5.0 plan, 05b3b answers): "Use it to add a round" opens a priced round
// that converts them. Since 0.6.0 (06g) it shows an OCX workbook's import too, with its own kinds of question, and
// offers the summary to share (O15).

import { useState } from "react";
import { InputError, UnsupportedTermError, readExit } from "spillpoint";

import { NotShownYet, draftFromExit } from "./draft.ts";
import type { Draft } from "./draft.ts";
import { Field } from "./fields.tsx";
import { amountHint, parseDollars, withoutCodes } from "./format.ts";
import type { ImportSource } from "./importSources.ts";
import { defaultTop, longDate, summary } from "./ocfImport.ts";
import type { Question } from "./ocfImport.ts";
import { answered, shown } from "./ocxImport.ts";
import type { AtUse } from "./ocxSummary.ts";
import { saleLimitText } from "./saleLimits.ts";
import { ShareSummary } from "./ShareSummary.tsx";

export interface ImportUse {
  name: string;
  source: string;
  draft: Draft;
  /** The export's date, and the order its series, SAFEs and notes were issued in (O14), for "Add a round" (R31). */
  asOf: string;
  issueOrder: string[];
  /** Start the company's rounds on it at once, with a priced round that converts its SAFEs and notes. */
  addRound?: boolean;
}

interface Props {
  source: ImportSource;
  onUse: (use: ImportUse) => void;
  onCancel: () => void;
}

/** How Use stopped, as a code a summary can share: the engine's term, never its message (O15). */
function stoppedCode(e: unknown): string {
  if (e instanceof UnsupportedTermError) return e.term;
  if (e instanceof NotShownYet) return "not_shown_yet";
  if (e instanceof InputError) return "InputError";
  return "unexpected";
}

/** Each answer's kind for the summary, never its value: a choice is its own code, anything typed a word (05a review). */
function answerKinds(asked: Question[], answers: Record<string, string>): string[] {
  return asked
    .filter((q) => shown(q, answers))
    .map((q) => {
      const field = q.kind === "gate" ? "one_strike" : q.blank.field;
      const kind = q.kind === "seniority" || q.choices ? (answers[q.key] ?? "none") : (q.kind ?? "number");
      return `${field}=${kind}`;
    });
}

export function ImportReview({ source, onUse, onCancel }: Props) {
  const { result } = source;
  const asked = source.questions;
  const hasNotes = ((result.cap_table as { unconverted_notes?: unknown[] }).unconverted_notes ?? []).length > 0;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saleDate, setSaleDate] = useState("");
  const [top, setTop] = useState(() => defaultTop(result.cap_table));
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);
  // How Use stopped, for the summary to share.
  const [atUse, setAtUse] = useState<AtUse | undefined>(undefined);
  // What a round would start from, when only the sale's limits on SAFEs and notes stop the table being used.
  const [offer, setOffer] = useState<ImportUse | null>(null);

  const answer = (changes: Record<string, string>) => {
    setAnswers((a) => ({ ...a, ...changes }));
    setMissing((m) => new Set([...m].filter((k) => !Object.keys(changes).some((c) => c === k || c.startsWith(`${k}:`)))));
    setProblem(null);
    setAtUse(undefined);
    setOffer(null);
  };

  const use = () => {
    // OX14: a 0.4/0.5 option column with more than one strike can't be read: the import stops, naming it.
    const stop = asked.find((q) => q.kind === "gate" && answers[q.key] === "no");
    if (stop) {
      setProblem(stop.stop!);
      return;
    }
    // Every question needs an answer the engine can read: a choice, a date, an order, or a positive number.
    const unanswered = asked.filter((q) => shown(q, answers) && !answered(q, answers)).map((q) => q.key);
    if (hasNotes && !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) unanswered.push("sale-date");
    const upTo = parseDollars(top);
    if (!upTo || upTo.isZero()) unanswered.push("top");
    if (unanswered.length > 0) {
      setMissing(new Set(unanswered));
      setProblem("Answer each question above first: every one changes who gets what.");
      return;
    }
    const exit = {
      cap_table: source.filled(answers),
      range: ["0", upTo!.toFixed()],
      exit_values: [],
      ...(hasNotes ? { exit_date: saleDate } : {}),
    };
    const chosen = (draft: Draft): ImportUse => ({ name: source.name, source: source.from, draft, asOf: result.as_of, issueOrder: result.issue_order });
    const stopped = (e: unknown, text: string) => {
      setProblem(text);
      setAtUse({ refusal: stoppedCode(e), answers: answerKinds(asked, answers) });
    };
    try {
      readExit(exit, undefined, "import");
      onUse(chosen(draftFromExit(exit)));
    } catch (e) {
      // The limits a sale puts on SAFEs and notes still outstanding (X12–X15), in plain words: a round that converts
      // them lifts them, so the table can still start a company's rounds. Any other refusal can't.
      const limit = saleLimitText(e, exit.cap_table);
      if (limit) {
        try {
          setOffer(chosen(draftFromExit(exit)));
          stopped(e, `This cap table can't be used at a sale yet: ${limit}`);
          return;
        } catch (shownLater) {
          if (!(shownLater instanceof NotShownYet)) throw shownLater;
          stopped(shownLater, `This cap table can't be used yet. ${withoutCodes(shownLater.message)}`);
          return;
        }
      }
      if (e instanceof InputError || e instanceof UnsupportedTermError || e instanceof NotShownYet) {
        stopped(e, `This cap table can't be used yet. ${withoutCodes(e.message)}`);
        return;
      }
      throw e;
    }
  };

  const count = (tally: Record<string, number>) =>
    Object.entries(tally)
      .sort(([a], [b]) => source.countName(a).localeCompare(source.countName(b)))
      .map(([type, n]) => (
        <li key={type}>
          {source.countName(type)}: {n}
        </li>
      ));

  const shortcuts = (q: Question) =>
    q.shortcuts && q.shortcuts.length > 0 ? (
      <div className="import__shortcuts">
        {q.shortcuts.map((s) => (
          <button key={s.label} type="button" className="file-button" onClick={() => answer(s.sets(answers))}>
            {s.label}
          </button>
        ))}
      </div>
    ) : null;

  const ask = (q: Question) => {
    if (q.kind === "seniority") {
      const tiers = q.series!.map((_, i) => i + 1);
      return (
        <fieldset key={q.key} className="import__question" aria-invalid={missing.has(q.key) ? true : undefined}>
          <legend>{q.label}</legend>
          <p className="field__hint">{q.hint}</p>
          {q.choices!.map((c) => (
            <label key={c.value} className="import__choice">
              <input type="radio" name={q.key} value={c.value} checked={answers[q.key] === c.value} onChange={() => answer({ [q.key]: c.value })} /> {c.label}
            </label>
          ))}
          {answers[q.key] === "by_hand" && (
            <ul className="import__tiers">
              {q.series!.map((s) => (
                <li key={s.id}>
                  <label>
                    {s.name}{" "}
                    <select
                      aria-label={`${s.name}'s tier`}
                      value={answers[`${q.key}:${s.id}`] ?? ""}
                      onChange={(e) => answer({ [`${q.key}:${s.id}`]: e.target.value })}
                    >
                      <option value="">Choose a tier</option>
                      {tiers.map((t) => (
                        <option key={t} value={String(t)}>
                          Tier {t}
                          {t === 1 ? ", paid first" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {missing.has(q.key) && <span className="field-error">{answers[q.key] === "by_hand" ? "Give each series a tier." : "Choose one."}</span>}
        </fieldset>
      );
    }
    if (q.choices) {
      return (
        <fieldset key={q.key} className="import__question" aria-invalid={missing.has(q.key) ? true : undefined}>
          <legend>{q.label}</legend>
          <p className="field__hint">{q.hint}</p>
          {q.choices.map((c) => (
            <label key={c.value} className="import__choice">
              <input type="radio" name={q.key} value={c.value} checked={answers[q.key] === c.value} onChange={() => answer({ [q.key]: c.value })} /> {c.label}
            </label>
          ))}
          {shortcuts(q)}
          {/* OX14: the stop shows as soon as "No" is picked, before anything else is filled in. */}
          {q.kind === "gate" && answers[q.key] === "no" && (
            <p className="field-error" role="alert">
              {q.stop}
            </p>
          )}
          {missing.has(q.key) && <span className="field-error">Choose one.</span>}
        </fieldset>
      );
    }
    return (
      <div key={q.key} className="import__ask">
        <Field
          id={`import-${q.key}`}
          label={q.label}
          value={answers[q.key] ?? ""}
          onChange={(v) => answer({ [q.key]: v })}
          {...(q.kind === "date" ? { type: "date" } : { numeric: true })}
          hint={q.hint}
          error={missing.has(q.key) ? (q.kind === "date" ? "Enter a date." : q.kind === "rate" ? "Enter a rate, 0 or more." : "Enter a number above zero.") : null}
        />
        {shortcuts(q)}
      </div>
    );
  };

  return (
    <section className="import" aria-labelledby="import-title">
      <h2 id="import-title">Importing {source.name}</h2>
      <p>
        From {source.from}, as of {longDate(result.as_of)}: {summary(result)} Nothing is used until you say so below.
      </p>
      {source.skipped.length > 0 && (
        <p className="muted">
          Not read: {source.skipped.length === 1 ? "a file that isn't" : `${source.skipped.length} files that aren't`} JSON, so not part of an OCF package: {source.skipped.join(", ")}.
        </p>
      )}

      <h3>What to check</h3>
      <ul className="import__lines">
        {source.lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <details className="import__counts">
        <summary>What was read</summary>
        <div className="import__tallies">
          <div>
            <h4>Read, for the cap table</h4>
            <ul>{count(result.report.read)}</ul>
          </div>
          {Object.keys(result.report.not_needed).length > 0 && (
            <div>
              <h4>Read and set aside, since they don't change who gets what</h4>
              <ul>{count(result.report.not_needed)}</ul>
            </div>
          )}
        </div>
      </details>

      <div className="import__open">
        <h3>{asked.length > 0 || hasNotes ? `What ${source.format} leaves open` : "Before you use it"}</h3>
        {asked.filter((q) => shown(q, answers)).map(ask)}
        {hasNotes && (
          <Field
            id="import-sale-date"
            label="When is the sale?"
            type="date"
            value={saleDate}
            onChange={(v) => {
              setSaleDate(v);
              setOffer(null);
              setMissing((m) => new Set([...m].filter((k) => k !== "sale-date")));
            }}
            hint={`Notes accrue interest up to it. ${source.format} has no field for it.`}
            error={missing.has("sale-date") ? "Enter the sale's date." : null}
          />
        )}
        <Field
          id="import-top"
          label="Show exit values up to"
          value={top}
          onChange={(v) => {
            setTop(v);
            setOffer(null);
            setMissing((m) => new Set([...m].filter((k) => k !== "top")));
          }}
          numeric
          hint={amountHint(top) ?? "Ten times what comes ahead of common at a sale, rounded up. You can change it later in the editor."}
          error={missing.has("top") ? "Enter an amount above zero." : null}
        />
      </div>
      {problem && (
        <p className="file-status file-status--problem" role="alert">
          {problem}
        </p>
      )}
      {offer && (
        <div className="import__round">
          <p>
            Its SAFEs and notes can convert in a priced round, though. Use it to add one: it becomes the cap table the company's rounds start from, and the
            payouts are worked out on the cap table after the round.
          </p>
          <button type="button" className="file-button file-button--primary" onClick={() => onUse({ ...offer, addRound: true })}>
            Use it to add a round
          </button>
        </div>
      )}
      <div className="import__actions">
        <button type="button" className="file-button file-button--primary" onClick={use}>
          Use this cap table
        </button>
        <button type="button" className="file-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="import__share">
        <ShareSummary lines={source.share(atUse)} />
      </div>
    </section>
  );
}
