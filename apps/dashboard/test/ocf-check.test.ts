// The check scripts/ocf-check.mjs prints (0.5.0, 05a; O15): counts and codes, then the engine's runs over the blanks'
// answers. Pinned on our own OCF cases, and checked for leaks on every one of them: no name, id, amount or date from
// the files may appear in what it prints.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { ISSUE_PRICE, PLACEHOLDER, answerSets, checkExport } from "../src/ocfCheck.ts";
import type { Picked } from "../src/ocfImport.ts";

const cases = resolve(import.meta.dirname, "../../../cases");
const filesIn = (dir: string): Picked[] => readdirSync(dir).sort().map((name) => ({ name, bytes: new Uint8Array(readFileSync(resolve(dir, name))) }));
const packageOf = (name: string) => filesIn(resolve(cases, name, "package"));
/** A fixture added to its base package, as case 02, 03 and 04 run them (C16); a manifest fixture replaces the base's. */
function withFixture(caseName: string, fixture: string): Picked[] {
  const base = (JSON.parse(readFileSync(resolve(cases, caseName, "expected.json"), "utf8")) as { base: string }).base;
  const added = { name: fixture, bytes: new Uint8Array(readFileSync(resolve(cases, caseName, "fixtures", fixture))) };
  const manifest = (p: Picked) => new TextDecoder().decode(p.bytes).includes('"OCF_MANIFEST_FILE"');
  return [...packageOf(base).filter((p) => !(manifest(added) && manifest(p))), added];
}
/**
 * A package of our own with a preferred class that has no conversion right, priced at $1.37: its conversion price is a
 * blank whose placeholder is that issue price, an amount from the export, which a set line must never print (#64).
 */
function noConversionRight(): Picked[] {
  const usd = (amount: string) => ({ amount, currency: "USD" });
  const json = (name: string, content: unknown): Picked => ({ name, bytes: new TextEncoder().encode(JSON.stringify(content)) });
  return [
    json("Manifest.ocf.json", {
      file_type: "OCF_MANIFEST_FILE", ocf_version: "1.2.0", as_of: "2025-12-31", issuer: { object_type: "ISSUER", id: "issuer-q", legal_name: "Quietwater Tools, Inc." },
      stakeholders_files: [{ filepath: "Stakeholders.ocf.json" }], stock_classes_files: [{ filepath: "StockClasses.ocf.json" }], transactions_files: [{ filepath: "Transactions.ocf.json" }],
    }),
    json("Stakeholders.ocf.json", {
      file_type: "OCF_STAKEHOLDERS_FILE",
      items: [
        { object_type: "STAKEHOLDER", id: "sh-maple", name: { legal_name: "Maple Okafor" }, stakeholder_type: "INDIVIDUAL" },
        { object_type: "STAKEHOLDER", id: "sh-heron", name: { legal_name: "Heron Bay Partners" }, stakeholder_type: "INSTITUTION" },
      ],
    }),
    json("StockClasses.ocf.json", {
      file_type: "OCF_STOCK_CLASSES_FILE",
      items: [
        { object_type: "STOCK_CLASS", id: "cls-c", name: "Common Stock", class_type: "COMMON", seniority: "1" },
        { object_type: "STOCK_CLASS", id: "cls-p", name: "Series Seed Preferred", class_type: "PREFERRED", seniority: "2", price_per_share: usd("1.37"), liquidation_preference_multiple: "1", participation_cap_multiple: "1" },
      ],
    }),
    json("Transactions.ocf.json", {
      file_type: "OCF_TRANSACTIONS_FILE",
      items: [
        { object_type: "TX_STOCK_ISSUANCE", id: "tx-q1", date: "2021-04-01", security_id: "s-q1", stakeholder_id: "sh-maple", stock_class_id: "cls-c", share_price: usd("0.0001"), quantity: "7300000" },
        { object_type: "TX_STOCK_ISSUANCE", id: "tx-q2", date: "2023-08-15", security_id: "s-q2", stakeholder_id: "sh-heron", stock_class_id: "cls-p", share_price: usd("1.37"), quantity: "1460000" },
      ],
    }),
  ];
}

const check = async (picked: Picked[]) => (await checkExport(picked, "0.4.0")).filter((line) => !line.startsWith("Objects: "));

describe("what it prints", () => {
  it("Larkspur: read, its blanks tried, and stopped at a sale by its SAFEs beside a note", async () => {
    expect(await check(packageOf("ocf-01-larkspur"))).toEqual([
      "spillpoint 0.4.0: an OCF import, in counts and codes",
      "OCF version: 1.2.0",
      "Files: 8 JSON, 40,085 bytes; 0 not JSON",
      "Import: read",
      "Notes: common_preference_ignored 1, conversion_rounding_not_modeled 2, convertible_seniority_ignored 1, expired_option_left_out 1, " +
        "issued_at_other_price 1, left_out_stakeholder 2, no_anti_dilution_field 2, no_carve_out_field 1, no_conversion_group_field 1, " +
        "no_dividend_field 1, no_sale_date_field 1, note_cap_read_as_pre_money 1, participation_cap_includes_preference 1, rsu_as_option 1, " +
        "safe_exit_multiple_read_as_1 2, unrecognized_field 1",
      "Unrecognized fields: board_seat 1",
      "Blanks: participation 1, repayment_multiple 1",
      "Answer sets: 2 tried, of 2 possible",
      "set 1: #1 participation=non_participating, #2 repayment_multiple=placeholder: note_with_safe_or_carve_out",
      "set 2: #1 participation=participating, #2 repayment_multiple=placeholder: note_with_safe_or_carve_out",
    ]);
  });

  it("Millrace: read either way Series B participates", async () => {
    expect((await check(packageOf("ocf-11-millrace"))).slice(-3)).toEqual([
      "Answer sets: 2 tried, of 2 possible",
      "set 1: #1 participation=non_participating: reads",
      "set 2: #1 participation=participating: reads",
    ]);
  });

  it("Quillfern, from a zip: nothing to fill in, and the engine reads it", async () => {
    const zip = resolve(import.meta.dirname, "fixtures/quillfern-macos.zip");
    expect((await check([{ name: "quillfern-macos.zip", bytes: new Uint8Array(readFileSync(zip)) }])).slice(-2)).toEqual([
      "Blanks: none",
      "The engine, with nothing to fill in: reads",
    ]);
  });

  it("a refusal: its kind and term, and for a term that says little, the value behind it, never its subject", async () => {
    const last = async (fixture: string) => (await check(withFixture("ocf-03-refused", fixture))).at(-1);
    expect(await last("unknown-object-type.ocf.json")).toBe("Import: refused, unsupported unknown_object_type (TX_STOCK_GIFT)");
    expect(await last("currency.ocf.json")).toBe("Import: refused, unsupported currency (CAD)");
    expect(await last("version-2.ocf.json")).toBe("Import: refused, unsupported ocf_version (2.0.0)");
    expect(await last("quantities-dont-reconcile.ocf.json")).toBe("Import: refused, malformed quantities_dont_reconcile");
  });
});

describe("a placeholder is printed as a word, never its value (#64)", () => {
  it("a conversion price with no conversion right: the class's issue price is used, and printed as the words", async () => {
    expect((await check(noConversionRight())).slice(-3)).toEqual([
      "Blanks: conversion_price 1",
      "Answer sets: 1 tried, of 1 possible",
      `set 1: #1 conversion_price=${ISSUE_PRICE}: reads`,
    ]);
  });
});

describe("the sets of answers it tries (O15)", () => {
  it("tries every set up to 64", () => {
    const { sets, possible } = answerSets([["a", "b"], ["1"], ["x", "y", "z"]]);
    expect(possible).toBe(6);
    expect(sets).toEqual([["a", "1", "x"], ["a", "1", "y"], ["a", "1", "z"], ["b", "1", "x"], ["b", "1", "y"], ["b", "1", "z"]]);
  });

  it("past 64, the first answers, then one blank at a time", () => {
    const { sets, possible } = answerSets(Array.from({ length: 7 }, () => ["first", "second"]));
    expect(possible).toBe(128);
    expect(sets).toHaveLength(8);
    expect(sets[0]).toEqual(Array(7).fill("first"));
    expect(sets[3]).toEqual(["first", "first", "second", "first", "first", "first", "first"]);
  });
});

/** Every name, id, amount and date in a package's files: none may appear in what the check prints. */
function secrets(picked: Picked[]): { words: Set<string>; phrases: Set<string> } {
  const words = new Set<string>();
  const phrases = new Set<string>();
  const visit = (value: unknown, key: string) => {
    if (Array.isArray(value)) return value.forEach((v) => visit(v, key));
    if (value != null && typeof value === "object") return Object.entries(value).forEach(([k, v]) => visit(v, k));
    if (typeof value !== "string") return;
    if (["legal_name", "name", "plan_name", "reason_text", "trigger_condition", "consideration_text"].includes(key)) phrases.add(value);
    if (key.endsWith("id") || key.endsWith("_ids") || key === "amount" || key.endsWith("quantity") || key.endsWith("shares_reserved")) words.add(value);
  };
  for (const p of picked) {
    try {
      visit(JSON.parse(new TextDecoder().decode(p.bytes)), "");
    } catch {
      // Not JSON: nothing to look for.
    }
  }
  return { words, phrases };
}

describe("what it never prints", () => {
  const packages = readdirSync(cases).filter((c) => c.startsWith("ocf-") && readdirSync(resolve(cases, c)).includes("package"));
  const fixtureCases = readdirSync(cases).filter((c) => c.startsWith("ocf-") && readdirSync(resolve(cases, c)).includes("fixtures"));
  const runs: [string, Picked[]][] = [
    ...packages.map((c) => [c, packageOf(c)] as [string, Picked[]]),
    ...fixtureCases.flatMap((c) => readdirSync(resolve(cases, c, "fixtures")).map((f) => [`${c}/${f}`, withFixture(c, f)] as [string, Picked[]])),
    ["a preferred class with no conversion right, at $1.37", noConversionRight()],
  ];
  /** Every answer a set line may print: a choice's own code, or a placeholder's word. */
  const PRINTABLE = new Set(["non_participating", "participating", "participating_capped", "pre_money", "post_money", "with_pool", "without_pool", PLACEHOLDER, ISSUE_PRICE]);

  it.each(runs)("%s: no name, id, amount or date", async (_, picked) => {
    const printed = (await checkExport(picked, "0.4.0")).join("\n");
    const { words, phrases } = secrets(picked);
    expect(printed).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    for (const phrase of phrases) expect(printed.includes(phrase), phrase).toBe(false);
    // Words as printed, a grouped number ("40,085 bytes") kept whole. A whole number under 1,000 can't be told from the
    // counts the summary prints by design, so a quantity of 0 or 1 isn't looked for.
    const tokens = new Set(printed.split(/[^A-Za-z0-9_.,+-]+/).map((t) => t.replace(/[.,]+$/, "")));
    for (const word of words) if (!/^\d{1,3}$/.test(word)) expect(tokens.has(word), word).toBe(false);
    for (const [, answer] of printed.matchAll(/#\d+ [a-z_]+=([^,:]+)/g)) expect(PRINTABLE.has(answer!), answer).toBe(true);
  });
});
