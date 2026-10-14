// The names and words code can match on, stable from 0.1.0, are each in docs/STABLE.md. The engine gives them only
// through stable-names.ts: its lists' types are what every refusal and reason takes, so the compiler refuses a name
// not on a list, and its wordings are the only place a reason's words are written. A list matching STABLE.md's then
// means STABLE.md has every name and wording the engine can give.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { FundRefusal, findBreakpoints, readFund } from "../src/index.ts";
import type { Reason } from "../src/index.ts";
import { CHANGE_WORDS, CLAWBACK_CHANGES, INPUT_TERMS, REASON_CODES, TIER_REASON_CODES, TOTALS_WORDINGS, UNSUPPORTED_TERMS, WORDINGS } from "../src/stable-names.ts";
import { CASES_DIR, REFUSAL_CASES, RUN_CASES, applyChange, readCaseFile } from "./support/cases.ts";
import type { CaseInputs } from "./support/cases.ts";
import { randomFund, seeded } from "./support/random.ts";

const stable = readFileSync(resolve(import.meta.dirname, "../docs/STABLE.md"), "utf8");

/** The text under one heading of STABLE.md. */
function section(heading: string): string {
  const from = stable.indexOf(`\n## ${heading}\n`);
  expect(from, `STABLE.md has "${heading}"`).toBeGreaterThan(0);
  const to = stable.indexOf("\n## ", from + 1);
  return stable.slice(from, to < 0 ? undefined : to);
}

/** The names listed under a heading: each "- `name`" line. */
const listed = (heading: string) => [...section(heading).matchAll(/^- `([a-z_]+)`/gm)].map((m) => m[1]!);

describe("the README's \"Stable from 0.1.0\", which the package carries since STABLE.md doesn't go with it", () => {
  const readme = readFileSync(resolve(import.meta.dirname, "../README.md"), "utf8");
  const stableHalf = readme.slice(readme.indexOf("\n## Stable from 0.1.0\n"), readme.indexOf("\n## How it's tested\n"));
  /** The text under one "###" heading of that section. */
  const part = (heading: string) => {
    const from = stableHalf.indexOf(`\n### ${heading}\n`);
    expect(from, `the README has "${heading}"`).toBeGreaterThan(0);
    const to = stableHalf.indexOf("\n### ", from + 1);
    return stableHalf.slice(from, to < 0 ? undefined : to);
  };

  it.each([
    ["`FundRefusal`'s kinds", ["unsupported", "input"]],
    ["`FundRefusal`'s input terms", INPUT_TERMS],
    ["`FundRefusal`'s unsupported terms", UNSUPPORTED_TERMS],
    ["`ReasonCode`", REASON_CODES],
  ] as const)("lists %s exactly as the engine has them", (heading, names) => {
    expect([...part(heading).matchAll(/^- `([a-z_]+)`/gm)].map((m) => m[1]!)).toEqual([...names]);
  });

  it("names every ClawbackChange, in order", () => {
    expect([...part("`ClawbackChange`").matchAll(/`([a-z_]+)`/g)].map((m) => m[1]!).filter((n) => n !== "ClawbackChange")).toEqual([...CLAWBACK_CHANGES]);
  });

  it("gives every wording the engine writes, and no other", () => {
    const quoted = new Set([...part("The wordings").matchAll(/"([^"]+)"/g)].map((m) => m[1]!));
    const examples = ["$10,890,000", "$4,004,383.56", "8%", "7.5%", "3.0x", "2.25x"];
    const engine = new Set([
      WORDINGS.capital_returned("{amount}"),
      WORDINGS.pref_met("{rate}", "{amount}"),
      WORDINGS.catch_up_done("{carry}"),
      WORDINGS.carry_step("{multiple}", "{rate}"),
      WORDINGS.clawback_cleared(),
      WORDINGS.clawback_starts(),
      WORDINGS.clawback_changes("{change}"),
      WORDINGS.clawback_changes_on_totals("{change}", "{tier}"),
      ...CLAWBACK_CHANGES.map((c) => CHANGE_WORDS[c]),
      TOTALS_WORDINGS.capital_returned(),
      TOTALS_WORDINGS.pref_met(),
      TOTALS_WORDINGS.catch_up_done("{carry}"),
      TOTALS_WORDINGS.carry_step("{multiple}", "{rate}"),
    ]);
    expect([...quoted].filter((q) => !examples.includes(q)).sort()).toEqual([...engine].sort());
  });
});

describe("STABLE.md", () => {
  it.each([
    ["`FundRefusal`'s kinds", ["unsupported", "input"]],
    ["`FundRefusal`'s input terms", INPUT_TERMS],
    ["`FundRefusal`'s unsupported terms", UNSUPPORTED_TERMS],
    ["`ReasonCode`", REASON_CODES],
    ["`ClawbackChange`", CLAWBACK_CHANGES],
  ] as const)("lists %s exactly as the engine has them", (heading, names) => {
    expect(listed(heading)).toEqual([...names]);
  });

  it("gives FC6's wordings exactly as the engine writes them, blanks and all", () => {
    const quoted = [...section("The wordings").matchAll(/^- `[a-z_]+`[^"]*: "([^"]+)"$/gm)].map((m) => m[1]!);
    expect(quoted).toEqual([
      WORDINGS.capital_returned("{amount}"),
      WORDINGS.pref_met("{rate}", "{amount}"),
      WORDINGS.catch_up_done("{carry}"),
      WORDINGS.carry_step("{multiple}", "{rate}"),
      WORDINGS.clawback_cleared(),
      WORDINGS.clawback_starts(),
      WORDINGS.clawback_changes("{change}"),
      WORDINGS.clawback_changes_on_totals("{change}", "{tier}"),
      ...CLAWBACK_CHANGES.map((c) => CHANGE_WORDS[c]),
      TOTALS_WORDINGS.capital_returned(),
      TOTALS_WORDINGS.pref_met(),
      TOTALS_WORDINGS.catch_up_done("{carry}"),
      TOTALS_WORDINGS.carry_step("{multiple}", "{rate}"),
    ]);
  });
});

describe("the engine gives only what STABLE.md lists", () => {
  const src = resolve(import.meta.dirname, "../src");
  const files = readdirSync(src).filter((f) => f.endsWith(".ts"));
  /** A file's code, its comments taken out, so only what it writes is searched. */
  const code = (f: string) => readFileSync(join(src, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const where = (pattern: RegExp) => files.filter((f) => pattern.test(code(f))).sort();

  it("refuses only through errors.ts's helpers, which take a listed term or the key itself", () => {
    expect(where(/new FundRefusal\(/)).toEqual(["errors.ts"]);
  });

  it("writes a reason's words only in stable-names.ts", () => {
    const phrases = /paid-in capital back|of the profit|carry is|from here the GP|the clawback owed|on the fund's totals|LPs have their|starts to fall|stops falling|falls faster|falls more slowly/;
    expect(where(phrases)).toEqual(["stable-names.ts"]);
  });

  // A reason's text, matched against every wording with its blanks filled as FC6 writes them.
  const amount = String.raw`\$\d{1,3}(?:,\d{3})*(?:\.\d\d)?`;
  const rate = String.raw`[\d./]+%`;
  const multiple = String.raw`[\d./]+x`;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fill = (template: string) =>
    escape(template)
      .replace(/\\\{amount\\\}/g, amount)
      .replace(/\\\{(rate|carry)\\\}/g, rate)
      .replace(/\\\{multiple\\\}/g, multiple);
  const change = `(?:${CLAWBACK_CHANGES.map((c) => escape(CHANGE_WORDS[c])).join("|")})`;
  const tier = `(?:${[TOTALS_WORDINGS.capital_returned(), TOTALS_WORDINGS.pref_met(), TOTALS_WORDINGS.catch_up_done("{carry}"), TOTALS_WORDINGS.carry_step("{multiple}", "{rate}")].map(fill).join("|")})`;
  const TEXT: Record<Reason["code"], RegExp[]> = {
    capital_returned: [new RegExp(`^${fill(WORDINGS.capital_returned("{amount}"))}$`)],
    pref_met: [new RegExp(`^${fill(WORDINGS.pref_met("{rate}", "{amount}"))}$`)],
    catch_up_done: [new RegExp(`^${fill(WORDINGS.catch_up_done("{carry}"))}$`)],
    carry_step: [new RegExp(`^${fill(WORDINGS.carry_step("{multiple}", "{rate}"))}$`)],
    clawback_cleared: [new RegExp(`^${escape(WORDINGS.clawback_cleared())}$`)],
    clawback_starts: [new RegExp(`^${escape(WORDINGS.clawback_starts())}$`)],
    clawback_changes: [
      new RegExp(`^${escape(WORDINGS.clawback_changes("{change}")).replace("\\{change\\}", change)}$`),
      new RegExp(`^${escape(WORDINGS.clawback_changes_on_totals("{change}", "{tier}")).replace("\\{change\\}", change).replace("\\{tier\\}", tier)}$`),
    ],
  };

  const checkReason = (r: Reason) => {
    expect(REASON_CODES).toContain(r.code);
    expect(TEXT[r.code].some((re) => re.test(r.text)), r.text).toBe(true);
    if (r.code === "clawback_changes") {
      expect(CLAWBACK_CHANGES).toContain(r.change);
      if (r.fundTotals !== null) expect(TIER_REASON_CODES).toContain(r.fundTotals);
      // The cause is named in the words exactly when fundTotals says so.
      expect(r.text.includes("on the fund's totals")).toBe(r.fundTotals !== null);
    }
  };

  it("gives only listed codes, changes and wordings at every breakpoint of every case", () => {
    for (const dir of RUN_CASES) {
      const fund = readFund(readCaseFile<CaseInputs>(dir, "inputs.json").fund);
      for (const b of findBreakpoints(fund)) b.reasons.forEach(checkReason);
    }
  });

  it("gives only listed codes, changes and wordings on 300 random funds", () => {
    const rand = seeded(20261013);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      for (const b of findBreakpoints(readFund(randomFund(rand)))) {
        for (const r of b.reasons) {
          checkReason(r);
          seen.add(r.code === "clawback_changes" ? `${r.change}${r.fundTotals ? `, ${r.fundTotals}` : ""}` : r.code);
        }
      }
    }
    // The funds reach far enough to mean something: every tier reason, and the clawback falling in each way.
    for (const code of [...TIER_REASON_CODES, "clawback_cleared", "starts_to_fall", "stops_falling", "falls_more_slowly"]) {
      expect([...seen].some((s) => s.startsWith(code)), code).toBe(true);
    }
  });

  it("refuses every fixture with a listed term, or an unsupported key named by itself", () => {
    for (const dir of REFUSAL_CASES) {
      for (const file of readdirSync(join(CASES_DIR, dir, "fixtures"))) {
        const fixture = readCaseFile<{ base: string; change: { set?: Record<string, unknown>; del?: string } }>(dir, "fixtures", file);
        const base = readCaseFile<CaseInputs>(fixture.base, "inputs.json").fund;
        let refusal: FundRefusal | null = null;
        try {
          readFund(applyChange(base, fixture.change));
        } catch (e) {
          refusal = e as FundRefusal;
        }
        expect(refusal).toBeInstanceOf(FundRefusal);
        const { kind, term, path } = refusal!;
        if (kind === "input") expect(INPUT_TERMS).toContain(term);
        else expect((UNSUPPORTED_TERMS as readonly string[]).includes(term) || path.endsWith(`.${term}`), `${term} at ${path}`).toBe(true);
      }
    }
  });
});
