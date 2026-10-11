// Opening an OCX workbook on the page (0.6.0, 06g): an .xlsx, read by the page's own reader (OX1) and the engine's
// readOcx (OX3–OX14). As for an OCF export (O13), the report comes first, then a question for each term the workbook
// leaves open, and only then is the cap table used. Everything happens on this computer.

import { D, ImportRefusal, readOcx } from "spillpoint";
import type { CapTableImport, OcxWorkbook } from "spillpoint";

import { shortDollars } from "./format.ts";
import { exactAmount, longDate, price } from "./ocfImport.ts";
import type { Picked, Question } from "./ocfImport.ts";
import { XlsxError, readXlsx } from "./xlsx.ts";

type Json = Record<string, unknown>;

/** Why an OCX import didn't happen, as codes a summary can share (O15). */
export type OcxFailure = { stage: "xlsx"; code: string } | { stage: "import"; refusal: ImportRefusal };

export type OcxImported =
  | { ok: true; result: CapTableImport; source: string; workbook: OcxWorkbook }
  | { ok: false; message: string; failure: OcxFailure; source: string; workbook: OcxWorkbook | null };

/** An .xlsx, by its name: the page's reader then says plainly if it's an older or password-protected one instead. */
export const isWorkbook = (p: Picked): boolean => /\.xls[xm]?$/i.test(p.name);

/** The workbook's name, for the page to call the import by: the file's, less its extension. */
export const workbookName = (source: string): string => source.replace(/\.[^.]+$/, "");

/** Reads a picked .xlsx into the engine's import, or says plainly why it can't. */
export async function importOcx(picked: Picked): Promise<OcxImported> {
  const source = picked.name;
  let workbook: OcxWorkbook;
  try {
    workbook = await readXlsx(picked.bytes);
  } catch (e) {
    if (!(e instanceof XlsxError)) throw e;
    return { ok: false, message: `Couldn't read ${source}. ${e.message}`, failure: { stage: "xlsx", code: e.code }, source, workbook: null };
  }
  try {
    return { ok: true, result: readOcx(workbook), source, workbook };
  } catch (e) {
    if (!(e instanceof ImportRefusal)) throw e;
    const message = e.message.endsWith(".") ? e.message : `${e.message}.`;
    return {
      ok: false,
      message:
        e.kind === "unsupported"
          ? `Couldn't import it: it uses something spillpoint doesn't model yet, and it refuses rather than leave it out. ${message}`
          : `Couldn't import it: its tabs disagree with each other or with OCX, so there's no one cap table to build. ${message}`,
      failure: { stage: "import", refusal: e },
      source,
      workbook,
    };
  }
}

// ---------- the report ----------

/** OX3's id rule, for naming a holder the import left out: lower case, each run of anything but letters and digits one "_". */
const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** Every holder on the workbook's per-holder tab, by the id the import gives it (OX6), so a line can name one it left out. */
function holderNames(workbook: OcxWorkbook): Map<string, string> {
  const names = new Map<string, string>();
  const tab = workbook.sheets.find((s) => s.name === "Stakeholder View" || s.name === "Stakeholder Snapshot");
  if (!tab) return names;
  const header = tab.cells.find((c) => c.kind === "text" && c.text.trim() === "Stakeholder");
  if (!header) return names;
  const column = header.address.replace(/\d+$/, "");
  const row = Number(header.address.slice(column.length));
  for (const c of tab.cells) {
    const m = /^([A-Z]+)(\d+)$/.exec(c.address);
    if (!m || m[1] !== column || Number(m[2]) <= row || c.kind !== "text") continue;
    const name = c.text.replace(/\s+/g, " ").trim();
    const label = name.toLowerCase();
    if (label === "total") break;
    if (!name || label === "options remaining for issuance") continue;
    let id = idOf(name);
    for (let n = 2; names.has(id); n += 1) id = `${idOf(name)}_${n}`;
    names.set(id, name);
  }
  return names;
}

/** One line for each of the report's notes (OX12), in plain English. */
export function ocxReportLines(result: CapTableImport, workbook: OcxWorkbook): string[] {
  const ct = result.cap_table as { holders: Json[]; securities: Json[]; unconverted_safes?: Json[]; unconverted_notes?: Json[] };
  const holders = holderNames(workbook);
  for (const h of ct.holders) holders.set(String(h.id), String(h.name));
  const security = (id: string) => ct.securities.find((s) => s.id === id);
  const named = (id: string) => String(security(id)?.name ?? id);
  const convertible = (id: string) => [...(ct.unconverted_safes ?? []), ...(ct.unconverted_notes ?? [])].find((x) => x.id === id);
  const hasNotes = (ct.unconverted_notes ?? []).length > 0;
  const asOf = longDate(result.as_of);

  return result.report.notes.map((n) => {
    const subject = n.subject ?? "";
    switch (n.code) {
      case "version_label":
        return `The workbook says it's OCX version ${n.field ?? ""}. spillpoint reads a layout by its tabs and headers, not its label.`;
      case "no_dividend_field":
        return "OCX has no field for cumulative dividends. If a series has them, add them in the editor.";
      case "no_conversion_group_field":
        return "OCX has no field for series that must convert together. If the charter makes them vote as a class, add that in the editor.";
      case "no_carve_out_field":
        return "OCX has no field for a management carve-out. If the sale has one, add it in the editor.";
      case "no_sale_date_field":
        return `OCX has no field for the sale's date. ${hasNotes ? "Notes accrue interest up to it, so it's asked for below." : "Nothing here needs it."}`;
      case "no_seniority_field":
        return "OCX has no field for seniority, which series is paid first at a sale. It's asked for below.";
      case "formula_totals_skipped":
        return "Some cells are formulas the workbook saved no value for. They're totals and checks spillpoint doesn't need, so they're skipped, and the rows they total are checked against each other instead.";
      case "unrecognized_field":
        return `The ${subject} tab has a column spillpoint doesn't know, "${n.field ?? ""}". It isn't read.`;
      case "unrecognized_tab":
        return `The "${subject}" tab isn't part of an OCX layout, so it isn't read.`;
      case "common_named_preferred":
        return `${named(subject)} is named preferred, but it sits under Common Stock with no liquidation preference, so it's read as common.`;
      case "no_financing_history":
        return "The workbook has no Financing History, so a preferred series' terms aren't in it. They're asked for below.";
      case "issue_price_from_ledger": {
        const s = security(subject);
        return `${named(subject)}'s issue price${typeof s?.original_issue_price === "string" ? `, ${price(new D(s.original_issue_price))},` : ""} comes from its ledger: every certificate there was issued at it.`;
      }
      case "conversion_ratio_rounded":
        return `${named(subject)}'s conversion ratio agrees with its prices only to the digits they're written to. spillpoint uses its conversion price, the charter's defined term.`;
      case "participation_cap_includes_preference": {
        const s = security(subject);
        if (s?.participation === "participating_capped") {
          return `${named(subject)}'s participation cap is read as including its preference, so it gets at most ${String(s.cap_multiple)}x its issue price in all. OCX doesn't say which.`;
        }
        if (s?.participation === "non_participating") {
          return `${named(subject)}'s participation cap equals its preference, so it's read as non-participating. OCX doesn't say whether a cap includes the preference.`;
        }
        return `${named(subject)}'s participation cap is read as including its preference. OCX doesn't say which.`;
      }
      case "no_anti_dilution_field":
        return `OCX has no field for ${named(subject)}'s anti-dilution, so it's read as none. A sale doesn't need it: any adjustment is already in the conversion price.`;
      case "rsu_as_option":
        return `Grant ${subject} is RSUs, read as options with no strike: each delivers a share for nothing.`;
      case "expired_option_left_out":
        return `Grant ${subject} expired before ${asOf}, so it's left out. The workbook still counted it, so the holdings were checked with it first.`;
      case "expired_warrant_left_out":
        return `Warrant ${subject} expired before ${asOf}, so it's left out.`;
      case "warrant_counts_are_maximums":
        return "The workbook counts each warrant at the most shares it can buy, so that's what's used.";
      case "no_strike_field":
        return `OCX gives no strike for ${named(subject)}, so it's asked for below.`;
      case "safes_combined": {
        const f = convertible(subject);
        return `"${holders.get(String(f?.holder)) ?? subject}" is one SAFE for its row's total: the workbook groups SAFEs by their terms, never by holder. It pays the same as the SAFEs one by one.`;
      }
      case "note_from_convertibles_row": {
        const f = convertible(subject);
        return `"${holders.get(String(f?.holder)) ?? subject}" is one note, from the workbook's convertibles table, which gives no holder and no note terms beyond its amount, cap and discount. The rest are asked for below.`;
      }
      case "note_cap_read_as_pre_money":
        return "The note's cap is read as pre-money, the only kind spillpoint models for a note. OCX doesn't say which.";
      case "issue_order_default": {
        const f = convertible(subject);
        const what = f ? `${holders.get(String(f.holder)) ?? subject}'s ${String(f.id).startsWith("note_") ? "note" : "SAFE"}` : named(subject);
        return `The workbook gives no issue date for ${what}, so it's taken as issued after every series, the usual order.`;
      }
      case "left_out_stakeholder":
        return `${holders.get(subject) ?? subject} holds nothing on ${asOf}, so they're left out.`;
      default:
        return `${n.code}${subject ? ` (${subject})` : ""}`;
    }
  });
}

/** What the report counts, as a reader would say it (OX12). */
export function ocxCountName(key: string): string {
  const names: Record<string, string> = {
    stakeholders: "holder rows", pool_rows: "pool rows", share_classes: "classes of stock", certificates: "share certificates", plan_grants: "option grants",
    warrants: "warrants", safes: "SAFEs", notes: "notes", convertible_rows: "convertibles rows", stock_plans: "stock plans", financing_rounds: "financing rounds",
    stock_plan_history: "stock plan history rows", valuations_409a: "409A valuations", split_adjustments: "split adjustments", shareholder_groups: "shareholder groups",
  };
  return names[key] ?? key.replace(/_/g, " ");
}

// ---------- the terms to fill in ----------

const keyOf = (b: { security?: string; safe?: string; note?: string; field: string }) =>
  b.field === "seniority" && !b.security ? "seniority" : `${b.security ? "security" : b.safe ? "safe" : "note"}:${b.security ?? b.safe ?? b.note}:${b.field}`;

/** The key of a 0.4/0.5 option column's one-strike question (OX14), asked before its strike. */
export const gateKey = (security: string): string => `gate:${security}`;
/** The key of a capped series' cap, asked when participation is answered capped. */
export const capKey = (security: string): string => `security:${security}:cap_multiple`;

/**
 * One question for each blank the import left (O1), and two more kinds the workbook needs:
 * - **seniority**, from no order set: "all pari passu", "stacked, latest round senior", or arranged by hand (0.6.0
 *   plan, answer 7)
 * - **one strike?** before a 0.4/0.5 option column's strike: "No" stops the import, naming the column (OX14)
 *
 * A preferred series' conversion price and terms have one-click answers, "conversion price = issue price" and "1x,
 * non-participating", which you click; neither is ever preset (06d review).
 */
export function ocxQuestions(result: CapTableImport, workbook: OcxWorkbook): Question[] {
  const ct = result.cap_table as { securities: Json[]; unconverted_safes?: Json[]; unconverted_notes?: Json[] };
  const holders = holderNames(workbook);
  for (const h of (result.cap_table as { holders: Json[] }).holders) holders.set(String(h.id), String(h.name));
  const asked: Question[] = [];
  for (const blank of result.to_fill) {
    const key = keyOf(blank);
    if (blank.field === "seniority" && !blank.security) {
      const order = [...result.issue_order].reverse();
      const series = ct.securities
        .filter((s) => s.kind === "preferred")
        .sort((a, b) => order.indexOf(String(a.id)) - order.indexOf(String(b.id)))
        .map((s) => ({ id: String(s.id), name: String(s.name) }));
      asked.push({
        key, blank, kind: "seniority", series,
        label: "Which series is paid first at a sale?",
        hint: "OCX has no field for seniority, so nothing is set. Choose one, or arrange them by hand: series in one tier share it pari passu, and a tier is paid before the ones below it.",
        choices: [
          { value: "pari_passu", label: "All pari passu: every series' preference shares one tier" },
          { value: "stacked", label: `Stacked, latest round senior: ${series.map((s) => s.name).join(", then ")}` },
          { value: "by_hand", label: "Arrange them by hand" },
        ],
      });
      continue;
    }
    if (blank.security) {
      const s = ct.securities.find((x) => x.id === blank.security)!;
      const name = String(s.name);
      const id = String(s.id);
      if (blank.field === "strike") {
        if (s.kind === "option") {
          asked.push({
            key: gateKey(id), blank, kind: "gate",
            label: `Do all the options in "${name}" have the same strike?`,
            hint: "OCX 0.4 and 0.5 give one column per plan or class, with no strikes, so spillpoint can read one strike for the column.",
            choices: [
              { value: "yes", label: "Yes, one strike" },
              { value: "no", label: "No, more than one" },
            ],
            stop: `"${name}" holds options at more than one strike, and spillpoint can read only one strike for a column, so it can't import this workbook. Enter the cap table by hand instead, or export it with each strike in a column of its own.`,
          });
          asked.push({
            key, blank, showWhen: { key: gateKey(id), value: "yes" },
            label: `The strike for "${name}", a share`,
            hint: "The price each option is exercised at. OCX doesn't give it.",
          });
        } else {
          asked.push({ key, blank, label: `The strike for "${name}", a share`, hint: "The price each warrant is exercised at. OCX doesn't give it." });
        }
        continue;
      }
      switch (blank.field) {
        case "original_issue_price":
          asked.push({ key, blank, label: `${name}'s original issue price, a share`, hint: "The price its investors paid for each share. The workbook doesn't give one." });
          break;
        case "conversion_price": {
          const oip = typeof s.original_issue_price === "string" ? s.original_issue_price : null;
          asked.push({
            key, blank,
            label: `${name}'s conversion price, a share`,
            hint: "It's usually the issue price, unless anti-dilution lowered it.",
            shortcuts: [
              {
                label: "Conversion price = issue price",
                sets: (answers) => {
                  const value = oip ?? answers[keyOf({ security: id, field: "original_issue_price" })] ?? "";
                  return value ? { [key]: value } : {};
                },
              },
            ],
          });
          break;
        }
        case "preference_multiple":
          asked.push({ key, blank, label: `${name}'s liquidation preference, as a multiple of its issue price`, hint: "1 means 1x: its issue price back, a share." });
          break;
        case "participation": {
          const multipleKey = keyOf({ security: id, field: "preference_multiple" });
          const multipleAsked = result.to_fill.some((b) => b.security === id && b.field === "preference_multiple");
          asked.push({
            key, blank,
            label: `Does ${name} participate?`,
            hint: "The workbook doesn't say.",
            choices: [
              { value: "non_participating", label: "Non-participating: its preference, or converting, whichever pays more" },
              { value: "participating", label: "Participating, without a cap: its preference, then a share of the rest as if converted" },
              { value: "participating_capped", label: "Participating, with a cap" },
            ],
            shortcuts: [
              {
                label: "1x, non-participating",
                sets: () => ({ [key]: "non_participating", ...(multipleAsked ? { [multipleKey]: "1" } : {}) }),
              },
            ],
          });
          asked.push({
            key: capKey(id), blank: { security: id, field: "cap_multiple" }, showWhen: { key, value: "participating_capped" },
            label: `${name}'s participation cap, as a multiple of its issue price`,
            hint: "Read as including its preference: 3 means it gets at most 3x its issue price in all.",
          });
          break;
        }
      }
      continue;
    }
    if (blank.safe) {
      const f = ct.unconverted_safes!.find((x) => x.id === blank.safe)!;
      asked.push({
        key, blank,
        label: "Is this SAFE's cap pre-money or post-money?",
        hint: `${holders.get(String(f.holder)) ?? String(f.holder)}'s ${shortDollars(new D(String(f.purchase_amount)))} SAFE, capped at ${shortDollars(new D(String(f.valuation_cap)))}. The workbook doesn't say which.`,
        choices: [
          { value: "post_money", label: "Post-money" },
          { value: "pre_money", label: "Pre-money" },
        ],
      });
      continue;
    }
    const note = ct.unconverted_notes!.find((x) => x.id === blank.note)!;
    const who = holders.get(String(note.holder)) ?? String(note.holder);
    switch (blank.field) {
      case "interest_rate":
        asked.push({ key, blank, kind: "rate", label: `${who}'s simple interest (% a year)`, hint: "The workbook gives none. 0 if it bears none." });
        break;
      case "issue_date":
        asked.push({ key, blank, kind: "date", label: `When was ${who}'s note issued?`, hint: "Interest runs from it." });
        break;
      case "conversion_base":
        asked.push({
          key, blank,
          label: `What does ${who}'s cap divide by?`,
          hint: "The note's terms say which shares its cap price counts.",
          choices: [
            { value: "with_pool", label: "The company's shares, options and unissued pool" },
            { value: "without_pool", label: "The company's shares and options, without the unissued pool" },
            { value: "common_only", label: "Common stock only" },
          ],
        });
        break;
      case "repayment_multiple":
        asked.push({
          key, blank,
          label: `${who}'s repayment multiple at a sale`,
          hint: "spillpoint won't assume 1x. At a sale the note takes this multiple of principal plus interest, or converts, whichever pays more.",
        });
        break;
    }
  }
  return asked;
}

/** Whether a question is shown: one that waits on another's answer only once it has it. */
export const shown = (q: Question, answers: Record<string, string>): boolean => !q.showWhen || answers[q.showWhen.key] === q.showWhen.value;

/** A rate typed as a percentage, as a fraction: "6" is "0.06", and 0 is allowed. Null if it isn't a number. */
export function rateOf(text: string): string | null {
  const t = text.trim().replace(/%$/, "").trim();
  return /^\d+(\.\d+)?$/.test(t) ? new D(t).div(100).toFixed() : null;
}

/** Whether a question has an answer the engine can read. */
export function answered(q: Question, answers: Record<string, string>): boolean {
  const a = answers[q.key] ?? "";
  if (q.kind === "seniority") {
    if (a !== "by_hand") return a === "pari_passu" || a === "stacked";
    return q.series!.every((s) => /^\d+$/.test(answers[`${q.key}:${s.id}`] ?? ""));
  }
  if (q.choices) return q.choices.some((c) => c.value === a);
  if (q.kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(a);
  if (q.kind === "rate") return rateOf(a) !== null;
  return exactAmount(a) !== null;
}

/** The seniority tiers an answer gives: most senior first, series in one tier pari passu. */
export function tiersOf(q: Question, answers: Record<string, string>): string[][] {
  const ids = q.series!.map((s) => s.id);
  const a = answers[q.key];
  if (a === "pari_passu") return [ids];
  if (a === "stacked") return ids.map((id) => [id]);
  const tier = (id: string) => Number(answers[`${q.key}:${id}`]);
  return [...new Set(ids.map(tier))].sort((x, y) => x - y).map((t) => ids.filter((id) => tier(id) === t));
}

/** The cap table with the answers filled in, ready for readExit. */
export function ocxFilled(result: CapTableImport, asked: Question[], answers: Record<string, string>): Json {
  const ct = structuredClone(result.cap_table) as Json & { securities: Json[]; unconverted_safes?: Json[]; unconverted_notes?: Json[] };
  for (const q of asked) {
    if (q.kind === "gate" || !shown(q, answers)) continue;
    const answer = answers[q.key] ?? "";
    const b = q.blank;
    if (q.kind === "seniority") ct.seniority = tiersOf(q, answers);
    else if (b.security) {
      const s = ct.securities.find((x) => x.id === b.security)!;
      if (b.field === "participation") {
        s.participation = answer;
        if (answer !== "participating_capped") s.cap_multiple = null;
      } else s[b.field] = exactAmount(answer);
    } else if (b.safe) {
      ct.unconverted_safes = ct.unconverted_safes!.map((f) => {
        if (f.id !== b.safe) return f;
        const { valuation_cap, cap_type: _blank, ...rest } = f;
        return { ...rest, [answer === "post_money" ? "post_money_cap" : "pre_money_cap"]: valuation_cap };
      });
    } else {
      const n = ct.unconverted_notes!.find((x) => x.id === b.note)!;
      n[b.field] = b.field === "interest_rate" ? rateOf(answer) : b.field === "issue_date" || b.field === "conversion_base" ? answer : exactAmount(answer);
    }
  }
  return ct;
}
