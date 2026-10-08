// The cap table editor (M3c): holders, classes and their terms, who holds
// what, the order of payment, one conversion group, and the range to explore.
// Only what the engine supports at exit (M3 plan, answer 6). Every change is
// read by the engine straight away; when it says no, its own message appears
// next to the field it names, and the payouts stay on the last cap table it
// accepted.
//
// SAFEs and convertible notes still outstanding at the sale (M5k) have a card
// of their own, after who holds what: they hold no shares until they convert.
// Rates are typed as percentages, as in the rounds editor.
//
// A cap table built from rounds (M4i) is shown read-only: the rounds build it,
// so an edit here would contradict them. Its name and range stay editable.
// "Edit the cap table directly" drops the rounds and keeps the table, after
// asking (M4 plan, answer 9).

import type React from "react";
import type { Participation } from "spillpoint";

import {
  addHolder, addNote, addSafe, addSecurity, fieldId, outstandingHeldBy, removeOutstanding, removeRow, setNote, setPrice, setSafe, sharesHeldBy, sharesKey, tiers,
} from "./draft.ts";
import type { ConversionBase, Draft, DraftNote, DraftPreferred, DraftSafe, DraftSecurity } from "./draft.ts";
import { Field, SelectField } from "./fields.tsx";
import { amountHint, fractionValue } from "./format.ts";

/** The engine's objection to the draft, and the field it names (null: none the editor shows). */
export interface DraftError {
  field: string | null;
  message: string;
}

interface Props {
  draft: Draft;
  onDraft: (next: Draft) => void;
  /** What the cap table is called; a saved file is named after it. */
  name: string;
  onName: (name: string) => void;
  error: DraftError | null;
  /** One line on what the current cap table pays, shown while it's valid. */
  summary: string;
  /** Set when the cap table is built from rounds: how many events build it, and how to drop them. */
  rounds: { events: number; onEditDirectly: () => void } | null;
}

export function CapTableEditor({ draft, onDraft, name, onName, error, summary, rounds }: Props) {
  const errorFor = (field: string) => (error && error.field === field ? error.message : null);
  const preferred = draft.securities.filter((s): s is DraftPreferred => s.kind === "preferred");
  return (
    <div className="editor">
      <EditorStatus error={error} summary={summary} />
      {rounds && (
        <div className="notice editor__built" role="note">
          <p>
            <strong>This cap table is built from the {rounds.events} events on the Rounds tab, so it can't be edited here.</strong> You can still
            rename it and change the range of exit values.
          </p>
          <button type="button" className="file-button" onClick={rounds.onEditDirectly}>
            Edit the cap table directly
          </button>
        </div>
      )}
      <section className="card" aria-label="Name">
        <Field id="edit-name" label="Name of this cap table" value={name} onChange={onName} error={null} hint="A saved file is named after it." />
      </section>
      {/* A disabled fieldset turns every field and button in it off, for the keyboard and screen readers too. */}
      <fieldset className="editor__table" disabled={rounds !== null}>
        <legend className="visually-hidden">{rounds ? "The cap table, built from the rounds" : "The cap table"}</legend>
        <HoldersCard draft={draft} onDraft={onDraft} errorFor={errorFor} />
        <ClassesCard draft={draft} onDraft={onDraft} errorFor={errorFor} />
        <SharesCard draft={draft} onDraft={onDraft} error={error} errorFor={errorFor} />
        <OutstandingCard draft={draft} onDraft={onDraft} errorFor={errorFor} />
        {preferred.length > 0 && <SeniorityCard draft={draft} onDraft={onDraft} errorFor={errorFor} />}
        {preferred.length > 0 && <GroupCard draft={draft} onDraft={onDraft} errorFor={errorFor} />}
      </fieldset>
      <RangeCard draft={draft} onDraft={onDraft} errorFor={errorFor} />
    </div>
  );
}

type CardProps = { draft: Draft; onDraft: (next: Draft) => void; errorFor: (field: string) => string | null };

function EditorStatus({ error, summary }: { error: DraftError | null; summary: string }) {
  if (!error) {
    return (
      <p className="editor__status" role="status">
        {summary} Every change updates the payouts.
      </p>
    );
  }
  const field = error.field;
  return (
    <div className="editor__status editor__status--error" role="alert">
      <strong>The payouts can't update until this is fixed:</strong> {error.message}
      {field && (
        <>
          {" "}
          <button type="button" className="link-button" onClick={() => document.getElementById(field)?.focus()}>
            Go to the field
          </button>
        </>
      )}
    </div>
  );
}

/** Prices show as decimals; for one typed as a fraction ("455000/1182033"), what it comes to. */
function priceHint(text: string) {
  const v = fractionValue(text);
  return v ? `About $${v} a share` : undefined;
}

function confirmRemove(draft: Draft, key: string, name: string): boolean {
  const held = sharesHeldBy(draft, key);
  const { safes, notes } = outstandingHeldBy(draft, key);
  const going = [
    held.isZero() ? null : `${held.toNumber().toLocaleString("en-US")} shares`,
    safes === 0 ? null : safes === 1 ? "SAFE" : `${safes} SAFEs`,
    notes === 0 ? null : notes === 1 ? "convertible note" : `${notes} convertible notes`,
  ].filter(Boolean);
  if (going.length === 0) return true;
  const text = going.length === 1 ? going[0] : `${going.slice(0, -1).join(", ")} and ${going.at(-1)}`;
  return window.confirm(`Remove ${name || "this row"}? Its ${text} ${going.length === 1 && held.isZero() && safes + notes === 1 ? "goes" : "go"} too.`);
}

function RemoveButton({ draft, onDraft, rowKey, name }: { draft: Draft; onDraft: (d: Draft) => void; rowKey: string; name: string }) {
  return (
    <button type="button" className="remove" aria-label={`Remove ${name || "this row"}`} onClick={() => confirmRemove(draft, rowKey, name) && onDraft(removeRow(draft, rowKey))}>
      Remove
    </button>
  );
}

// ---------- holders ----------

function HoldersCard({ draft, onDraft, errorFor }: CardProps) {
  const rename = (key: string, name: string) => onDraft({ ...draft, holders: draft.holders.map((h) => (h.key === key ? { ...h, name } : h)) });
  return (
    <section className="card" aria-labelledby="edit-holders-heading">
      <h2 id="edit-holders-heading">Holders</h2>
      <p className="card__intro">Everyone who owns shares or options, or holds a SAFE or note. Their shares go under "Who holds what".</p>
      <ul className="edit-rows">
        {draft.holders.map((h) => (
          <li key={h.key} className="edit-row">
            <Field id={fieldId.holderName(h.key)} label="Holder name" hiddenLabel value={h.name} onChange={(v) => rename(h.key, v)} error={errorFor(fieldId.holderName(h.key))} />
            <RemoveButton draft={draft} onDraft={onDraft} rowKey={h.key} name={h.name} />
          </li>
        ))}
      </ul>
      <button type="button" className="add" onClick={() => onDraft(addHolder(draft))}>
        Add a holder
      </button>
    </section>
  );
}

// ---------- classes ----------

function ClassesCard({ draft, onDraft, errorFor }: CardProps) {
  const update = (key: string, change: Partial<DraftSecurity>) =>
    onDraft({ ...draft, securities: draft.securities.map((s) => (s.key === key ? ({ ...s, ...change } as DraftSecurity) : s)) });
  const common = draft.securities.filter((s) => s.kind === "common");
  const options = draft.securities.filter((s): s is Extract<DraftSecurity, { kind: "option" }> => s.kind === "option");
  const preferred = draft.securities.filter((s): s is DraftPreferred => s.kind === "preferred");
  return (
    <section className="card" aria-labelledby="edit-classes-heading">
      <h2 id="edit-classes-heading">Classes of stock</h2>
      <p className="card__intro">Common stock, options and each series of preferred, with the terms that decide who gets what at a sale.</p>

      <h3>Common stock</h3>
      <ul className="edit-rows">
        {common.map((s) => (
          <li key={s.key} className="edit-row">
            <Field id={fieldId.securityName(s.key)} label="Class name" hiddenLabel value={s.name} onChange={(v) => update(s.key, { name: v })} error={errorFor(fieldId.securityName(s.key))} />
            <RemoveButton draft={draft} onDraft={onDraft} rowKey={s.key} name={s.name} />
          </li>
        ))}
      </ul>
      {common.length === 0 && (
        <button type="button" className="add" onClick={() => onDraft(addSecurity(draft, "common"))}>
          Add common stock
        </button>
      )}

      <h3>Options</h3>
      <p className="card__intro">Fully vested options, one class per strike price. They're exercised once a common share is worth more than the strike.</p>
      {options.length > 0 && (
        <ul className="edit-rows">
          {options.map((s) => (
            <li key={s.key} className="edit-row">
              <Field id={fieldId.securityName(s.key)} label="Class name" value={s.name} onChange={(v) => update(s.key, { name: v })} error={errorFor(fieldId.securityName(s.key))} />
              <Field
                id={fieldId.strike(s.key)}
                label="Strike price ($ a share)"
                numeric
                value={s.strike}
                onChange={(v) => onDraft(setPrice(draft, s.key, "strike", v))}
                hint={priceHint(s.strike)}
                error={errorFor(fieldId.strike(s.key))}
              />
              <RemoveButton draft={draft} onDraft={onDraft} rowKey={s.key} name={s.name} />
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="add" onClick={() => onDraft(addSecurity(draft, "option"))}>
        Add an option class
      </button>

      <h3>Preferred series</h3>
      {preferred.map((s) => (
        <PreferredFields key={s.key} s={s} draft={draft} onDraft={onDraft} update={update} errorFor={errorFor} />
      ))}
      <button type="button" className="add" onClick={() => onDraft(addSecurity(draft, "preferred"))}>
        Add a preferred series
      </button>
    </section>
  );
}

const PARTICIPATION_LABELS: Record<Participation, string> = {
  non_participating: "Non-participating: its preference or converting, whichever pays more",
  participating: "Participating: its preference, then a share as common too",
  participating_capped: "Participating up to a cap, then converting if that pays more",
};

function PreferredFields({
  s,
  draft,
  onDraft,
  update,
  errorFor,
}: CardProps & { s: DraftPreferred; update: (key: string, change: Partial<DraftSecurity>) => void }) {
  const partId = fieldId.participation(s.key);
  const partError = errorFor(partId);
  return (
    <fieldset className="series" id={`edit-series-${s.key}`}>
      <legend>{s.name || "Unnamed series"}</legend>
      <div className="series__grid">
        <Field id={fieldId.securityName(s.key)} label="Name" value={s.name} onChange={(v) => update(s.key, { name: v })} error={errorFor(fieldId.securityName(s.key))} />
        <Field
          id={fieldId.originalIssuePrice(s.key)}
          label="Original issue price ($ a share)"
          numeric
          value={s.originalIssuePrice}
          onChange={(v) => onDraft(setPrice(draft, s.key, "originalIssuePrice", v))}
          error={errorFor(fieldId.originalIssuePrice(s.key))}
          hint={priceHint(s.originalIssuePrice)}
        />
        <Field
          id={fieldId.conversionPrice(s.key)}
          label="Conversion price ($ a share)"
          numeric
          value={s.conversionPrice}
          onChange={(v) => onDraft(setPrice(draft, s.key, "conversionPrice", v))}
          error={errorFor(fieldId.conversionPrice(s.key))}
          hint={priceHint(s.conversionPrice) ?? "Blank means the issue price. Lower only after an anti-dilution adjustment."}
        />
        <Field
          id={fieldId.preferenceMultiple(s.key)}
          label="Preference (× the issue price)"
          numeric
          value={s.preferenceMultiple}
          onChange={(v) => update(s.key, { preferenceMultiple: v })}
          error={errorFor(fieldId.preferenceMultiple(s.key))}
        />
        <div className="field field--wide">
          <label htmlFor={partId} className="field__label">
            Participation
          </label>
          <select
            id={partId}
            value={s.participation}
            onChange={(e) => update(s.key, { participation: e.target.value as Participation })}
            aria-invalid={partError ? true : undefined}
            aria-describedby={partError ? `${partId}-error` : undefined}
          >
            {(Object.keys(PARTICIPATION_LABELS) as Participation[]).map((p) => (
              <option key={p} value={p}>
                {PARTICIPATION_LABELS[p]}
              </option>
            ))}
          </select>
          {partError && (
            <span id={`${partId}-error`} className="field-error">
              {partError}
            </span>
          )}
        </div>
        {s.participation === "participating_capped" && (
          <Field
            id={fieldId.capMultiple(s.key)}
            label="Cap (× the issue price, preference included)"
            numeric
            value={s.capMultiple}
            onChange={(v) => update(s.key, { capMultiple: v })}
            error={errorFor(fieldId.capMultiple(s.key))}
          />
        )}
      </div>
      <RemoveButton draft={draft} onDraft={onDraft} rowKey={s.key} name={s.name} />
    </fieldset>
  );
}

// ---------- who holds what ----------

function SharesCard({ draft, onDraft, error, errorFor }: CardProps & { error: DraftError | null }) {
  const set = (key: string, value: string) => onDraft({ ...draft, shares: { ...draft.shares, [key]: value } });
  // A share count's error is shown under the table, naming the cell, so the grid keeps its shape.
  const cell = draft.holders.flatMap((h) => draft.securities.map((s) => ({ h, s, id: fieldId.shares(h.key, s.key) }))).find((c) => c.id === error?.field);
  return (
    <section className="card" aria-labelledby="edit-shares-heading">
      <h2 id="edit-shares-heading">Who holds what</h2>
      <p className="card__intro">Shares (or options) each holder has in each class. Leave a cell blank for none.</p>
      <div className="table-scroll">
        <table className="shares-grid">
          <thead>
            <tr>
              <th scope="col">Holder</th>
              {draft.securities.map((s) => (
                <th key={s.key} scope="col" className="num">
                  {s.name || "Unnamed class"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.holders.map((h) => (
              <tr key={h.key}>
                <th scope="row">{h.name || "Unnamed holder"}</th>
                {draft.securities.map((s) => {
                  const key = sharesKey(h.key, s.key);
                  const id = fieldId.shares(h.key, s.key);
                  const invalid = errorFor(id) !== null;
                  return (
                    <td key={s.key}>
                      <input
                        id={id}
                        type="text"
                        className="num"
                        inputMode="numeric"
                        value={draft.shares[key] ?? ""}
                        onChange={(e) => set(key, e.target.value)}
                        aria-label={`${h.name || "Unnamed holder"}, ${s.name || "unnamed class"}`}
                        aria-invalid={invalid ? true : undefined}
                        aria-describedby={invalid ? "edit-shares-error" : undefined}
                        autoComplete="off"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cell && error && (
        <p id="edit-shares-error" className="field-error">
          {cell.h.name}, {cell.s.name}: {error.message}
        </p>
      )}
      <div className="edit-row edit-row--top">
        <Field
          id={fieldId.pool}
          label="Unissued option pool (shares)"
          numeric
          value={draft.pool}
          onChange={(v) => onDraft({ ...draft, pool: v })}
          error={errorFor(fieldId.pool)}
          hint="Counts toward each holder's share of the company, never toward a payout."
        />
      </div>
    </section>
  );
}

// ---------- SAFEs and notes still outstanding ----------

const SAFE_CAPS = [
  { value: "post", label: "A post-money valuation cap" },
  { value: "pre", label: "A pre-money valuation cap" },
  { value: "none", label: "No cap" },
];

const NOTE_BASES: { value: ConversionBase; label: string }[] = [
  { value: "with_pool", label: "Shares outstanding and the option pool" },
  { value: "without_pool", label: "Shares outstanding, without the option pool" },
  { value: "common_only", label: "Common stock only" },
];

function OutstandingCard({ draft, onDraft, errorFor }: CardProps) {
  const holders = draft.holders.map((h) => ({ value: h.key, label: h.name || "Unnamed holder" }));
  const who = (key: string) => draft.holders.find((h) => h.key === key)?.name || "";
  const error = errorFor(fieldId.outstanding);
  return (
    <section className="card" aria-labelledby="edit-outstanding-heading" id={fieldId.outstanding} tabIndex={-1}>
      <h2 id="edit-outstanding-heading">SAFEs and notes still outstanding</h2>
      <p className="card__intro">
        SAFEs and convertible notes that haven't converted by the sale. They hold no shares: at the sale each takes whichever is worth more,
        its cash amount or converting to common.
      </p>
      {draft.safes.map((f, i) => (
        <SafeFields key={f.key} f={f} n={i + 1} who={who(f.holder)} holders={holders} draft={draft} onDraft={onDraft} errorFor={errorFor} />
      ))}
      {draft.notes.map((n, i) => (
        <NoteFields key={n.key} n={n} i={i + 1} who={who(n.holder)} holders={holders} draft={draft} onDraft={onDraft} errorFor={errorFor} />
      ))}
      <div className="edit-row">
        <button type="button" className="add" onClick={() => onDraft(addSafe(draft))}>
          Add a SAFE
        </button>
        <button type="button" className="add" onClick={() => onDraft(addNote(draft))}>
          Add a convertible note
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </section>
  );
}

type RowProps = CardProps & { who: string; holders: { value: string; label: string }[] };

function SafeFields({ f, n, who, holders, draft, onDraft, errorFor }: RowProps & { f: DraftSafe; n: number }) {
  const set = (change: Partial<DraftSafe>) => onDraft(setSafe(draft, f.key, change));
  const name = `SAFE ${n}${who ? `: ${who}` : ""}`;
  const preferred = draft.securities.filter((s): s is DraftPreferred => s.kind === "preferred");
  return (
    <fieldset className="series" id={fieldId.safe(f.key)} tabIndex={-1}>
      <legend>{name}</legend>
      <div className="series__grid">
        <SelectField id={fieldId.safeHolder(f.key)} label="Holder" value={f.holder} options={holders} onChange={(v) => set({ holder: v })} error={errorFor(fieldId.safeHolder(f.key))} />
        <Field
          id={fieldId.safeAmount(f.key)}
          label="Amount ($)"
          numeric
          value={f.purchaseAmount}
          onChange={(v) => set({ purchaseAmount: v })}
          error={errorFor(fieldId.safeAmount(f.key))}
          hint={amountHint(f.purchaseAmount) ?? undefined}
        />
        <SelectField id={fieldId.safeCapKind(f.key)} label="Cap" value={f.cap} options={SAFE_CAPS} onChange={(v) => set({ cap: v as DraftSafe["cap"] })} error={null} wide />
        {f.cap !== "none" && (
          <Field
            id={fieldId.safeCap(f.key)}
            label="Valuation cap ($)"
            numeric
            value={f.capAmount}
            onChange={(v) => set({ capAmount: v })}
            error={errorFor(fieldId.safeCap(f.key))}
            hint={amountHint(f.capAmount) ?? undefined}
          />
        )}
        <Field
          id={fieldId.safeDiscount(f.key)}
          label="Discount (%)"
          numeric
          value={f.discount}
          onChange={(v) => set({ discount: v })}
          error={errorFor(fieldId.safeDiscount(f.key))}
          hint="Blank for none. At a sale it counts only for a SAFE with no cap."
        />
        {preferred.length > 0 && (
          <SelectField
            id={fieldId.safeRanks(f.key)}
            label="Its cash amount is paid alongside"
            value={f.ranksWith ?? ""}
            options={[
              { value: "", label: "The most junior preferred (the default)" },
              ...preferred.map((s) => ({ value: s.key, label: s.name || "Unnamed series" })),
            ]}
            onChange={(v) => set({ ranksWith: v || null })}
            error={errorFor(fieldId.safeRanks(f.key))}
            wide
          />
        )}
      </div>
      <button type="button" className="remove" aria-label={`Remove ${name}`} onClick={() => onDraft(removeOutstanding(draft, f.key))}>
        Remove
      </button>
    </fieldset>
  );
}

function NoteFields({ n, i, who, holders, draft, onDraft, errorFor }: RowProps & { n: DraftNote; i: number }) {
  const set = (change: Partial<DraftNote>) => onDraft(setNote(draft, n.key, change));
  const name = `Note ${i}${who ? `: ${who}` : ""}`;
  return (
    <fieldset className="series" id={fieldId.note(n.key)} tabIndex={-1}>
      <legend>{name}</legend>
      <div className="series__grid">
        <SelectField id={fieldId.noteHolder(n.key)} label="Holder" value={n.holder} options={holders} onChange={(v) => set({ holder: v })} error={errorFor(fieldId.noteHolder(n.key))} />
        <Field
          id={fieldId.notePrincipal(n.key)}
          label="Principal ($)"
          numeric
          value={n.principal}
          onChange={(v) => set({ principal: v })}
          error={errorFor(fieldId.notePrincipal(n.key))}
          hint={amountHint(n.principal) ?? undefined}
        />
        <Field id={fieldId.noteInterest(n.key)} label="Simple interest (% a year)" numeric value={n.interestRate} onChange={(v) => set({ interestRate: v })} error={errorFor(fieldId.noteInterest(n.key))} />
        <Field id={fieldId.noteIssued(n.key)} label="Issued" type="date" value={n.issueDate} onChange={(v) => set({ issueDate: v })} error={errorFor(fieldId.noteIssued(n.key))} />
        <Field
          id={fieldId.noteCap(n.key)}
          label="Pre-money valuation cap ($)"
          numeric
          value={n.valuationCap}
          onChange={(v) => set({ valuationCap: v })}
          error={errorFor(fieldId.noteCap(n.key))}
          hint={amountHint(n.valuationCap) ?? "Blank for none."}
        />
        <SelectField
          id={fieldId.noteBase(n.key)}
          label="The cap divides by"
          value={n.conversionBase}
          options={NOTE_BASES}
          onChange={(v) => set({ conversionBase: v as ConversionBase })}
          error={errorFor(fieldId.noteBase(n.key))}
          wide
        />
        <Field
          id={fieldId.noteDiscount(n.key)}
          label="Discount (%)"
          numeric
          value={n.discount}
          onChange={(v) => set({ discount: v })}
          error={errorFor(fieldId.noteDiscount(n.key))}
          hint="Blank for none. At a sale it counts only for a note with no cap."
        />
        <Field
          id={fieldId.noteRepayment(n.key)}
          label="Repaid at a sale (× principal and interest)"
          numeric
          value={n.repaymentMultiple}
          onChange={(v) => set({ repaymentMultiple: v })}
          error={errorFor(fieldId.noteRepayment(n.key))}
        />
      </div>
      <button type="button" className="remove" aria-label={`Remove ${name}`} onClick={() => onDraft(removeOutstanding(draft, n.key))}>
        Remove
      </button>
    </fieldset>
  );
}

// ---------- who is paid first ----------

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

function SeniorityCard({ draft, onDraft, errorFor }: CardProps) {
  const preferred = draft.securities.filter((s): s is DraftPreferred => s.kind === "preferred");
  const setRank = (key: string, rank: number) =>
    onDraft({ ...draft, securities: draft.securities.map((s) => (s.key === key && s.kind === "preferred" ? { ...s, rank } : s)) });
  const sentence = tiers(draft)
    .map((tier, i) => {
      const names = tier.map((s) => s.name || "an unnamed series");
      const lead = i === 0 ? "Paid first" : "Then";
      return `${lead}${names.length > 1 ? ", side by side" : ""}: ${list(names)}.`;
    })
    .join(" ");
  const error = errorFor(fieldId.seniority);
  return (
    <section className="card" aria-labelledby="edit-seniority-heading" id={fieldId.seniority} tabIndex={-1}>
      <h2 id="edit-seniority-heading">Who is paid first</h2>
      <p className="card__intro">
        The order preferred series take their preferences in, most senior first. Series with the same place are paid side by side (pari passu), in
        proportion to what each is owed. Common is paid after every preference.
      </p>
      <ul className="edit-rows edit-rows--ranks">
        {preferred.map((s) => (
          <li key={s.key}>
            <label htmlFor={`edit-rank-${s.key}`} className="edit-row__name">
              {s.name || "Unnamed series"}
            </label>
            <select id={`edit-rank-${s.key}`} value={s.rank} onChange={(e) => setRank(s.key, Number(e.target.value))}>
              {preferred.map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Paid {ordinal(i + 1)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <p className="edit-summary">{sentence}</p>
      {error && <p className="field-error">{error}</p>}
    </section>
  );
}

// ---------- converting together ----------

function GroupCard({ draft, onDraft, errorFor }: CardProps) {
  const preferred = draft.securities.filter((s): s is DraftPreferred => s.kind === "preferred");
  const { group } = draft;
  const setGroup = (change: Partial<Draft["group"]>) => onDraft({ ...draft, group: { ...group, ...change } });
  const toggle = (key: string, on: boolean) => setGroup({ members: on ? [...group.members, key] : group.members.filter((m) => m !== key) });
  const error = errorFor(fieldId.group);
  const thresholdError = errorFor(fieldId.groupThreshold);
  return (
    <section className="card" aria-labelledby="edit-group-heading" id={fieldId.group} tabIndex={-1}>
      <h2 id="edit-group-heading">Series that convert together</h2>
      <p className="card__intro">
        If the charter lets a class vote force several series to convert at once, tick them here: they all convert or none do, decided by the vote.
        Leave them unticked if each series decides for itself. One group at most.
      </p>
      <ul className="edit-rows">
        {preferred.map((s) => {
          // Uncapped participating preferred never converts, so it can't be in a group (E11).
          const never = s.participation === "participating";
          return (
            <li key={s.key} className="edit-row">
              <label className="check">
                <input type="checkbox" checked={group.members.includes(s.key)} onChange={(e) => toggle(s.key, e.target.checked)} disabled={never && !group.members.includes(s.key)} />{" "}
                {s.name || "Unnamed series"}
                {never && <span className="muted"> (participating without a cap: never converts)</span>}
              </label>
            </li>
          );
        })}
      </ul>
      {group.members.length > 0 && (
        <div className="group-vote">
          They convert when
          <label htmlFor={fieldId.groupRule} className="visually-hidden">
            Vote rule
          </label>
          <select id={fieldId.groupRule} value={group.rule} onChange={(e) => setGroup({ rule: e.target.value as Draft["group"]["rule"] })}>
            <option value="more_than">more than</option>
            <option value="at_least">at least</option>
          </select>
          <label htmlFor={fieldId.groupThreshold} className="visually-hidden">
            Vote threshold (percent)
          </label>
          <input
            id={fieldId.groupThreshold}
            type="text"
            className="num group-vote__threshold"
            inputMode="decimal"
            value={group.threshold}
            onChange={(e) => setGroup({ threshold: e.target.value })}
            aria-invalid={thresholdError ? true : undefined}
            aria-describedby={thresholdError ? `${fieldId.groupThreshold}-error` : undefined}
          />
          % of the group's as-converted shares would gain by converting.
          {thresholdError && (
            <span id={`${fieldId.groupThreshold}-error`} className="field-error">
              {thresholdError}
            </span>
          )}
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </section>
  );
}

// ---------- the range ----------

function RangeCard({ draft, onDraft, errorFor }: CardProps) {
  const set = (i: 0 | 1, v: string) => onDraft({ ...draft, range: (i === 0 ? [v, draft.range[1]] : [draft.range[0], v]) as [string, string] });
  // Only notes accrue interest up to the sale (X3), so the date is asked for once there's a note, or kept once given.
  const dated = draft.notes.length > 0 || draft.exitDate.trim() !== "";
  return (
    <section className="card" aria-labelledby="edit-range-heading">
      <h2 id="edit-range-heading">Exit values to explore</h2>
      <p className="card__intro">The slider, the curves and the breakpoints cover this range of sale prices. Type amounts like 300M or 1.5B.</p>
      <div className="edit-row edit-row--top">
        <Field id={fieldId.rangeLow} label="From" numeric value={draft.range[0]} onChange={(v) => set(0, v)} error={errorFor(fieldId.rangeLow)} hint={rangeHint(draft.range[0])} />
        <Field id={fieldId.rangeHigh} label="To" numeric value={draft.range[1]} onChange={(v) => set(1, v)} error={errorFor(fieldId.rangeHigh)} hint={rangeHint(draft.range[1])} />
        {dated && (
          <Field
            id={fieldId.exitDate}
            label="Date of the sale"
            type="date"
            value={draft.exitDate}
            onChange={(v) => onDraft({ ...draft, exitDate: v })}
            error={errorFor(fieldId.exitDate)}
            hint="Convertible notes accrue interest up to this date."
          />
        )}
      </div>
    </section>
  );
}

function rangeHint(text: string) {
  return amountHint(text) ?? undefined;
}
