// Editing a company's rounds (M4j): the holders, and every field of every
// event, in place on the Rounds tab. Every change is built by the engine
// straight away; when it says no, its own message appears next to the field
// it names and at the top of the event, and the payouts stay on the last
// rounds it accepted. Adding, removing and reordering events comes in M4k.

import type React from "react";
import type { CapTableAfterEvent, Participation } from "spillpoint";

import { CheckField, Field, SelectField } from "./fields.tsx";
import { amountHint } from "./format.ts";
import { addHolder, eventFieldId, eventsNaming, holderFieldId, setEvent } from "./roundsDraft.ts";
import type { EventDraft, RoundsDraft, RoundsProblem } from "./roundsDraft.ts";

type Json = Record<string, unknown>;
type Path = (string | number)[];

/** "investments[0].amount" → ["investments", 0, "amount"]. */
const parse = (path: string): Path => path.split(/\.|\[(\d+)\]/).filter((p) => p !== undefined && p !== "").map((p) => (/^\d+$/.test(p) ? Number(p) : p));

function getIn(json: unknown, path: string): unknown {
  return parse(path).reduce<unknown>((v, k) => (v == null ? undefined : (v as Record<string | number, unknown>)[k]), json);
}

/** The event with one value changed, everything else as it was. null removes the field. */
function setIn(json: Json, path: string, value: unknown): Json {
  const keys = parse(path);
  const set = (node: unknown, i: number): unknown => {
    const k = keys[i]!;
    const copy = (Array.isArray(node) ? [...node] : { ...(node as object) }) as Record<string | number, unknown>;
    if (i === keys.length - 1) {
      if (value === null && !Array.isArray(copy)) delete copy[k];
      else copy[k] = value;
    } else {
      copy[k] = set(copy[k] ?? (typeof keys[i + 1] === "number" ? [] : {}), i + 1);
    }
    return copy;
  };
  return set(json, 0) as Json;
}

// ---------- holders ----------

export function RoundsHolders({ draft, onDraft, problem }: { draft: RoundsDraft; onDraft: (d: RoundsDraft) => void; problem: RoundsProblem | null }) {
  const rename = (key: string, name: string) => onDraft({ ...draft, holders: draft.holders.map((h) => (h.key === key ? { ...h, name } : h)) });
  return (
    <section className="card" aria-labelledby="rounds-holders-heading">
      <h2 id="rounds-holders-heading">Holders</h2>
      <p className="card__intro">Everyone the events can name. Add someone here before naming them in an event.</p>
      <ul className="edit-rows">
        {draft.holders.map((h) => {
          const named = eventsNaming(draft, h.key);
          const id = holderFieldId(h.key);
          return (
            <li key={h.key} className="edit-row">
              <Field id={id} label="Holder name" hiddenLabel value={h.name} onChange={(v) => rename(h.key, v)} error={problem?.fields.includes(id) ? problem.message : null} />
              <button
                type="button"
                className="remove"
                disabled={named > 0}
                aria-label={`Remove ${h.name || "this holder"}`}
                aria-describedby={named > 0 ? `${id}-named` : undefined}
                onClick={() => onDraft({ ...draft, holders: draft.holders.filter((x) => x.key !== h.key) })}
              >
                Remove
              </button>
              {named > 0 && (
                <span id={`${id}-named`} className="field__hint">
                  Named in {named === 1 ? "an event" : `${named} events`}, so it can't be removed until it's taken out of {named === 1 ? "it" : "them"}.
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" className="add" onClick={() => onDraft(addHolder(draft))}>
        Add a holder
      </button>
    </section>
  );
}

// ---------- events ----------

export interface EventFormProps {
  event: EventDraft;
  draft: RoundsDraft;
  onDraft: (d: RoundsDraft) => void;
  problem: RoundsProblem | null;
  /** The company just before this event, as last built: the series a round can rank against or name for pay-to-play. */
  before: CapTableAfterEvent | null;
  /** The series this event created from its SAFEs and notes, as last built (R28: they rank with its new series). */
  conversions: string[];
}

/** One event's fields. */
export function EventForm(props: EventFormProps) {
  const { event, draft, onDraft, problem } = props;
  const json = event.json;
  const f = fieldsFor(event, draft, onDraft, problem);
  const type = String(json.type);
  return (
    <div className="event-form">
      {f.text("date", "Date", { type: "date", hint: "Leave blank if it has none. A round that converts notes needs one, for their interest." })}
      {type === "issue" && (
        <>
          {f.text("security.name", "Class")}
          {f.rows("issues", "Holder", { holder: firstHolder(draft), shares: "" }, (i) => (
            <>
              {f.holder(`issues[${i}].holder`, "Holder")}
              {f.text(`issues[${i}].shares`, "Shares", { numeric: true })}
            </>
          ))}
        </>
      )}
      {type === "issue_percent" && (
        <>
          {f.text("security.name", "Class")}
          {f.holder("holder", "Holder")}
          {f.text("percent", "Percent of the issued stock after the issue", { numeric: true })}
        </>
      )}
      {type === "create_pool" && f.text("percent", "Percent of the fully diluted shares after it", { numeric: true })}
      {type === "grant_options" &&
        f.rows("grants", "Grant", { holder: firstHolder(draft), shares: "", strike: "" }, (i) => (
          <>
            {f.holder(`grants[${i}].holder`, "Holder")}
            {f.text(`grants[${i}].shares`, "Options", { numeric: true })}
            {f.text(`grants[${i}].strike`, "Strike ($ a share)", { numeric: true })}
          </>
        ))}
      {type === "safes" && <SafeRows f={f} json={json} draft={draft} />}
      {type === "notes" && <NoteRows f={f} json={json} draft={draft} />}
      {type === "priced_round" && <RoundFields {...props} f={f} />}
    </div>
  );
}

const firstHolder = (d: RoundsDraft) => d.holders[0]?.key ?? "";

/** A unique id for a new SAFE or note, from its event's id. */
function newId(draft: RoundsDraft, base: string): string {
  const taken = new Set(draft.events.flatMap((e) => [...((e.json.safes as Json[] | undefined) ?? []), ...((e.json.notes as Json[] | undefined) ?? [])].map((x) => String(x.id))));
  let n = 1;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

type Fields = ReturnType<typeof fieldsFor>;

/** The field makers for one event: each reads and writes its value by path, and shows the engine's message when it names the field. */
function fieldsFor(event: EventDraft, draft: RoundsDraft, onDraft: (d: RoundsDraft) => void, problem: RoundsProblem | null) {
  const json = event.json;
  const update = (next: Json) => onDraft(setEvent(draft, event.key, next));
  const set = (path: string, value: unknown) => update(setIn(json, path, value));
  const id = (path: string) => eventFieldId(event.key, path);
  const errorFor = (path: string) => (problem && problem.event === event.key && problem.fields.includes(id(path)) ? problem.message : null);
  const value = (path: string) => {
    const v = getIn(json, path);
    return v == null ? "" : String(v);
  };
  type SelectOptions = { hint?: React.ReactNode; fallback?: string; value?: string; onChange?: (v: string) => void; narrow?: boolean };
  const select = (path: string, label: string, options: { value: string; label: string }[], opts: SelectOptions = {}) => (
    <SelectField
      id={id(path)}
      label={label}
      value={opts.value ?? (value(path) || opts.fallback || "")}
      options={options}
      onChange={opts.onChange ?? ((v) => set(path, v))}
      error={errorFor(path)}
      hint={opts.hint}
      wide={!opts.narrow}
    />
  );
  return {
    json,
    set,
    update,
    id,
    errorFor,
    value,
    text(path: string, label: string, opts: { numeric?: boolean; hint?: React.ReactNode; type?: "text" | "date"; money?: boolean } = {}) {
      const v = value(path);
      return (
        <Field
          id={id(path)}
          label={label}
          value={v}
          numeric={opts.numeric}
          type={opts.type}
          onChange={(t) => set(path, t)}
          error={errorFor(path)}
          hint={opts.hint ?? (opts.money ? amountHint(v) : undefined)}
        />
      );
    },
    select,
    check(path: string, label: string, fallback: boolean, hint?: React.ReactNode) {
      const v = getIn(json, path);
      return <CheckField id={id(path)} label={label} checked={typeof v === "boolean" ? v : fallback} onChange={(c) => set(path, c)} error={errorFor(path)} hint={hint} />;
    },
    holder(path: string, label: string) {
      const options = draft.holders.map((h) => ({ value: h.key, label: h.name || "Unnamed holder" }));
      return select(path, label, options, { narrow: true });
    },
    /** A list of lines (investors, grants, SAFEs, notes), each in its own group, with Add and Remove. */
    rows(list: string, noun: string, fresh: Json, render: (i: number) => React.ReactNode) {
      const items = (json[list] as Json[] | undefined) ?? [];
      return (
        <div className="event-form__rows">
          {items.map((row, i) => {
            const who = draft.holders.find((h) => h.key === row.holder)?.name || "";
            const name = `${noun} ${i + 1}${who ? `: ${who}` : ""}`;
            return (
              <fieldset key={i} className="series" id={id(`${list}[${i}]`)} tabIndex={-1}>
                <legend>{name}</legend>
                <div className="series__grid">{render(i)}</div>
                <button type="button" className="remove" aria-label={`Remove ${name}`} onClick={() => set(list, items.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </fieldset>
            );
          })}
          <button type="button" className="add" onClick={() => set(list, [...items, fresh])}>
            Add {/^[AEIOU]/.test(noun) ? "an" : "a"} {noun.toLowerCase()}
          </button>
        </div>
      );
    },
  };
}

const CAPS = [
  { value: "post", label: "A post-money valuation cap" },
  { value: "pre", label: "A pre-money valuation cap" },
  { value: "none", label: "No cap: it converts at its discount" },
];

function SafeRows({ f, json, draft }: { f: Fields; json: Json; draft: RoundsDraft }) {
  const rows = (json.safes as Json[] | undefined) ?? [];
  const fresh = { id: newId(draft, String(json.id)), holder: firstHolder(draft), purchase_amount: "", post_money_cap: "", discount: "" };
  return f.rows("safes", "SAFE", fresh, (i) => {
    const row = rows[i]!;
    const kind = row.post_money_cap != null ? "post" : row.pre_money_cap != null ? "pre" : "none";
    const capPath = kind === "pre" ? `safes[${i}].pre_money_cap` : `safes[${i}].post_money_cap`;
    // Switching the kind of cap keeps the amount typed, under the new kind.
    const setKind = (k: string) => {
      const cap = row.post_money_cap ?? row.pre_money_cap ?? "";
      const { post_money_cap: _post, pre_money_cap: _pre, ...rest } = row;
      const next = k === "post" ? { ...rest, post_money_cap: cap } : k === "pre" ? { ...rest, pre_money_cap: cap } : rest;
      f.set(`safes[${i}]`, next);
    };
    return (
      <>
        {f.holder(`safes[${i}].holder`, "Holder")}
        {f.text(`safes[${i}].purchase_amount`, "Amount ($)", { numeric: true, money: true })}
        {f.select(`safes[${i}].cap`, "Cap", CAPS, { onChange: setKind, value: kind })}
        {kind !== "none" && f.text(capPath, "Valuation cap ($)", { numeric: true, money: true })}
        {f.text(`safes[${i}].discount`, "Discount (%)", { numeric: true, hint: "Blank for none." })}
      </>
    );
  });
}

const BASES = [
  { value: "with_pool", label: "Shares outstanding and the option pool" },
  { value: "without_pool", label: "Shares outstanding, without the option pool" },
  { value: "common_only", label: "Common stock only" },
];

function NoteRows({ f, json, draft }: { f: Fields; json: Json; draft: RoundsDraft }) {
  const fresh = {
    id: newId(draft, String(json.id)),
    holder: firstHolder(draft),
    principal: "",
    interest_rate: "",
    interest_method: "simple",
    issue_date: String(json.date ?? ""),
    valuation_cap: "",
    cap_type: "pre_money",
    conversion_base: "with_pool",
    discount: "",
    repayment_multiple: "1",
  };
  return f.rows("notes", "Note", fresh, (i) => (
    <>
      {f.holder(`notes[${i}].holder`, "Holder")}
      {f.text(`notes[${i}].principal`, "Principal ($)", { numeric: true, money: true })}
      {f.text(`notes[${i}].interest_rate`, "Simple interest (% a year)", { numeric: true })}
      {f.text(`notes[${i}].issue_date`, "Issued", { type: "date" })}
      {f.text(`notes[${i}].valuation_cap`, "Pre-money valuation cap ($)", { numeric: true, money: true, hint: "Blank for none." })}
      {f.select(`notes[${i}].conversion_base`, "The cap divides by", BASES, { fallback: "with_pool" })}
      {f.text(`notes[${i}].discount`, "Discount (%)", { numeric: true, hint: "Blank for none." })}
      {f.text(`notes[${i}].repayment_multiple`, "Repaid at a sale (× principal and interest)", { numeric: true })}
    </>
  ));
}

const PARTICIPATION: { value: Participation; label: string }[] = [
  { value: "non_participating", label: "Non-participating: its preference or converting, whichever pays more" },
  { value: "participating", label: "Participating: its preference, then a share as common too" },
  { value: "participating_capped", label: "Participating up to a cap, then converting if that pays more" },
];

const ANTI_DILUTION = [
  { value: "none", label: "None" },
  { value: "broad_based", label: "Broad-based weighted average" },
  { value: "narrow_based", label: "Narrow-based weighted average" },
  { value: "full_ratchet", label: "Full ratchet" },
];

/**
 * How a round's new series ranks against the earlier preferred (M4j plan,
 * answer 2): alongside the most senior earlier series by default, pari passu,
 * which is still the most common; or senior to every earlier series, common in
 * down rounds and later stages. The series its SAFEs and notes convert into
 * rank with it (R28). A seniority loaded from a file that is neither stays as
 * written until someone chooses.
 */
export function seniorityFor(choice: "alongside" | "senior", series: string, before: string[][]): string[][] {
  if (before.length === 0) return [[series]];
  return choice === "senior" ? [[series], ...before] : [[series, ...before[0]!], ...before.slice(1)];
}

function seniorityChoice(json: Json, series: string, before: string[][], conversions: string[]): "alongside" | "senior" | "written" {
  const written = ((json.seniority as string[][] | undefined) ?? []).map((t) => t.filter((id) => !conversions.includes(id))).filter((t) => t.length > 0);
  const same = (a: string[][]) => JSON.stringify(a) === JSON.stringify(written);
  if (same(seniorityFor("alongside", series, before))) return "alongside";
  if (same(seniorityFor("senior", series, before))) return "senior";
  return "written";
}

function RoundFields({ f, before, conversions, draft }: EventFormProps & { f: Fields }) {
  const json = f.json;
  const series = (json.series as Json | undefined) ?? {};
  const seriesId = String(series.id);
  const earlier = before?.capTable.seniority ?? [];
  const names = new Map((before?.capTable.securities ?? []).map((s) => [s.id, s.name]));
  const earlierPreferred = earlier.flat();
  const choice = seniorityChoice(json, seriesId, earlier, conversions);
  const describe = (tiers: string[][]) => tiers.map((t) => t.map((id) => names.get(id) ?? (id === seriesId ? String(series.name) : id)).join(" and ")).join(", then ");
  const seniorityOptions = [
    { value: "alongside", label: `Alongside ${names.get(earlier[0]?.[0] ?? "") ?? "the earlier series"}${earlier[0] && earlier[0].length > 1 ? " and the rest of its tier" : ""} (pari passu)` },
    { value: "senior", label: "Senior to every earlier series" },
    ...(choice === "written" ? [{ value: "written", label: `As written: ${describe((json.seniority as string[][] | undefined) ?? [])}` }] : []),
  ];
  const p2p = json.pay_to_play as Json | undefined;
  const outstandingSafes = (before?.unconvertedSafes.length ?? 0) > 0;
  const outstandingNotes = (before?.unconvertedNotes.length ?? 0) > 0;
  return (
    <>
      <h4>The round</h4>
      <div className="series__grid">
        {f.text("pre_money", "Pre-money valuation ($)", { numeric: true, money: true })}
        {f.text("pool_target_unissued_percent_post", "Option pool after the round (% of the company)", { numeric: true, hint: "The pool is topped up to this, before the new money. Blank for no top-up." })}
      </div>
      {f.rows("investments", "Investor", { holder: firstHolder(draft), amount: "" }, (i) => (
        <>
          {f.holder(`investments[${i}].holder`, "Investor")}
          {f.text(`investments[${i}].amount`, "Amount ($)", { numeric: true, money: true })}
          {f.check(`investments[${i}].pro_rata`, "Under its pro-rata right", false, "No more than its pro-rata entitlement; enter anything above it as a second, ordinary line.")}
        </>
      ))}

      <h4>The new series</h4>
      <div className="series__grid">
        {f.text("series.name", "Name")}
        {f.text("series.preference_multiple", "Preference (× the issue price)", { numeric: true })}
        {f.select("series.participation", "Participation", PARTICIPATION, {
          onChange: (v) => {
            const next = setIn(json, "series.participation", v);
            f.update(setIn(next, "series.cap_multiple", v === "participating_capped" ? (series.cap_multiple ?? "") : null));
          },
        })}
        {series.participation === "participating_capped" && f.text("series.cap_multiple", "Cap (× the issue price, preference included)", { numeric: true })}
        {f.select("series.anti_dilution", "Anti-dilution", ANTI_DILUTION, {
          fallback: "none",
          // A new method drops any definition of A written for the old one (C10).
          onChange: (v) => f.update(setIn(setIn(json, "series.anti_dilution", v), "series.anti_dilution_a", null)),
        })}
      </div>
      {earlierPreferred.length > 0 &&
        f.select("seniority", "How it ranks against the earlier series", seniorityOptions, {
          value: choice,
          hint: "Alongside (pari passu) is the most common. Senior is common in down rounds and at later stages. Its series from SAFEs and notes rank with it.",
          onChange: (v) => v !== "written" && f.set("seniority", seniorityFor(v as "alongside" | "senior", seriesId, earlier)),
        })}

      {(outstandingSafes || outstandingNotes) && <h4>SAFEs and notes</h4>}
      {outstandingSafes && f.check("convert_safes", "Converts the SAFEs still outstanding", true)}
      {outstandingNotes && f.check("convert_notes", "Converts the convertible notes still outstanding", false)}

      {earlierPreferred.length > 0 && (
        <>
          <h4>Pay-to-play</h4>
          <CheckField
            id={f.id("pay_to_play")}
            label="Holders of earlier series must buy their share of an amount, or convert to common"
            checked={p2p != null}
            onChange={(on) => f.set("pay_to_play", on ? { series: [earlierPreferred[0]], offered_amount: "", conversion_ratio: { [earlierPreferred[0]!]: "" } } : null)}
            error={f.errorFor("pay_to_play")}
          />
          {p2p && <PayToPlayFields f={f} p2p={p2p} earlier={earlierPreferred} names={names} />}
        </>
      )}

      <details className="event-form__more">
        <summary>More terms</summary>
        {f.check("pro_rata_base_includes_unissued_pool", "Pro-rata counts the unissued pool", false)}
        {f.check("anti_dilution_include_unissued_pool_in_a", "Broad-based anti-dilution counts the unissued pool in A", false)}
        {f.check("anti_dilution_shares_in_post", "The round's price counts the anti-dilution adjustment shares", true)}
        {f.select(
          "anti_dilution_cp2_rounding",
          "An adjusted conversion price is rounded",
          [
            { value: "exact", label: "Not at all: exact" },
            { value: "0.0001", label: "To the nearest $0.0001" },
            { value: "0.01", label: "To the nearest cent" },
          ],
          { fallback: "exact" },
        )}
      </details>
    </>
  );
}

function PayToPlayFields({ f, p2p, earlier, names }: { f: Fields; p2p: Json; earlier: string[]; names: Map<string, string> }) {
  const listed = (p2p.series as string[] | undefined) ?? [];
  const given = p2p.conversion_ratio;
  const ratioOf = (id: string) => (typeof given === "object" && given ? String((given as Json)[id] ?? "") : listed.length === 1 && id === listed[0] ? String(given ?? "") : "");
  // Ratios are kept one per named series once edited (R22), which the engine reads for one series too.
  const ratios = (): Json => Object.fromEntries(listed.map((id) => [id, ratioOf(id)]));
  const setP2p = (next: Json) => f.set("pay_to_play", next);
  const toggle = (id: string, on: boolean) => {
    const series = on ? earlier.filter((s) => s === id || listed.includes(s)) : listed.filter((s) => s !== id);
    setP2p({ ...p2p, series, conversion_ratio: Object.fromEntries(series.map((s) => [s, ratioOf(s)])) });
  };
  return (
    <div className="event-form__p2p">
      <fieldset className="series" id={f.id("pay_to_play.series")} tabIndex={-1}>
        <legend>Which series</legend>
        {earlier.map((id) => (
          <label key={id} className="check">
            <input type="checkbox" checked={listed.includes(id)} onChange={(e) => toggle(id, e.target.checked)} />
            {names.get(id) ?? id}
          </label>
        ))}
        {f.errorFor("pay_to_play.series") && <span className="field-error">{f.errorFor("pay_to_play.series")}</span>}
      </fieldset>
      <div className="series__grid">
        {f.text("pay_to_play.offered_amount", "Amount offered to them ($)", { numeric: true, money: true, hint: "Each must buy its share of this, by what it holds." })}
        {listed.map((id) => (
          <Field
            key={id}
            id={f.id(`pay_to_play.conversion_ratio.${id}`)}
            label={`Common for each ${names.get(id) ?? id} share, if it doesn't buy`}
            numeric
            value={ratioOf(id)}
            onChange={(t) => setP2p({ ...p2p, conversion_ratio: { ...ratios(), [id]: t } })}
            error={f.errorFor(`pay_to_play.conversion_ratio.${id}`) ?? f.errorFor("pay_to_play.conversion_ratio")}
          />
        ))}
        {f.select(
          "pay_to_play.partial_participation",
          "A holder that buys only part of its share",
          [
            { value: "convert_all", label: "Converts all its preferred" },
            { value: "convert_proportionally", label: "Converts the part it didn't buy" },
          ],
          { fallback: "convert_all" },
        )}
      </div>
      {f.check("pay_to_play.priced_after_conversion", "The round is priced after the conversion", true, "Some deals price it on the shares before the conversion instead.")}
    </div>
  );
}
