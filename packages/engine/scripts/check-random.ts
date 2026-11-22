// Compares the engine with the reference on the random tables reference/tools/random_safes.py writes (05c4): every
// breakpoint within a cent, with the same reason codes, subjects and jump flags, and every payout point's decisions
// and holder × security lines to the cent, as the case tests compare the locked cases. A dev tool.
//
//   python3 reference/tools/random_safes.py 40 1 local/random-safes
//   pnpm check-random local/random-safes
//   python3 reference/tools/random_safes.py probe local/random-safes
//   pnpm check-random local/random-safes
//
// Where the reference's breakpoint search couldn't finish a table, its payouts at the listed exit values are compared,
// and the engine's breakpoints are checked by the reference's payouts a cent either side of each: the first run writes
// those exit values, `probe` works them out, and the second run compares them.
//
// Where the reference stops with more than one stable answer (05c5), the engine must stop too, with the same message
// apart from where: each says where it first saw the second answer. The engine's search says where it begins, so the
// reference is asked about a cent either side of that: below, the payouts are compared; above, it must stop too.
//
// Where the reference's breakpoints disagree with the engine's at a grid coarser than $100,000, the first run asks for
// the table again at $100,000 (retry.json), random_many_safes.py's `probe` works it into the table's fine/ folder, and
// the second run compares that in full instead. The reference's grid can miss a stretch narrower than it, with the same
// answer at the grid points either side, as it missed many-11-0125's $83,403 at $500,000 (10k). A table that agrees
// that way is reported as agreeing only at the finer grid.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { D, findBreakpoints, parseExact, prepare, readExit, solve } from "../src/index.ts";
import type { Breakpoint } from "../src/index.ts";

type Json = Record<string, unknown>;
interface Reason {
  code: string;
  security?: string;
  securities?: string[];
}
interface Expected {
  exit: {
    breakpoints: { exit_value: string; exact: string; payouts_jump?: boolean; reasons: Reason[] }[];
    payouts: {
      exit_value: string;
      tags: string[];
      equilibria: { decisions: Record<string, string>; lines: { holder: string; security: string; amount: string }[] }[];
    }[];
  };
}

const CENT = new D("0.01");
/** The grid a table is worked again at where the reference's breakpoints disagree at its own (10k). */
const FINER_GRID = new D("100000");
/** The reference's grid where a table gives none (reference/spillpoint_ref/case.py). */
const REFERENCE_GRID = new D("250000");
const directory = process.argv[2] ?? "local/random-safes";
let compared = 0;
let byPoints = 0;
let probed = 0;
let waiting = 0;
/** Tables where the reference stops with more than one stable answer (05c5), and the engine's search stops too. */
let bothStop = 0;
/** Of those, the ones where the reference agrees, a cent either side, where the engine says the second answer begins. */
let bothStopProbed = 0;
const problems: string[] = [];
/** Tables where the reference finds two stable answers at some exit value it was asked about (E8). */
const twoAnswers = new Set<string>();
/** Tables that agree in full only at the finer grid, each with what differed at its own. */
const finerOnly: string[] = [];

interface Point {
  exit_value: string;
  equilibria: Expected["exit"]["payouts"][number]["equilibria"];
  /** The reference's stop where more than one answer is stable (probes only). */
  stops?: string;
}

/** A two-answer stop's "At $X: " (05c5): the exit value, and the rest of the message. */
function stopAt(message: string): { at: D; rest: string } | undefined {
  const m = /^At \$([\d,]+(?:\.\d+)?): ([^]*)$/.exec(message.trim());
  return m ? { at: new D(m[1]!.replaceAll(",", "")), rest: m[2]! } : undefined;
}

/** The reference's decisions in the engine's form: what converts and what is exercised. */
function decisionsFrom(recorded: Record<string, string>): string {
  const converted: string[] = [];
  const exercised: string[] = [];
  for (const [player, decision] of Object.entries(recorded)) {
    if (decision === "converts" || decision === "conversion_amount") converted.push(...player.split("+"));
    else if (decision === "exercised") exercised.push(player);
  }
  return `${converted.sort().join(",")} | ${exercised.sort().join(",")}`;
}

/** The engine's answers at x against the reference's, decisions and lines to the cent. */
function comparePoint(name: string, pc: ReturnType<typeof prepare>, x: D, label: string, equilibria: Point["equilibria"], sink = problems): void {
  const problem = (what: string) => sink.push(`${name}: ${what}`);
  const { answers } = solve(pc, x);
  if (answers.length !== equilibria.length) {
    problem(`at ${label} ${answers.length} answers, the reference ${equilibria.length}`);
    return;
  }
  answers.forEach((a, i) => {
    const theirs = equilibria[i]!;
    const mine = `${[...a.decisions.converted].sort().join(",")} | ${[...a.decisions.exercised].sort().join(",")}`;
    if (mine !== decisionsFrom(theirs.decisions)) problem(`at ${label} decisions ${mine}, the reference ${decisionsFrom(theirs.decisions)}`);
    a.payout.lines.forEach((l, j) => {
      const t = theirs.lines[j]!;
      if (l.holder !== t.holder || l.security !== t.security || l.amount.minus(t.amount).abs().gt(CENT)) {
        problem(`at ${label} ${l.holder} × ${l.security} ${l.amount.toFixed(2)}, the reference ${t.amount}`);
      }
    });
  });
}

/**
 * The engine against one of the reference's answers in full: every breakpoint within a cent, with the same reason
 * codes, subjects and jump flags, and every payout point. What differs in the breakpoints is kept apart from what
 * differs in the payouts, since only the first can come from the reference's grid.
 */
function compareInFull(name: string, pc: ReturnType<typeof prepare>, found: Breakpoint[], expected: Expected["exit"]): { breakpoints: string[]; points: string[] } {
  const breakpoints: string[] = [];
  const points: string[] = [];
  const problem = (what: string) => breakpoints.push(`${name}: ${what}`);
  if (found.length !== expected.breakpoints.length) problem(`${found.length} breakpoints, the reference ${expected.breakpoints.length}`);
  expected.breakpoints.forEach((b, i) => {
    const f = found[i];
    if (!f) return;
    if (f.exitValue.minus(parseExact(b.exact, "exact")).abs().gt(CENT)) problem(`breakpoint ${f.exitValue.toFixed(2)}, the reference ${b.exit_value}`);
    if (f.jumps !== (b.payouts_jump ?? false)) problem(`at ${b.exit_value} the jump flag differs`);
    const mine = f.reasons.map((r) => `${r.code}: ${[...r.subject].sort().join("+")}`).sort();
    const theirs = b.reasons.map((r) => `${r.code}: ${(r.securities ?? (r.security ? r.security.split("+") : [])).slice().sort().join("+")}`).sort();
    if (JSON.stringify(mine) !== JSON.stringify(theirs)) problem(`at ${b.exit_value} the reasons differ: ${mine.join("; ")} | ${theirs.join("; ")}`);
  });
  const exact = new Map(expected.breakpoints.map((b) => [b.exit_value, b.exact]));
  for (const point of expected.payouts) {
    const x = parseExact(point.tags.includes("breakpoint") ? exact.get(point.exit_value) : point.exit_value, point.exit_value);
    comparePoint(name, pc, x, point.exit_value, point.equilibria, points);
  }
  return { breakpoints, points };
}

/** "$100,000": a grid step in whole dollars. */
function dollars(x: D): string {
  return `$${Number(x.toFixed(0)).toLocaleString("en-US")}`;
}

for (const name of readdirSync(directory).sort()) {
  const folder = join(directory, name);
  const file = (f: string) => join(folder, f);
  if (!existsSync(file("inputs.json"))) continue;
  const inputs = JSON.parse(readFileSync(file("inputs.json"), "utf8")) as { exit: Json & { grid_step?: string } };
  const { grid_step: _, ...spec } = inputs.exit;
  const problem = (what: string) => problems.push(`${name}: ${what}`);
  try {
    const exit = readExit({ ...spec, exit_values: [] });
    const pc = prepare(exit.capTable, exit.exitDate);
    if (!existsSync(file("expected.json"))) {
      // The reference stops where more than one answer is stable (05c5): so must the engine, with its plain message.
      const refused = readFileSync(file("refused.txt"), "utf8").trim();
      if (refused.includes("spillpoint doesn't pick one")) {
        let stop = "";
        try {
          findBreakpoints(pc, exit.range);
          problem("the reference stops with more than one stable answer; the engine's search doesn't");
          continue;
        } catch (e) {
          stop = (e as Error).message;
        }
        const mine = stopAt(stop);
        const theirs = stopAt(refused);
        if (!mine?.rest.includes("spillpoint doesn't pick one") || !theirs) {
          problem(`the reference stops with more than one stable answer; the engine stops otherwise: ${stop}`);
          continue;
        }
        if (mine.rest !== theirs.rest) problem(`the engine stops with "${mine.rest}", the reference "${theirs.rest}"`);
        // The reference reads its own grid, so it can only see the second answer at or after where it begins.
        const at = `$${mine.at.toFixed(2)}`;
        if (mine.at.gt(theirs.at.plus(CENT))) problem(`the engine stops at ${at}, after the reference's $${theirs.at.toFixed(2)}`);
        bothStop++;
        if (existsSync(file("probed.json"))) {
          const before = problems.length;
          const [below, above] = JSON.parse(readFileSync(file("probed.json"), "utf8")) as Point[];
          if (below?.stops) problem(`a cent below ${at} the reference already stops`);
          else if (below) comparePoint(name, pc, parseExact(below.exit_value, "x"), below.exit_value, below.equilibria);
          const there = above?.stops ? stopAt(above.stops) : undefined;
          if (!there) problem(`a cent above ${at} the reference doesn't stop`);
          else if (there.rest !== mine.rest) problem(`a cent above ${at} the reference stops with "${there.rest}"`);
          if (problems.length === before) bothStopProbed++;
        } else {
          writeFileSync(file("probes.json"), `${JSON.stringify([mine.at.minus(CENT), mine.at.plus(CENT)].map(String), null, 2)}\n`);
          waiting++;
        }
        continue;
      }
      // The reference's search couldn't finish: its payouts at the listed exit values, and a cent either side of each
      // of the engine's breakpoints.
      if (!existsSync(file("points.json"))) continue;
      const points = JSON.parse(readFileSync(file("points.json"), "utf8")) as Point[];
      for (const point of points) comparePoint(name, pc, parseExact(point.exit_value, "x"), point.exit_value, point.equilibria);
      if (points.some((pt) => pt.equilibria.length > 1)) twoAnswers.add(name);
      byPoints++;
      const found = findBreakpoints(pc, exit.range);
      const probes = found.flatMap((b) => [b.exitValue.minus(CENT), b.exitValue.plus(CENT)]).map((x) => x.toString());
      if (existsSync(file("probed.json"))) {
        for (const point of JSON.parse(readFileSync(file("probed.json"), "utf8")) as Point[]) {
          comparePoint(name, pc, parseExact(point.exit_value, "x"), point.exit_value, point.equilibria);
          if (point.equilibria.length > 1) twoAnswers.add(name);
        }
        probed++;
      } else {
        writeFileSync(file("probes.json"), `${JSON.stringify(probes, null, 2)}\n`);
        waiting++;
      }
      continue;
    }
    const expected = (JSON.parse(readFileSync(file("expected.json"), "utf8")) as Expected).exit;
    const found = findBreakpoints(pc, exit.range);
    const own = compareInFull(name, pc, found, expected);
    const grid = new D(inputs.exit.grid_step ?? REFERENCE_GRID);
    if (own.breakpoints.length === 0 || grid.lte(FINER_GRID)) {
      problems.push(...own.breakpoints, ...own.points);
      compared++;
      continue;
    }
    // Its breakpoints disagree at a grid coarser than $100,000, which can miss a stretch narrower than it (10k): the
    // table is worked again at $100,000, and compared in full there.
    const fine = (f: string) => join(folder, "fine", f);
    const there = `at the ${dollars(FINER_GRID)} grid`;
    if (existsSync(fine("expected.json"))) {
      const again = compareInFull(name, pc, found, (JSON.parse(readFileSync(fine("expected.json"), "utf8")) as Expected).exit);
      const differ = [...again.breakpoints, ...again.points];
      if (differ.length === 0) finerOnly.push(`${name}: at its own ${dollars(grid)} grid, ${own.breakpoints[0]!.slice(name.length + 2)}; ${there}, it agrees in full`);
      else problems.push(...differ.map((p) => `${p} (${there})`));
      compared++;
    } else if (existsSync(fine("refused.txt"))) {
      problems.push(...own.breakpoints, `${name}: ${there} the reference stops: ${readFileSync(fine("refused.txt"), "utf8").trim()}`);
    } else {
      writeFileSync(file("retry.json"), `${JSON.stringify({ grid_step: FINER_GRID.toString(), why: own.breakpoints[0] }, null, 2)}\n`);
      waiting++;
    }
  } catch (e) {
    problem(`stops: ${(e as Error).message}`);
  }
}

console.log(`${compared} tables compared in full; ${byPoints} by their listed exit values, ${probed} of those a cent either side of each breakpoint too.`);
if (finerOnly.length > 0) {
  console.log(`${finerOnly.length} of those compared in full agree only at the ${dollars(FINER_GRID)} grid, where the reference worked them again:\n${finerOnly.join("\n")}`);
}
if (bothStop > 0) {
  console.log(
    `${bothStop} tables have more than one stable answer somewhere; the reference and the engine both stop on them, with the same message ` +
      `apart from where. On ${bothStopProbed}, the reference agrees a cent either side of where the engine says the second answer begins.`,
  );
}
if (twoAnswers.size > 0) console.log(`The reference finds two stable answers somewhere in ${twoAnswers.size}: ${[...twoAnswers].join(", ")}.`);
if (waiting > 0) {
  console.log(
    `${waiting} tables wait for the reference a cent either side of the engine's breakpoints, or of where the second answer begins, ` +
      `or at the ${dollars(FINER_GRID)} grid: run random_safes.py probe (or random_many_safes.py probe), then this again.`,
  );
}
console.log(problems.length === 0 ? "The engine agrees with the reference on every one." : problems.join("\n"));
process.exitCode = problems.length === 0 ? 0 : 1;
