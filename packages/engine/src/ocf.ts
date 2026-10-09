// Reading an Open Cap Format package into a cap table (M6; ASSUMPTIONS O1–O12).
//
// Open Cap Format (OCF) is developed by the Open Cap Table Coalition:
// https://open-cap-table-coalition.github.io/Open-Cap-Format-OCF/. spillpoint
// reads files in that format.
//
// OCF records a company's ledger: who was issued what, and what happened to it
// since. It doesn't record how a round was priced, so an import builds no
// rounds: it gives the cap table as of the package's date, in the case-file
// format (C1–C4), with a blank (null) wherever OCF doesn't settle a term, the
// list of those blanks to fill in, and a report of what was read, set aside
// and noted. Anything that would change payouts and isn't modeled is refused
// by name, never skipped.
//
// The engine does no I/O: readOcf takes the files already parsed. Opening a
// .zip is the page's job.

import type { Decimal } from "decimal.js";

import { D } from "./decimal.ts";
import { type OcfClass, readStockClasses } from "./ocf-classes.ts";
import { Convertibles } from "./ocf-convertibles.ts";
import { Grants } from "./ocf-grants.ts";
import { ShareLedger } from "./ocf-ledger.ts";
import { type OcfNote, Notes } from "./ocf-notes.ts";
import { type Json, asWritten, date, isObject, malformed, text, unsupported } from "./ocf-read.ts";
import { Warrants } from "./ocf-warrants.ts";

export type { OcfNote } from "./ocf-notes.ts";

/** One file of a package, its JSON already parsed. */
export interface OcfFile {
  /** The file's name, as the manifest lists it (Stakeholders.ocf.json, ...). A folder in front is ignored. */
  name: string;
  content: unknown;
}

/** A term an import leaves blank, for the page to ask about (O1). */
export interface OcfToFill {
  security?: string;
  safe?: string;
  note?: string;
  field: string;
}

export interface OcfReport {
  /** How many of each object type set the cap table. */
  read: Record<string, number>;
  /** How many of each type were read and set aside, since they don't change payouts. */
  not_needed: Record<string, number>;
  notes: OcfNote[];
}

/** An import, in the case-file format: `cap_table` reads with readCapTable once its blanks are filled in. */
export interface OcfImport {
  as_of: string;
  cap_table: Record<string, unknown>;
  to_fill: OcfToFill[];
  report: OcfReport;
}

const FILE_TYPES = [
  "OCF_MANIFEST_FILE", "OCF_STAKEHOLDERS_FILE", "OCF_STOCK_CLASSES_FILE", "OCF_STOCK_LEGEND_TEMPLATES_FILE", "OCF_STOCK_PLANS_FILE",
  "OCF_TRANSACTIONS_FILE", "OCF_VALUATIONS_FILE", "OCF_VESTING_TERMS_FILE", "OCF_FINANCINGS_FILE", "OCF_DOCUMENTS_FILE",
];

/** O10: read and set aside, because they don't change who gets what. */
const NOT_NEEDED = new Set([
  "STOCK_LEGEND_TEMPLATE", "VESTING_TERMS", "VALUATION", "FINANCING", "DOCUMENT",
  "TX_STOCK_ACCEPTANCE", "TX_EQUITY_COMPENSATION_ACCEPTANCE", "TX_PLAN_SECURITY_ACCEPTANCE", "TX_WARRANT_ACCEPTANCE", "TX_CONVERTIBLE_ACCEPTANCE",
  "TX_VESTING_START", "TX_VESTING_EVENT", "TX_VESTING_ACCELERATION",
  "TX_ISSUER_AUTHORIZED_SHARES_ADJUSTMENT", "TX_STOCK_CLASS_AUTHORIZED_SHARES_ADJUSTMENT",
  "CE_STAKEHOLDER_RELATIONSHIP", "CE_STAKEHOLDER_STATUS",
]);

// The fields OCF 1.2 gives each type read; the keys are the types read. Any other field gets a report line, since
// there's no schema validator (answer 9).
const OBJECT = ["object_type", "id", "comments"];
const TX = [...OBJECT, "date"];
const SECURITY_TX = [...TX, "security_id"];
const APPROVALS = ["board_approval_date", "stockholder_approval_date"];
const ISSUANCE = [...SECURITY_TX, "custom_id", "stakeholder_id", ...APPROVALS, "consideration_text", "security_law_exemptions"];
const GRANT_FIELDS = {
  ISSUANCE: [
    ...ISSUANCE, "stock_plan_id", "stock_class_id", "vesting_terms_id", "vestings", "compensation_type", "plan_security_type", "option_grant_type",
    "quantity", "exercise_price", "base_price", "early_exercisable", "termination_exercise_windows", "expiration_date",
  ],
  EXERCISE: [...SECURITY_TX, "quantity", "resulting_security_ids", "balance_security_id", "consideration_text"],
  RELEASE: [...SECURITY_TX, "quantity", "release_price", "settlement_date", "resulting_security_ids", "balance_security_id", "consideration_text"],
  CANCELLATION: [...SECURITY_TX, "quantity", "balance_security_id", "reason_text"],
  TRANSFER: [...SECURITY_TX, "quantity", "resulting_security_ids", "balance_security_id", "consideration_text"],
  RETRACTION: [...SECURITY_TX, "reason_text"],
};
const KNOWN_FIELDS: Record<string, readonly string[]> = {
  ISSUER: [
    ...OBJECT, "legal_name", "dba", "formation_date", "country_of_formation", "country_subdivision_of_formation",
    "country_subdivision_name_of_formation", "tax_ids", "email", "phone", "address", "initial_shares_authorized",
  ],
  STAKEHOLDER: [
    ...OBJECT, "name", "stakeholder_type", "issuer_assigned_id", "current_relationship", "current_relationships", "current_status",
    "primary_contact", "contact_info", "addresses", "tax_ids",
  ],
  STOCK_CLASS: [
    ...OBJECT, "name", "class_type", "default_id_prefix", "initial_shares_authorized", ...APPROVALS,
    "votes_per_share", "par_value", "price_per_share", "seniority", "conversion_rights", "liquidation_preference_multiple", "participation_cap_multiple",
  ],
  STOCK_PLAN: [...OBJECT, "plan_name", ...APPROVALS, "initial_shares_reserved", "default_cancellation_behavior", "stock_class_ids", "stock_class_id"],

  TX_STOCK_ISSUANCE: [
    ...ISSUANCE, "stock_class_id", "stock_plan_id", "share_numbers_issued", "share_price", "quantity", "vesting_terms_id",
    "vestings", "cost_basis", "stock_legend_ids", "issuance_type",
  ],
  TX_STOCK_CANCELLATION: [...SECURITY_TX, "quantity", "balance_security_id", "reason_text"],
  TX_STOCK_REPURCHASE: [...SECURITY_TX, "quantity", "price", "balance_security_id", "consideration_text"],
  TX_STOCK_TRANSFER: [...SECURITY_TX, "quantity", "resulting_security_ids", "balance_security_id", "consideration_text"],
  TX_STOCK_CONVERSION: [...SECURITY_TX, "quantity_converted", "resulting_security_ids", "balance_security_id"],
  TX_STOCK_RETRACTION: [...SECURITY_TX, "reason_text"],
  TX_STOCK_REISSUANCE: [...SECURITY_TX, "resulting_security_ids", "split_transaction_id", "reason_text"],
  TX_STOCK_CONSOLIDATION: [...TX, "security_ids", "resulting_security_id", "reason_text"],
  TX_STOCK_CLASS_SPLIT: [...TX, "stock_class_id", "split_ratio", ...APPROVALS],
  TX_STOCK_CLASS_CONVERSION_RATIO_ADJUSTMENT: [...TX, "stock_class_id", "new_ratio_conversion_mechanism", ...APPROVALS],

  TX_STOCK_PLAN_POOL_ADJUSTMENT: [...TX, "stock_plan_id", "shares_reserved", ...APPROVALS],
  TX_STOCK_PLAN_RETURN_TO_POOL: [...SECURITY_TX, "stock_plan_id", "quantity", "reason_text"],
  ...Object.fromEntries(Object.entries(GRANT_FIELDS).flatMap(([t, f]) => [[`TX_EQUITY_COMPENSATION_${t}`, f], [`TX_PLAN_SECURITY_${t}`, f]])),
  TX_EQUITY_COMPENSATION_REPRICING: [...SECURITY_TX, "new_exercise_price"],

  TX_WARRANT_ISSUANCE: [
    ...ISSUANCE, "quantity", "quantity_source", "exercise_price", "purchase_price", "exercise_triggers", "warrant_expiration_date",
    "vesting_terms_id", "vestings",
  ],
  TX_WARRANT_EXERCISE: [...SECURITY_TX, "trigger_id", "resulting_security_ids", "balance_security_id", "consideration_text"],
  TX_WARRANT_CANCELLATION: [...SECURITY_TX, "quantity", "balance_security_id", "reason_text"],
  TX_WARRANT_TRANSFER: [...SECURITY_TX, "quantity", "resulting_security_ids", "balance_security_id", "consideration_text"],
  TX_WARRANT_RETRACTION: [...SECURITY_TX, "reason_text"],

  TX_CONVERTIBLE_ISSUANCE: [...ISSUANCE, "investment_amount", "convertible_type", "conversion_triggers", "pro_rata", "seniority"],
  TX_CONVERTIBLE_CONVERSION: [...SECURITY_TX, "trigger_id", "resulting_security_ids", "balance_security_id", "reason_text", "quantity_converted", "capitalization_definition"],
  TX_CONVERTIBLE_CANCELLATION: [...SECURITY_TX, "amount", "balance_security_id", "reason_text"],
  TX_CONVERTIBLE_TRANSFER: [...SECURITY_TX, "amount", "resulting_security_ids", "balance_security_id", "consideration_text"],
  TX_CONVERTIBLE_RETRACTION: [...SECURITY_TX, "reason_text"],
};

/** O2: OCF 1.0 to 1.2, whose 1.x names (the older TX_PLAN_SECURITY_*, too) are all read, with any pre-release or build suffix. */
const READ_VERSIONS = /^1\.[0-2]\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

/** The last part of a path: a manifest lists files by name, and a .zip may keep them in a folder. */
const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** Reads an OCF package (O1–O12). Throws OcfRefusal for anything it won't read. */
export function readOcf(files: readonly OcfFile[]): OcfImport {
  const notes = new Notes();

  // ---------- the files and the manifest (O2) ----------
  const typed = files.map((f) => {
    if (!isObject(f.content) || typeof f.content.file_type !== "string") {
      throw malformed("not_an_ocf_file", f.name, `${f.name} isn't an OCF file: it has no file_type`);
    }
    if (!FILE_TYPES.includes(f.content.file_type)) {
      throw unsupported("unknown_file_type", f.name, `${f.name} is an ${f.content.file_type}, which isn't an OCF file type`);
    }
    return { name: f.name, content: f.content };
  });
  // Files are matched by name, ignoring folders, so two files of one name can't be told apart.
  const byName = new Map<string, string>();
  for (const f of typed) {
    const other = byName.get(fileName(f.name));
    if (other != null) throw malformed("ambiguous_file", fileName(f.name), `The package has two files named ${fileName(f.name)} (${other} and ${f.name}); it can't tell which the manifest means`);
    byName.set(fileName(f.name), f.name);
  }
  const manifests = typed.filter((f) => f.content.file_type === "OCF_MANIFEST_FILE");
  if (manifests.length === 0) throw malformed("no_manifest", "", "The package has no manifest (an OCF_MANIFEST_FILE)");
  if (manifests.length > 1) throw malformed("several_manifests", manifests[1]!.name, `The package has more than one manifest: ${manifests.map((m) => m.name).join(", ")}`);
  const manifest = manifests[0]!.content;
  const version = text(manifest, "ocf_version", "manifest");
  if (!READ_VERSIONS.test(version)) throw unsupported("ocf_version", version, `The package is OCF ${version}; spillpoint reads versions 1.0 to 1.2`);
  const asOf = date(manifest, "as_of", "manifest");
  const issuer = manifest.issuer;
  if (!isObject(issuer)) throw malformed("missing_field", "manifest", "The manifest has no issuer, which OCF requires");

  const listed = new Set<string>();
  for (const [key, value] of Object.entries(manifest)) {
    if (!key.endsWith("_files")) continue;
    if (!Array.isArray(value)) throw malformed("bad_value", "manifest", `The manifest's ${key} should be a list`);
    for (const entry of value) {
      const path = isObject(entry) && typeof entry.filepath === "string" ? entry.filepath : null;
      if (path == null) throw malformed("bad_value", "manifest", `The manifest's ${key} lists a file without a filepath`);
      // O2: every file the manifest lists must be given, matched by name.
      if (!byName.has(fileName(path))) throw malformed("missing_file", path, `The manifest lists ${path}, which isn't in the package`);
      listed.add(fileName(path));
    }
  }
  // A file the manifest doesn't list is read too, with a report line.
  for (const f of typed) if (f.content.file_type !== "OCF_MANIFEST_FILE" && !listed.has(fileName(f.name))) notes.add("not_in_manifest", f.name);

  // ---------- the objects ----------
  text(issuer, "id", "manifest's issuer");
  const objects: Json[] = [{ ...issuer, object_type: "ISSUER" }];
  for (const f of typed) {
    if (f.content.file_type === "OCF_MANIFEST_FILE") continue;
    const items = f.content.items;
    if (!Array.isArray(items)) throw malformed("bad_value", f.name, `${f.name} has no list of items`);
    for (const item of items) {
      if (!isObject(item) || typeof item.object_type !== "string" || typeof item.id !== "string" || item.id === "") {
        throw malformed("bad_value", f.name, `${f.name} has an item without an object_type and an id`);
      }
      objects.push(item);
    }
  }
  const seenIds = new Set<string>();
  for (const o of objects) {
    const id = o.id as string;
    if (seenIds.has(id)) throw malformed("duplicate_id", id, `Two objects in the package have the id ${id}`);
    seenIds.add(id);
  }

  const read: Record<string, number> = {};
  const notNeeded: Record<string, number> = {};
  const count = (tally: Record<string, number>, type: string) => (tally[type] = (tally[type] ?? 0) + 1);
  for (const o of objects) {
    const type = o.object_type as string;
    const id = o.id as string;
    if (NOT_NEEDED.has(type)) {
      count(notNeeded, type);
      continue;
    }
    const known = KNOWN_FIELDS[type];
    if (!known) throw unsupported("unknown_object_type", id, `${id} is a ${type}, which spillpoint doesn't read; it's refused rather than skipped`);
    count(read, type);
    // O2: amounts in US dollars only.
    const currency = foreignCurrency(o);
    if (currency) throw unsupported("currency", id, `${id} has an amount in ${currency}; spillpoint reads US dollars only`);
    // O1: the cap table is as of the package's date, so nothing read may come after it.
    if (type.startsWith("TX_") && date(o, "date", id) > asOf) {
      throw malformed("after_as_of", id, `${id} is dated ${o.date as string}, after the package's date, ${asOf}`);
    }
    for (const field of Object.keys(o)) if (!known.includes(field)) notes.add("unrecognized_field", id, field);
  }
  const ofType = (...types: string[]) => objects.filter((o) => types.includes(o.object_type as string));

  // ---------- stakeholders (O3), classes (O4), and every ledger in one pass by date (O5–O9) ----------
  const stakeholders = ofType("STAKEHOLDER").map((o) => {
    const id = o.id as string;
    const name = isObject(o.name) ? o.name.legal_name : undefined;
    if (typeof name !== "string" || name === "") throw malformed("missing_field", id, `${id} has no legal name, which OCF requires`);
    return { id, name };
  });
  const stakeholderIds = new Set(stakeholders.map((s) => s.id));
  const classes = readStockClasses(ofType("STOCK_CLASS"), notes);
  const grants = new Grants(
    ofType("STOCK_PLAN"), ofType("TX_EQUITY_COMPENSATION_ISSUANCE", "TX_PLAN_SECURITY_ISSUANCE"), objects, classes, stakeholderIds, notes,
  );
  const warrants = new Warrants(ofType("TX_WARRANT_ISSUANCE"), classes, stakeholderIds, notes);
  const convertibles = new Convertibles(ofType("TX_CONVERTIBLE_ISSUANCE"), stakeholderIds, notes);
  const stock = new ShareLedger(
    ofType("TX_STOCK_ISSUANCE"), classes, stakeholderIds, notes,
    // O5: a split of a class with options or warrants outstanding on it is refused.
    (cls) => (cls.common && grants.anyOutstanding() ? "options are" : warrants.outstandingFor(cls.id) ? "warrants for it are" : null),
    (tx, plan) => grants.stockIssuedUnderPlan(tx, plan),
  );
  const steps: Record<string, (tx: Json) => void> = { ...stock.steps, ...grants.steps, ...warrants.steps, ...convertibles.steps };
  // O2: in date order; on one date, its splits first, then the rest in file order.
  const isSplit = (o: Json) => (o.object_type === "TX_STOCK_CLASS_SPLIT" ? 0 : 1);
  const transactions = objects
    .map((tx, order) => ({ tx, order }))
    .filter(({ tx }) => steps[tx.object_type as string] != null)
    .sort((a, b) => (a.tx.date as string).localeCompare(b.tx.date as string) || isSplit(a.tx) - isSplit(b.tx) || a.order - b.order);
  for (const { tx } of transactions) steps[tx.object_type as string]!(tx);

  // ---------- the cap table, as of the package's date ----------
  const shares = stock.positions();
  const options = grants.finish(asOf);
  const warranted = warrants.finish(asOf);
  const { safes, notes: notesOutstanding } = convertibles.finish();

  // O4: a preferred class with nothing outstanding, and no warrant for it, is left out; every common class stays.
  const kept = [...classes.values()].filter((c) => c.common || warranted.underlying.has(c.id) || [...shares.values()].some((byClass) => byClass.has(c.id)));
  for (const c of classes.values()) if (!kept.includes(c)) notes.add("left_out_stock_class", c.id);
  const securities: Json[] = [
    ...kept.map(securityOf),
    ...options.classes.map((c) => ({ id: c.id, name: c.name, kind: "option", strike: asWritten(c.strike) })),
    ...warranted.classes.map((c) => ({ id: c.id, name: c.name, kind: "warrant", strike: asWritten(c.strike), underlying: c.underlying })),
  ];
  const held = (holder: string, security: string): Decimal | undefined =>
    shares.get(holder)?.get(security) ?? options.positions.get(holder)?.get(security) ?? warranted.positions.get(holder)?.get(security);
  const convertibleHolders = new Set([...safes, ...notesOutstanding].map((c) => c.holder as string));
  // O3: a stakeholder with nothing outstanding is left out, and listed.
  const holders = stakeholders.filter((h) => convertibleHolders.has(h.id) || securities.some((s) => held(h.id, s.id as string)));
  for (const s of stakeholders) if (!holders.includes(s)) notes.add("left_out_stakeholder", s.id);
  const positions = holders.flatMap((h) =>
    securities.flatMap((s) => {
      const n = held(h.id, s.id as string);
      return n ? [{ holder: h.id, security: s.id as string, shares: wholeNumber(n, h.id) }] : [];
    }),
  );
  // O4: a higher seniority ranks ahead; equal seniority shares a tier, pari passu.
  const preferred = kept.filter((c) => !c.common);
  const levels = [...new Set(preferred.map((c) => c.seniority.toString()))].sort((a, b) => new D(b).cmp(new D(a)));
  const seniority = levels.map((level) => preferred.filter((c) => c.seniority.eq(level)).map((c) => c.id));

  // O11: terms OCF has no field for, one line each.
  for (const code of ["no_dividend_field", "no_conversion_group_field", "no_carve_out_field", "no_sale_date_field"]) notes.add(code);

  // A blank is a term to fill in, except a cap multiple for a series that isn't capped.
  const blanks = (list: Json[], key: "security" | "safe" | "note"): OcfToFill[] =>
    list.flatMap((x) =>
      Object.entries(x)
        .filter(([field, value]) => value === null && !(key === "security" && field === "cap_multiple"))
        .map(([field]) => ({ [key]: x.id as string, field })),
    );

  return {
    as_of: asOf,
    cap_table: {
      holders,
      securities,
      seniority,
      conversion_groups: [],
      positions,
      unissued_pool: wholeNumber(options.pool, "the unissued pool"),
      ...(safes.length > 0 ? { unconverted_safes: safes } : {}),
      ...(notesOutstanding.length > 0 ? { unconverted_notes: notesOutstanding } : {}),
    },
    to_fill: [...blanks(securities, "security"), ...blanks(safes, "safe"), ...blanks(notesOutstanding, "note")],
    report: { read, not_needed: notNeeded, notes: notes.list() },
  };
}

/** A class as the case-file format writes a security (C1), with null for each blank. */
function securityOf(c: OcfClass): Json {
  if (c.common) return { id: c.id, name: c.name, kind: "common" };
  const written = (n: Decimal | null) => (n == null ? null : asWritten(n));
  return {
    id: c.id,
    name: c.name,
    kind: "preferred",
    original_issue_price: c.issuePrice == null ? null : asWritten(c.issuePrice.amount),
    conversion_price: c.conversion == null ? null : asWritten(c.conversion.price),
    preference_multiple: written(c.preferenceMultiple),
    participation: c.participation,
    cap_multiple: c.participation === "non_participating" ? null : written(c.capMultiple),
    // O11: OCF has no field for anti-dilution; it doesn't change a sale once the conversion price is set.
    anti_dilution: "none",
  };
}

function wholeNumber(shares: Decimal, subject: string): number {
  const n = shares.toNumber();
  if (!Number.isSafeInteger(n)) throw unsupported("too_many_shares", subject, `${subject} holds ${shares.toString()} shares, more than a cap table here can hold exactly`);
  return n;
}

/** The first non-US-dollar currency anywhere in an object's amounts. */
function foreignCurrency(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = foreignCurrency(v);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  if (typeof value.currency === "string" && value.currency !== "USD") return value.currency;
  for (const v of Object.values(value)) {
    const found = foreignCurrency(v);
    if (found) return found;
  }
  return null;
}

