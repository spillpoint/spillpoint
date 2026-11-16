// Compares this engine with another copy of it, such as main's, on the random tables
// reference/tools/random_many_safes.py writes (10j). A dev tool. On each table, both find every breakpoint and the
// answer at each and at the listed exit values. They must agree as 10j's bar says (Jordan, 10j):
// - every reason, decision, jump, curve flag, breakpoint count and stop message the same, byte for byte;
// - every exit value and amount the same to the cent, and within $10⁻¹⁵ at full precision.
// Where a cent differs only because the value sits on a half cent, the value is listed rather than counted a failure.
//
//   python3 reference/tools/random_many_safes.py tables 1000 10 local/random-many-safes
//   git archive main packages/engine/src | tar -x -C local/main-engine
//   pnpm compare-engines local/main-engine/packages/engine/src local/random-many-safes
//
// Tables run in parallel, five at a time unless --workers says otherwise. The report goes to compare-engines.txt in
// the directory, with each engine's time and memory on each table. Memory is read from a heap collected just before:
// the most heap in use while it worked, garbage not yet collected included, and what it still held for the table once
// collected again after.

import { fork } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GCProfiler } from "node:v8";

import type { Decimal } from "decimal.js";

type Json = Record<string, unknown>;
type Engine = typeof import("../src/index.ts");

/** One engine's results on one table: text that must match byte for byte, and numbers that must match to the bar. */
interface Results {
  text: string[];
  numbers: Decimal[];
  seconds: number;
  /** In MB: the most heap it held at once, and what it still held for the table after. */
  peakHeap: number;
  heldAfter: number;
}

/** The workers run with --expose-gc, so each engine's memory is read from a collected heap. */
const collect = () => (globalThis as { gc?: () => void }).gc?.();
const MB = 2 ** 20;
/** The table being worked on, held while the heap is collected after, so what the engine keeps for it counts. */
let holding: unknown = null;

const TOLERANCE = "1e-15";

function run(engine: Engine, inputs: { exit: Json }): Results {
  const text: string[] = [];
  const numbers: Decimal[] = [];
  collect();
  const base = process.memoryUsage().heapUsed;
  const profiler = new GCProfiler();
  profiler.start();
  const start = performance.now();
  const memory = () => {
    let peak = process.memoryUsage().heapUsed;
    for (const gc of profiler.stop()?.statistics ?? []) peak = Math.max(peak, (gc.beforeGC.heapStatistics as unknown as { usedHeapSize: number }).usedHeapSize);
    collect();
    holding = null;
    return { peakHeap: Math.max(0, Math.round((peak - base) / MB)), heldAfter: Math.max(0, Math.round((process.memoryUsage().heapUsed - base) / MB)) };
  };
  const stopped = (where: string, e: unknown) => text.push(`${where} stops: ${(e as Error).constructor.name}: ${(e as Error).message}`);
  const { grid_step: _, ...spec } = inputs.exit;
  let exit: ReturnType<Engine["readExit"]>;
  let pc: ReturnType<Engine["prepare"]>;
  try {
    exit = engine.readExit(spec);
    pc = engine.prepare(exit.capTable, exit.exitDate);
  } catch (e) {
    stopped("reading", e);
    return { text, numbers, seconds: 0, ...memory() };
  }
  holding = pc;
  const answersAt = (x: Decimal, where: string) => {
    try {
      for (const a of engine.solve(pc, x).answers) {
        text.push(`${where} converted ${[...a.decisions.converted].sort().join(",")}; exercised ${[...a.decisions.exercised].sort().join(",")}`);
        numbers.push(a.payout.commonPrice);
        for (const l of a.payout.lines) {
          text.push(`${where} ${l.holder} × ${l.security}`);
          numbers.push(l.amount);
        }
      }
    } catch (e) {
      stopped(where, e);
    }
  };
  try {
    const found = engine.findBreakpoints(pc, exit.range);
    text.push(`${found.length} breakpoints`);
    found.forEach((b, i) => {
      text.push(`breakpoint ${i}: jumps ${b.jumps}, curve below ${b.curveBelow}, above ${b.curveAbove}; ${JSON.stringify(b.reasons)}`);
      numbers.push(b.exitValue);
      answersAt(b.exitValue, `at breakpoint ${i}`);
    });
  } catch (e) {
    stopped("the search", e);
  }
  for (const x of exit.exitValues) answersAt(x, `at ${x.toString()}`);
  const seconds = (performance.now() - start) / 1000;
  return { text, numbers, seconds, ...memory() };
}

/** Where two engines' results differ, as 10j's bar reads them; and the values on a half cent, listed apart. */
function compare(mine: Results, theirs: Results): { problems: string[]; halfCents: string[] } {
  const problems: string[] = [];
  const halfCents: string[] = [];
  if (mine.text.length !== theirs.text.length) problems.push(`${mine.text.length} results, the other ${theirs.text.length}`);
  mine.text.forEach((t, i) => {
    if (theirs.text[i] !== undefined && t !== theirs.text[i]) problems.push(`differs: ${t} | the other: ${theirs.text[i]}`);
  });
  if (mine.numbers.length !== theirs.numbers.length) problems.push(`${mine.numbers.length} numbers, the other ${theirs.numbers.length}`);
  mine.numbers.forEach((v, i) => {
    const w = theirs.numbers[i];
    if (!w) return;
    const close = v.minus(w).abs().lte(TOLERANCE);
    if (!close) problems.push(`number ${i}: ${v.toString()}, the other ${w.toString()}`);
    else if (v.toFixed(2) !== w.toFixed(2)) halfCents.push(`number ${i}: ${v.toString()}, the other ${w.toString()}`);
  });
  return { problems, halfCents };
}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const part = flag("--part");
const workers = Number(flag("--workers") ?? 5);
const [otherSrc, directory = "local/random-many-safes"] = args;
if (!otherSrc) throw new Error("usage: compare-engines.ts <other engine's src> [directory] [--workers N]");
const folders = readdirSync(directory, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (part !== undefined) {
  // A worker: every table whose index is its own, modulo the number of workers.
  const [i, n] = part.split("/").map(Number) as [number, number];
  const mine = (await import("../src/index.ts")) as Engine;
  const theirs = (await import(resolve(otherSrc, "index.ts"))) as Engine;
  for (const [k, name] of folders.entries()) {
    if (k % n !== i) continue;
    const inputs = JSON.parse(readFileSync(join(directory, name, "inputs.json"), "utf8")) as { exit: Json };
    const a = run(mine, inputs);
    const b = run(theirs, inputs);
    process.send!({
      name,
      ...compare(a, b),
      seconds: [a.seconds, b.seconds],
      peakHeap: [a.peakHeap, b.peakHeap],
      heldAfter: [a.heldAfter, b.heldAfter],
      results: a.text.length,
      breakpoints: a.text.find((t) => t.endsWith(" breakpoints")) ?? a.text[0],
    });
  }
  process.exit(0);
} else {
  const reports: {
    name: string;
    problems: string[];
    halfCents: string[];
    seconds: [number, number];
    peakHeap: [number, number];
    heldAfter: [number, number];
    results: number;
    breakpoints: string;
  }[] = [];
  await Promise.all(
    Array.from({ length: workers }, (_, i) =>
      new Promise<void>((done, fail) => {
        const child = fork(import.meta.filename, [otherSrc, directory, "--part", `${i}/${workers}`], { stdio: ["ignore", "inherit", "inherit", "ipc"], execArgv: [...process.execArgv, "--expose-gc"] });
        child.on("message", (m) => {
          const r = m as (typeof reports)[number];
          reports.push(r);
          if (reports.length % 50 === 0) console.log(`${reports.length} of ${folders.length} tables`);
        });
        child.on("exit", (code) => (code === 0 ? done() : fail(new Error(`worker ${i} stopped with ${code}`))));
      }),
    ),
  );
  reports.sort((x, y) => x.name.localeCompare(y.name));
  const failing = reports.filter((r) => r.problems.length > 0);
  const stops = reports.filter((r) => !r.breakpoints.endsWith(" breakpoints"));
  const total = (k: 0 | 1) => reports.reduce((s, r) => s + r.seconds[k], 0);
  const most = (pick: (r: (typeof reports)[number]) => number) => Math.max(0, ...reports.map(pick));
  const more = reports.filter((r) => r.peakHeap[0] > r.peakHeap[1]);
  const lines = [
    `${reports.length} tables. Agree: ${reports.length - failing.length}. Differ: ${failing.length}.`,
    `Stopped by both, with the same message: ${stops.length - stops.filter((r) => r.problems.length > 0).length}.`,
    `Values on a half cent: ${reports.reduce((s, r) => s + r.halfCents.length, 0)}.`,
    `Seconds in all: this engine ${total(0).toFixed(1)}, the other ${total(1).toFixed(1)}.`,
    `Peak heap at most: this engine ${most((r) => r.peakHeap[0])} MB, the other ${most((r) => r.peakHeap[1])} MB. Held after at most: this engine ${most((r) => r.heldAfter[0])} MB, the other ${most((r) => r.heldAfter[1])} MB.`,
    `Tables where this engine's peak heap was more than the other's: ${more.length}${more.length ? ` (${more.map((r) => `${r.name} ${r.peakHeap[0]} MB against ${r.peakHeap[1]}`).join("; ")})` : ""}.`,
    "",
    ...failing.flatMap((r) => [`${r.name}:`, ...r.problems.slice(0, 10).map((p) => `  ${p}`)]),
    ...reports.filter((r) => r.halfCents.length > 0).flatMap((r) => [`${r.name}, on a half cent:`, ...r.halfCents.map((p) => `  ${p}`)]),
    "",
    "table | results | this engine's search | seconds, this engine | seconds, the other | peak heap MB, this engine | the other | held after MB, this engine | the other",
    ...reports.map(
      (r) =>
        `${r.name} | ${r.results} | ${r.breakpoints} | ${r.seconds[0].toFixed(2)} | ${r.seconds[1].toFixed(2)} | ${r.peakHeap[0]} | ${r.peakHeap[1]} | ${r.heldAfter[0]} | ${r.heldAfter[1]}`,
    ),
  ];
  writeFileSync(join(directory, "compare-engines.txt"), `${lines.join("\n")}\n`);
  console.log(lines.slice(0, 6).join("\n"));
  process.exitCode = failing.length === 0 ? 0 : 1;
}
