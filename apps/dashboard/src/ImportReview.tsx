// What an OCF import read, shown before its cap table is used (M6 plan,
// answer 9): what to check, what was read and set aside, and a question for
// each term OCF leaves open. "Use this cap table" opens it as a saved file
// would be; until then nothing changes. A table the engine refuses at a sale
// only for its SAFEs or notes still outstanding can start a company's rounds
// instead (R31; 0.5.0 plan, 05b3b answers): "Use it to add a round" opens a
// priced round that converts them.

import { useMemo, useState } from "react";
import { InputError, UnsupportedTermError, readExit } from "spillpoint";
import type { OcfFile, OcfImport } from "spillpoint";

import { NotShownYet, draftFromExit } from "./draft.ts";
import type { Draft } from "./draft.ts";
import { Field } from "./fields.tsx";
import { amountHint, parseDollars, withoutCodes } from "./format.ts";
import { Package, defaultTop, exactAmount, filled, longDate, questions, reportLines, summary, typeName } from "./ocfImport.ts";

export interface ImportUse {
  name: string;
  source: string;
  draft: Draft;
  /** The package's date, and the order its series, SAFEs and notes were issued in (O14), for "Add a round" (R31). */
  asOf: string;
  issueOrder: string[];
  /** Start the company's rounds on it at once, with a priced round that converts its SAFEs and notes. */
  addRound?: boolean;
}

/**
 * The limits a sale puts on SAFEs and notes still outstanding (X12–X15). A round that converts them lifts them, so a
 * table refused for one of these can still start a company's rounds. Any other refusal can't be.
 */
const SALE_LIMITS = new Set(["note_with_safe_or_carve_out", "pre_money_safe_with_preferred", "several_safes", "several_notes"]);

interface Props {
  result: OcfImport;
  files: OcfFile[];
  source: string;
  skipped: string[];
  onUse: (use: ImportUse) => void;
  onCancel: () => void;
}

export function ImportReview({ result, files, source, skipped, onUse, onCancel }: Props) {
  const pkg = useMemo(() => new Package(files), [files]);
  const lines = useMemo(() => reportLines(result, pkg), [result, pkg]);
  const asked = useMemo(() => questions(result, pkg), [result, pkg]);
  const hasNotes = ((result.cap_table as { unconverted_notes?: unknown[] }).unconverted_notes ?? []).length > 0;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saleDate, setSaleDate] = useState("");
  const [top, setTop] = useState(() => defaultTop(result.cap_table));
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);
  // What a round would start from, when only the sale's limits on SAFEs and notes stop the table being used.
  const [offer, setOffer] = useState<ImportUse | null>(null);

  const answer = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setMissing((m) => new Set([...m].filter((k) => k !== key)));
    setProblem(null);
    setOffer(null);
  };

  const use = () => {
    // Every question needs an answer the engine can read: a choice, or a positive number.
    const unanswered = asked.filter((q) => (q.choices ? !answers[q.key] : !exactAmount(answers[q.key] ?? ""))).map((q) => q.key);
    if (hasNotes && !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) unanswered.push("sale-date");
    const upTo = parseDollars(top);
    if (!upTo || upTo.isZero()) unanswered.push("top");
    if (unanswered.length > 0) {
      setMissing(new Set(unanswered));
      setProblem("Answer each question above first: every one changes who gets what.");
      return;
    }
    const exit = {
      cap_table: filled(result, answers),
      range: ["0", upTo!.toFixed()],
      exit_values: [],
      ...(hasNotes ? { exit_date: saleDate } : {}),
    };
    const chosen = (draft: Draft): ImportUse => ({ name: pkg.issuer, source, draft, asOf: result.as_of, issueOrder: result.issue_order });
    try {
      readExit(exit, undefined, "import");
      onUse(chosen(draftFromExit(exit)));
    } catch (e) {
      if (e instanceof UnsupportedTermError && SALE_LIMITS.has(e.term)) {
        try {
          setOffer(chosen(draftFromExit(exit)));
          // The engine's words, without its path: the offer below says what can be done about it.
          const words = e.message.startsWith(`${e.path}: `) ? e.message.slice(e.path.length + 2) : e.message;
          setProblem(`This cap table can't be used at a sale yet. ${withoutCodes(words)}`);
          return;
        } catch (shown) {
          if (!(shown instanceof NotShownYet)) throw shown;
          setProblem(`This cap table can't be used yet. ${withoutCodes(shown.message)}`);
          return;
        }
      }
      if (e instanceof InputError || e instanceof UnsupportedTermError || e instanceof NotShownYet) {
        setProblem(`This cap table can't be used yet. ${withoutCodes(e.message)}`);
        return;
      }
      throw e;
    }
  };

  const count = (tally: Record<string, number>) =>
    Object.entries(tally)
      .sort(([a], [b]) => typeName(a).localeCompare(typeName(b)))
      .map(([type, n]) => (
        <li key={type}>
          {typeName(type)}: {n}
        </li>
      ));

  return (
    <section className="import" aria-labelledby="import-title">
      <h2 id="import-title">Importing {pkg.issuer}</h2>
      <p>
        From {source}, as of {longDate(result.as_of)}: {summary(result)} Nothing is used until you say so below.
      </p>
      {skipped.length > 0 && (
        <p className="muted">
          Not read: {skipped.length === 1 ? "a file that isn't" : `${skipped.length} files that aren't`} JSON, so not part of an OCF package: {skipped.join(", ")}.
        </p>
      )}

      <h3>What to check</h3>
      <ul className="import__lines">
        {lines.map((line, i) => (
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
      <h3>{asked.length > 0 || hasNotes ? "What OCF leaves open" : "Before you use it"}</h3>
      {asked.map((q) =>
        q.choices ? (
          <fieldset key={q.key} className="import__question" aria-invalid={missing.has(q.key) ? true : undefined}>
            <legend>{q.label}</legend>
            <p className="field__hint">{q.hint}</p>
            {q.choices.map((c) => (
              <label key={c.value} className="import__choice">
                <input type="radio" name={q.key} value={c.value} checked={answers[q.key] === c.value} onChange={() => answer(q.key, c.value)} /> {c.label}
              </label>
            ))}
            {missing.has(q.key) && <span className="field-error">Choose one.</span>}
          </fieldset>
        ) : (
          <Field
            key={q.key}
            id={`import-${q.key}`}
            label={q.label}
            value={answers[q.key] ?? ""}
            onChange={(v) => answer(q.key, v)}
            numeric
            hint={q.hint}
            error={missing.has(q.key) ? "Enter a number above zero." : null}
          />
        ),
      )}
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
          hint="Notes accrue interest up to it. OCF has no field for it."
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
    </section>
  );
}
