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
import { LEDGER_TYPES, type LedgerEntry, runShareLedger } from "./ocf-ledger.ts";
import { type OcfNote, Notes } from "./ocf-notes.ts";
import { type Json, asWritten, date, isObject, malformed, text, unsupported } from "./ocf-read.ts";

export type { OcfNote } from "./ocf-notes.ts";

/** One file of a package, its JSON already parsed. */
export interface OcfFile {
  /** The file's name, as the manifest lists it (Stakeholders.ocf.json, ...). */
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

/** Read from 04e: plans and the pool, options and RSUs, warrants, SAFEs and notes. */
const READ_FROM_04E = new Set([
  "STOCK_PLAN", "TX_STOCK_PLAN_POOL_ADJUSTMENT", "TX_STOCK_PLAN_RETURN_TO_POOL",
  ...["ISSUANCE", "EXERCISE", "RELEASE", "CANCELLATION", "TRANSFER", "RETRACTION", "REPRICING"].map((t) => `TX_EQUITY_COMPENSATION_${t}`),
  ...["ISSUANCE", "EXERCISE", "RELEASE", "CANCELLATION", "TRANSFER", "RETRACTION"].map((t) => `TX_PLAN_SECURITY_${t}`),
  ...["ISSUANCE", "EXERCISE", "CANCELLATION", "TRANSFER", "RETRACTION"].map((t) => `TX_WARRANT_${t}`),
  ...["ISSUANCE", "CONVERSION", "CANCELLATION", "TRANSFER", "RETRACTION"].map((t) => `TX_CONVERTIBLE_${t}`),
]);

// The fields OCF 1.2 gives each type read. Any other field gets a report line, since there's no schema validator (answer 9).
const OBJECT = ["object_type", "id", "comments"];
const TX = [...OBJECT, "date"];
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
    ...OBJECT, "name", "class_type", "default_id_prefix", "initial_shares_authorized", "board_approval_date", "stockholder_approval_date",
    "votes_per_share", "par_value", "price_per_share", "seniority", "conversion_rights", "liquidation_preference_multiple", "participation_cap_multiple",
  ],
  TX_STOCK_ISSUANCE: [
    ...TX, "security_id", "custom_id", "stakeholder_id", "board_approval_date", "stockholder_approval_date", "consideration_text",
    "security_law_exemptions", "stock_class_id", "stock_plan_id", "share_numbers_issued", "share_price", "quantity", "vesting_terms_id",
    "vestings", "cost_basis", "stock_legend_ids", "issuance_type",
  ],
  TX_STOCK_CANCELLATION: [...TX, "security_id", "quantity", "balance_security_id", "reason_text"],
  TX_STOCK_REPURCHASE: [...TX, "security_id", "quantity", "price", "balance_security_id", "consideration_text"],
  TX_STOCK_TRANSFER: [...TX, "security_id", "quantity", "resulting_security_ids", "balance_security_id", "consideration_text"],
  TX_STOCK_CONVERSION: [...TX, "security_id", "quantity_converted", "resulting_security_ids", "balance_security_id"],
  TX_STOCK_RETRACTION: [...TX, "security_id", "reason_text"],
  TX_STOCK_REISSUANCE: [...TX, "security_id", "resulting_security_ids", "split_transaction_id", "reason_text"],
  TX_STOCK_CONSOLIDATION: [...TX, "security_ids", "resulting_security_id", "reason_text"],
  TX_STOCK_CLASS_SPLIT: [...TX, "stock_class_id", "split_ratio", "board_approval_date", "stockholder_approval_date"],
  TX_STOCK_CLASS_CONVERSION_RATIO_ADJUSTMENT: [...TX, "stock_class_id", "new_ratio_conversion_mechanism", "board_approval_date", "stockholder_approval_date"],
};

/** O2: OCF 1.0 to 1.2, whose 1.x names (the older TX_PLAN_SECURITY_*, too) are all read. */
const READ_VERSIONS = /^1\.[0-2]\.\d+$/;

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
  const manifests = typed.filter((f) => f.content.file_type === "OCF_MANIFEST_FILE");
  if (manifests.length === 0) throw malformed("no_manifest", "", "The package has no manifest (an OCF_MANIFEST_FILE)");
  if (manifests.length > 1) throw malformed("several_manifests", manifests[1]!.name, `The package has more than one manifest: ${manifests.map((m) => m.name).join(", ")}`);
  const manifest = manifests[0]!.content;
  const version = text(manifest, "ocf_version", "manifest");
  if (!READ_VERSIONS.test(version)) throw unsupported("ocf_version", version, `The package is OCF ${version}; spillpoint reads versions 1.0 to 1.2`);
  const asOf = date(manifest, "as_of", "manifest");
  const issuer = manifest.issuer;
  if (!isObject(issuer)) throw malformed("missing_field", "manifest", "The manifest has no issuer, which OCF requires");

  const given = new Set(typed.map((f) => fileName(f.name)));
  const listed = new Set<string>();
  for (const [key, value] of Object.entries(manifest)) {
    if (!key.endsWith("_files")) continue;
    if (!Array.isArray(value)) throw malformed("bad_value", "manifest", `The manifest's ${key} should be a list`);
    for (const entry of value) {
      const path = isObject(entry) && typeof entry.filepath === "string" ? entry.filepath : null;
      if (path == null) throw malformed("bad_value", "manifest", `The manifest's ${key} lists a file without a filepath`);
      // O2: every file the manifest lists must be given, matched by name.
      if (!given.has(fileName(path))) throw malformed("missing_file", path, `The manifest lists ${path}, which isn't in the package`);
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
  const later = new Set<string>();
  const count = (tally: Record<string, number>, type: string) => (tally[type] = (tally[type] ?? 0) + 1);
  for (const o of objects) {
    const type = o.object_type as string;
    const id = o.id as string;
    if (NOT_NEEDED.has(type)) {
      count(notNeeded, type);
      continue;
    }
    if (!(type in KNOWN_FIELDS) && !READ_FROM_04E.has(type)) {
      throw unsupported("unknown_object_type", id, `${id} is a ${type}, which spillpoint doesn't read; it's refused rather than skipped`);
    }
    count(read, type);
    if (READ_FROM_04E.has(type)) later.add(type);
    // O2: amounts in US dollars only.
    const currency = foreignCurrency(o);
    if (currency) throw unsupported("currency", id, `${id} has an amount in ${currency}; spillpoint reads US dollars only`);
    // O1: the cap table is as of the package's date, so nothing read may come after it.
    if (type.startsWith("TX_") && date(o, "date", id) > asOf) {
      throw malformed("after_as_of", id, `${id} is dated ${o.date as string}, after the package's date, ${asOf}`);
    }
    for (const field of Object.keys(o)) if (KNOWN_FIELDS[type] && !KNOWN_FIELDS[type].includes(field)) notes.add("unrecognized_field", id, field);
  }
  const ofType = (type: string) => objects.filter((o) => o.object_type === type);

  // ---------- stakeholders (O3), classes (O4), the share ledger (O5) ----------
  const stakeholders = ofType("STAKEHOLDER").map((o) => {
    const id = o.id as string;
    const name = isObject(o.name) ? o.name.legal_name : undefined;
    if (typeof name !== "string" || name === "") throw malformed("missing_field", id, `${id} has no legal name, which OCF requires`);
    return { id, name };
  });
  const classes = readStockClasses(ofType("STOCK_CLASS"), notes);
  const entries: LedgerEntry[] = objects.flatMap((tx, order) => (LEDGER_TYPES.includes(tx.object_type as string) ? [{ tx, order }] : []));
  const stock = runShareLedger(entries, classes, new Set(stakeholders.map((s) => s.id)), notes, (what) => later.add(what));

  if (later.size > 0) {
    // Temporary, until 04e reads them: refused after everything else, so a package's own problems are found first.
    const what = [...later].sort().join(", ");
    throw unsupported("not_yet_read", what, `The package has ${what}, which spillpoint reads from 04e`);
  }

  // ---------- the cap table ----------
  // O4: a preferred class with nothing outstanding is left out; every common class stays.
  const kept = [...classes.values()].filter((c) => c.common || [...stock.values()].some((byClass) => byClass.has(c.id)));
  for (const c of classes.values()) if (!kept.includes(c)) notes.add("left_out_stock_class", c.id);
  const holders = stakeholders.filter((s) => stock.has(s.id));
  for (const s of stakeholders) if (!stock.has(s.id)) notes.add("left_out_stakeholder", s.id);

  const securities = kept.map(securityOf);
  const positions = holders.flatMap((h) =>
    kept.flatMap((c) => {
      const shares = stock.get(h.id)?.get(c.id);
      return shares ? [{ holder: h.id, security: c.id, shares: wholeNumber(shares, h.id) }] : [];
    }),
  );
  // O4: a higher seniority ranks ahead; equal seniority shares a tier, pari passu.
  const preferred = kept.filter((c) => !c.common);
  const levels = [...new Set(preferred.map((c) => c.seniority.toString()))].sort((a, b) => new D(b).cmp(new D(a)));
  const seniority = levels.map((level) => preferred.filter((c) => c.seniority.eq(level)).map((c) => c.id));

  // O11: terms OCF has no field for, one line each.
  for (const code of ["no_dividend_field", "no_conversion_group_field", "no_carve_out_field", "no_sale_date_field"]) notes.add(code);

  const toFill: OcfToFill[] = securities.flatMap((s) =>
    Object.entries(s)
      // A series that isn't capped has no cap multiple: that blank isn't a term to fill in.
      .filter(([field, value]) => value === null && field !== "cap_multiple")
      .map(([field]) => ({ security: s.id as string, field })),
  );

  return {
    as_of: asOf,
    cap_table: { holders, securities, seniority, conversion_groups: [], positions, unissued_pool: 0 },
    to_fill: toFill,
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
