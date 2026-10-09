// Opening an Open Cap Format export on the page (M6, 04f): a .zip, or the
// package's loose .ocf.json files, read by the engine's readOcf. The page
// shows what the import read and noted before the cap table is used (answer
// 9), asks for each term OCF left open, and only then opens the cap table, as
// a saved file would be. Everything happens on this computer.

import { D, OcfRefusal, readOcf } from "spillpoint";
import type { OcfFile, OcfImport, OcfToFill } from "spillpoint";

import { shortDollars } from "./format.ts";
import { ZipError, readZip } from "./zip.ts";

type Json = Record<string, unknown>;

/** A file as picked: its name and its bytes. */
export interface Picked {
  name: string;
  bytes: Uint8Array;
}

export type Imported =
  | {
      ok: true;
      result: OcfImport;
      files: OcfFile[];
      /** What was picked, for the page to name: a zip's name, or how many files. */
      source: string;
      /** Files in the zip or the picked set that aren't JSON, so aren't part of an OCF package. */
      skipped: string[];
    }
  | { ok: false; message: string };

/** What a zip made on a Mac carries besides the files themselves: resource forks and folder settings. */
const clutter = (name: string) => name.startsWith("__MACOSX/") || /(^|\/)\._/.test(name) || /(^|\/)\.DS_Store$/.test(name);
const isZip = (p: Picked) => p.name.toLowerCase().endsWith(".zip") || (p.bytes[0] === 0x50 && p.bytes[1] === 0x4b && p.bytes[2] === 0x03);

/** Reads what was picked into the engine's import, or says plainly why it can't. */
export async function importOcf(picked: readonly Picked[]): Promise<Imported> {
  if (picked.length === 0) return { ok: false, message: "No files were chosen." };
  let entries: Picked[];
  let source: string;
  if (picked.length === 1 && isZip(picked[0]!)) {
    source = picked[0]!.name;
    try {
      entries = (await readZip(picked[0]!.bytes)).filter((e) => !clutter(e.name)).map((e) => ({ name: e.name, bytes: e.bytes }));
    } catch (e) {
      if (e instanceof ZipError) return { ok: false, message: `Couldn't read ${source}. ${e.message}` };
      throw e;
    }
  } else {
    if (picked.some(isZip)) return { ok: false, message: "Open a .zip on its own, or the package's .ocf.json files together, not both." };
    entries = [...picked];
    source = `${picked.length} file${picked.length === 1 ? "" : "s"}`;
  }

  const skipped: string[] = [];
  const files: OcfFile[] = [];
  for (const e of entries) {
    if (!e.name.toLowerCase().endsWith(".json")) {
      skipped.push(e.name);
      continue;
    }
    try {
      files.push({ name: e.name, content: JSON.parse(new TextDecoder().decode(e.bytes)) as unknown });
    } catch {
      return { ok: false, message: `Couldn't import it: ${e.name} isn't valid JSON.` };
    }
  }
  if (files.length === 0) return { ok: false, message: `Couldn't import it: ${source} holds no .json files, so no OCF package.` };
  try {
    return { ok: true, result: readOcf(files), files, source, skipped };
  } catch (e) {
    if (!(e instanceof OcfRefusal)) throw e;
    const message = e.message.endsWith(".") ? e.message : `${e.message}.`;
    return {
      ok: false,
      message:
        e.kind === "unsupported"
          ? `Couldn't import it: it uses something spillpoint doesn't model yet, and it refuses rather than leave it out. ${message}`
          : `Couldn't import it: its files disagree with each other or with OCF, so there's no one cap table to build. ${message}`,
    };
  }
}

// ---------- what the package says, for the report ----------

/** Names and details from the package's own objects, for the report's plain-English lines. */
export class Package {
  private readonly byId = new Map<string, Json>();
  private readonly bySecurity = new Map<string, Json>();
  readonly issuer: string;

  constructor(files: readonly OcfFile[]) {
    let issuer = "";
    for (const f of files) {
      const c = f.content as Json;
      if (c.file_type === "OCF_MANIFEST_FILE") issuer = String((c.issuer as Json | undefined)?.legal_name ?? "");
      for (const o of (Array.isArray(c.items) ? c.items : []) as Json[]) {
        this.byId.set(String(o.id), o);
        if (/_ISSUANCE$/.test(String(o.object_type)) && typeof o.security_id === "string") this.bySecurity.set(o.security_id, o);
      }
    }
    this.issuer = issuer || "The company";
  }

  /** A stakeholder's legal name, or a class's name, by id. */
  name(id: string): string {
    const o = this.byId.get(id);
    if (!o) return id;
    if (o.object_type === "STAKEHOLDER") return String((o.name as Json | undefined)?.legal_name ?? id);
    return typeof o.name === "string" ? o.name : id;
  }

  /** The issuance that created a security. */
  issuance(securityId: string): Json | undefined {
    return this.bySecurity.get(securityId);
  }
}

/** "June 30, 2025". */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1];
  return `${month} ${d}, ${y}`;
}

const grouped = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** A share count as written in the package: "125,000". */
function count(value: unknown): string {
  return grouped(new D(String(value)).toFixed());
}

/** A price: "$0.80", "$1.00", or to six places when written longer ("$0.384930"). */
export function price(amount: D): string {
  return `$${amount.decimalPlaces() <= 2 ? amount.toFixed(2) : amount.toFixed(Math.min(amount.decimalPlaces(), 6), D.ROUND_HALF_UP)}`;
}

const amountOf = (o: Json | undefined, field: string): D | null => {
  const m = o?.[field] as Json | undefined;
  return m && typeof m.amount === "string" ? new D(m.amount) : null;
};

/** One line for each of the report's notes (O10), in plain English. */
export function reportLines(result: OcfImport, pkg: Package): string[] {
  const securities = (result.cap_table as { securities: Json[] }).securities;
  const security = (id: string) => securities.find((s) => s.id === id);
  const ct = result.cap_table as { unconverted_safes?: unknown[]; unconverted_notes?: unknown[] };
  const hasNotes = (ct.unconverted_notes ?? []).length > 0;
  const convertiblesOutstanding = (ct.unconverted_safes ?? []).length + (ct.unconverted_notes ?? []).length;
  const asOf = longDate(result.as_of);
  const holderOf = (sec: string) => pkg.name(String(pkg.issuance(sec)?.stakeholder_id ?? ""));

  return result.report.notes.map((n) => {
    const subject = n.subject ?? "";
    const cls = pkg.name(subject);
    switch (n.code) {
      case "no_dividend_field":
        return "OCF has no field for cumulative dividends. If a series has them, add them in the editor.";
      case "no_conversion_group_field":
        return "OCF has no field for series that must convert together. If the charter makes them vote as a class, add that in the editor.";
      case "no_carve_out_field":
        return "OCF has no field for a management carve-out. If the sale has one, add it in the editor.";
      case "no_sale_date_field":
        return `OCF has no field for the sale's date. ${hasNotes ? "Notes accrue interest up to it, so it's asked for below." : "Nothing here needs it."}`;
      case "convertible_seniority_ignored":
        return convertiblesOutstanding > 0
          ? "Seniority among the SAFEs and notes is ignored: the ones still outstanding rank alike."
          : `Seniority among the SAFEs and notes doesn't matter: none is outstanding on ${asOf}.`;
      case "common_preference_ignored":
        return `${cls} is common stock but gives a liquidation preference. Common has none, so it's ignored.`;
      case "no_anti_dilution_field":
        return `OCF has no field for ${cls}'s anti-dilution, so it's read as none. A sale doesn't need it: any adjustment is already in the conversion price.`;
      case "participation_cap_includes_preference": {
        const s = security(subject);
        if (s?.participation === "participating_capped") {
          return `${cls}'s participation cap is read as including its preference, so it gets at most ${String(s.cap_multiple)}x its issue price in all. OCF doesn't say which.`;
        }
        if (s?.participation === "non_participating") {
          return `${cls}'s participation cap equals its preference, so it's read as non-participating. OCF doesn't say whether a cap includes the preference.`;
        }
        return `${cls}'s participation cap is read as including its preference. OCF doesn't say which.`;
      }
      case "conversion_rounding_not_modeled":
        return `${cls}'s conversion says how to round converted shares. spillpoint converts without rounding, so a payout can differ by a fraction of a share.`;
      case "conversion_ratio_rounded":
        return `${cls}'s conversion ratio agrees with its prices only to the places they're written to. spillpoint uses its conversion price, the charter's defined term.`;
      case "unrecognized_field":
        return `${pkg.name(subject)} has a field spillpoint doesn't know, "${n.field ?? ""}". It's ignored.`;
      case "issued_at_other_price": {
        // Jordan's wording (04a review).
        const iss = pkg.issuance(subject);
        const clsId = String(iss?.stock_class_id ?? "");
        const name = pkg.name(clsId);
        const s = security(clsId);
        const issued = amountOf(iss, "share_price");
        const preference =
          s && typeof s.original_issue_price === "string" ? new D(s.original_issue_price).times(typeof s.preference_multiple === "string" ? s.preference_multiple : "1") : null;
        return (
          `${holderOf(subject)}'s ${count(iss?.quantity ?? "0")} ${name} were issued at ${issued ? price(issued) : "another price"} but carry ${name}'s ` +
          `${preference ? `${price(preference)} ` : ""}preference. If they should be a separate series with a lower preference (as a SAFE's shares often are), set that up in the editor.`
        );
      }
      case "expired_option_left_out": {
        const iss = pkg.issuance(subject);
        const strike = amountOf(iss, "exercise_price");
        const what = String(iss?.compensation_type ?? iss?.plan_security_type) === "RSU" ? "RSUs" : `options${strike ? ` at ${price(strike)}` : ""}`;
        const when = typeof iss?.expiration_date === "string" ? ` on ${longDate(iss.expiration_date)}` : "";
        return `${holderOf(subject)}'s ${count(iss?.quantity ?? "0")} ${what} expired${when}, before ${asOf}, so they're left out.`;
      }
      case "expired_warrant_left_out": {
        const iss = pkg.issuance(subject);
        const when = typeof iss?.warrant_expiration_date === "string" ? ` on ${longDate(iss.warrant_expiration_date)}` : "";
        return `${holderOf(subject)}'s warrant expired${when}, before ${asOf}, so it's left out.`;
      }
      case "rsu_as_option":
        return `${holderOf(subject)}'s RSUs are read as options with no strike: each delivers a share for nothing.`;
      case "safe_exit_multiple_read_as_1":
        return `${holderOf(subject)}'s SAFE gives no exit multiple, so at a sale it's paid its purchase amount, as a SAFE's Cash-Out Amount is.`;
      case "note_cap_read_as_pre_money":
        return `${holderOf(subject)}'s note's cap is read as pre-money, the only kind spillpoint models for a note. OCF doesn't say which.`;
      case "left_out_stakeholder":
        return `${pkg.name(subject)} holds nothing on ${asOf}, so they're left out.`;
      case "left_out_stock_class":
        return `${cls} has nothing outstanding on ${asOf}, so it's left out.`;
      case "not_in_manifest":
        return `${subject} isn't in the package's manifest. It was read anyway.`;
      default:
        return `${n.code}${subject ? ` (${subject})` : ""}`;
    }
  });
}

/** What was read, as one sentence: "10 holders; 3 classes of stock, 2 option classes and a warrant class; 2 SAFEs and a note; an unissued pool of 1,260,000." */
export function summary(result: OcfImport): string {
  const ct = result.cap_table as { holders: unknown[]; securities: Json[]; unissued_pool: number; unconverted_safes?: unknown[]; unconverted_notes?: unknown[] };
  const of = (n: number, one: string, many: string) => (n === 1 ? `a ${one}` : `${n} ${many}`);
  const kinds = (k: string) => ct.securities.filter((s) => s.kind === k).length;
  const stock = ct.securities.filter((s) => s.kind === "common" || s.kind === "preferred").length;
  const parts = [
    `${ct.holders.length} holder${ct.holders.length === 1 ? "" : "s"}`,
    [
      stock === 1 ? "one class of stock" : `${stock} classes of stock`,
      ...(kinds("option") ? [of(kinds("option"), "class of options", "classes of options")] : []),
      ...(kinds("warrant") ? [of(kinds("warrant"), "class of warrants", "classes of warrants")] : []),
    ].join(", "),
    ...((ct.unconverted_safes?.length ?? 0) + (ct.unconverted_notes?.length ?? 0) > 0
      ? [
          [
            ...(ct.unconverted_safes?.length ? [of(ct.unconverted_safes.length, "SAFE", "SAFEs")] : []),
            ...(ct.unconverted_notes?.length ? [of(ct.unconverted_notes.length, "note", "notes")] : []),
          ].join(" and ") + " outstanding",
        ]
      : []),
    `an unissued pool of ${grouped(String(ct.unissued_pool))}`,
  ];
  return `${parts.join("; ")}.`;
}

/** An object type as a reader would say it: "TX_STOCK_ISSUANCE" is "stock issuances". */
export function typeName(type: string): string {
  const names: Record<string, string> = {
    ISSUER: "issuer", STAKEHOLDER: "stakeholders", STOCK_CLASS: "stock classes", STOCK_PLAN: "stock plans", STOCK_LEGEND_TEMPLATE: "stock legends",
    VESTING_TERMS: "vesting terms", VALUATION: "valuations", FINANCING: "financings", DOCUMENT: "documents",
    CE_STAKEHOLDER_RELATIONSHIP: "stakeholder relationship changes", CE_STAKEHOLDER_STATUS: "stakeholder status changes",
  };
  return names[type] ?? type.replace(/^TX_/, "").toLowerCase().replace(/_/g, " ").replace(/ (issuance|exercise|cancellation|transfer|retraction|conversion|release|repricing|repurchase|acceptance|adjustment|split|reissuance|consolidation|start|event|acceleration)$/, " $1s").replace(/ return to pool$/, " returns to the pool");
}

// ---------- the terms to fill in ----------

export interface Question {
  key: string;
  blank: OcfToFill;
  /** What's asked. */
  label: string;
  /** Why it's asked, or what it means. */
  hint: string;
  /** Choices, for a question with set answers; none for a typed number. */
  choices?: { value: string; label: string }[];
}

/** One question for each blank the import left (O1, answer 4). */
export function questions(result: OcfImport, pkg: Package): Question[] {
  const ct = result.cap_table as { securities: Json[]; unconverted_safes?: Json[]; unconverted_notes?: Json[] };
  return result.to_fill.map((blank) => {
    const key = `${blank.security ? "security" : blank.safe ? "safe" : "note"}:${blank.security ?? blank.safe ?? blank.note}:${blank.field}`;
    if (blank.security) {
      const s = ct.securities.find((x) => x.id === blank.security)!;
      const name = String(s.name);
      switch (blank.field) {
        case "participation":
          return {
            key, blank,
            label: `Does ${name} participate?`,
            hint:
              s.cap_multiple != null
                ? `OCF has no participation flag, and with no preference multiple its ${String(s.cap_multiple)}x cap can't settle it.`
                : `OCF has no participation flag, and ${name} gives no participation cap, so it could be either.`,
            choices: [
              { value: "non_participating", label: "Non-participating: its preference, or converting, whichever pays more" },
              { value: "participating", label: "Participating, without a cap: its preference, then a share of the rest as if converted" },
              ...(s.cap_multiple != null ? [{ value: "participating_capped", label: `Participating, capped at ${String(s.cap_multiple)}x its issue price in all` }] : []),
            ],
          };
        case "original_issue_price":
          return { key, blank, label: `${name}'s original issue price, a share`, hint: "OCF gives none: the price its investors paid for each share." };
        case "preference_multiple":
          return { key, blank, label: `${name}'s liquidation preference, as a multiple of its issue price`, hint: "OCF gives none. 1 means 1x: its issue price back, a share." };
        case "conversion_price":
          return { key, blank, label: `${name}'s conversion price, a share`, hint: "OCF gives no conversion right. It's usually the issue price, unless anti-dilution lowered it." };
      }
    }
    if (blank.safe) {
      const f = ct.unconverted_safes!.find((x) => x.id === blank.safe)!;
      const who = pkg.name(String(f.holder));
      return {
        key, blank,
        // Jordan's wording (04a2 review).
        label: "Is this SAFE's cap pre-money or post-money?",
        hint: `${who}'s ${shortDollars(new D(String(f.purchase_amount)))} SAFE, capped at ${shortDollars(new D(String(f.valuation_cap)))}. OCF gives no conversion timing to say which.`,
        choices: [
          { value: "post_money", label: "Post-money" },
          { value: "pre_money", label: "Pre-money" },
        ],
      };
    }
    const note = ct.unconverted_notes!.find((x) => x.id === blank.note)!;
    const who = pkg.name(String(note.holder));
    if (blank.field === "conversion_base") {
      return {
        key, blank,
        label: `What does ${who}'s note's cap divide by?`,
        hint: "Its capitalization rules match neither reading spillpoint models.",
        choices: [
          { value: "with_pool", label: "The company's shares, options and unissued pool" },
          { value: "without_pool", label: "The company's shares and options, without the unissued pool" },
        ],
      };
    }
    return {
      key, blank,
      label: `${who}'s note's repayment multiple at a sale`,
      hint: "OCF gives no exit multiple, and spillpoint won't assume 1x. At a sale the note takes this multiple of principal plus interest, or converts, whichever pays more.",
    };
  });
}

/** A typed amount, written exactly: "$1.50" or "1,000" → "1.50", "1000". Null if it isn't a positive number. */
export function exactAmount(text: string): string | null {
  const t = text.trim().replace(/^\$/, "").replace(/,/g, "");
  return /^\d+(\.\d+)?$/.test(t) && !new D(t).isZero() ? t : null;
}

/**
 * Exit values to show, up to: ten times what's ahead of common at a sale (every preference, SAFE and note), rounded up
 * to 1, 2 or 5 of a power of ten, and at least $10M. Series usually convert well inside it; you can change it.
 */
export function defaultTop(capTable: Json): string {
  const ct = capTable as { securities: Json[]; positions: { security: string; shares: number }[]; unconverted_safes?: Json[]; unconverted_notes?: Json[] };
  let ahead = new D(0);
  for (const s of ct.securities) {
    if (s.kind !== "preferred" || typeof s.original_issue_price !== "string") continue;
    const shares = ct.positions.filter((p) => p.security === s.id).reduce((t, p) => t + p.shares, 0);
    ahead = ahead.plus(new D(s.original_issue_price).times(typeof s.preference_multiple === "string" ? s.preference_multiple : "1").times(shares));
  }
  for (const f of ct.unconverted_safes ?? []) ahead = ahead.plus(String(f.purchase_amount));
  for (const n of ct.unconverted_notes ?? []) ahead = ahead.plus(String(n.principal));
  const target = D.max(ahead.times(10), new D("10000000"));
  const power = new D(10).pow(target.log(10).floor());
  for (const step of [1, 2, 5, 10]) if (power.times(step).gte(target)) return power.times(step).toFixed();
  return power.times(10).toFixed();
}

/**
 * The cap table with the answers filled in, ready for readExit. A SAFE whose cap kind was blank takes the cap as a
 * post-money or pre-money cap; a series answered "participating, without a cap" has no cap.
 */
export function filled(result: OcfImport, answers: Record<string, string>): Json {
  const ct = structuredClone(result.cap_table) as Json & { securities: Json[]; unconverted_safes?: Json[]; unconverted_notes?: Json[] };
  for (const q of result.to_fill) {
    const key = `${q.security ? "security" : q.safe ? "safe" : "note"}:${q.security ?? q.safe ?? q.note}:${q.field}`;
    const answer = answers[key]!;
    if (q.security) {
      const s = ct.securities.find((x) => x.id === q.security)!;
      s[q.field] = q.field === "participation" ? answer : exactAmount(answer);
      if (q.field === "participation" && answer !== "participating_capped") s.cap_multiple = null;
    } else if (q.safe) {
      ct.unconverted_safes = ct.unconverted_safes!.map((f) => {
        if (f.id !== q.safe) return f;
        const { valuation_cap, cap_type: _blank, ...rest } = f;
        return { ...rest, [answer === "post_money" ? "post_money_cap" : "pre_money_cap"]: valuation_cap };
      });
    } else {
      const n = ct.unconverted_notes!.find((x) => x.id === q.note)!;
      n[q.field] = q.field === "conversion_base" ? answer : exactAmount(answer);
    }
  }
  return ct;
}
