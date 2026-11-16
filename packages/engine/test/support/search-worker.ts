// The breakpoint search on one made-up table, and the answer at each breakpoint, in a worker of its own (10j): the
// heap the row's peak is read from holds that row's work alone, and a test can give it a heap of a set size. The
// worker runs the engine's sources as Node loads them, not through the test runner.

import { getHeapStatistics } from "node:v8";
import { Worker, parentPort, workerData } from "node:worker_threads";

import { findBreakpoints, prepare, readExit, solve } from "../../src/index.ts";
import { manySafesAndStrikes, threeCapsTable } from "./many-safes.ts";
import { measured } from "./peak-heap.ts";

/** Which made-up table: Jordan's at three caps, or SAFEs at two caps beside option strikes. */
export type Table = { threeCaps: true } | { safes: number; strikes: number; amounts: "two" | "each its own" };

export interface Run {
  breakpoints: number;
  /** How many answers solve gives at each breakpoint. */
  answers: number[];
  seconds: number;
  /** In MB: the most heap the row held at once (peak-heap.ts). */
  peakHeap: number;
  /** In MB: the heap's limit in the worker. */
  heapLimit: number;
}

/** Run one table in a worker; with `oldSpace`, in a heap of that old space in MB. */
export function inWorker(table: Table, oldSpace?: number): Promise<Run> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: table, ...(oldSpace ? { resourceLimits: { maxOldGenerationSizeMb: oldSpace } } : {}) });
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => reject(new Error(`the worker stopped (${code}) before it finished`)));
  });
}

if (parentPort) {
  const table = workerData as Table;
  const exit = readExit("threeCaps" in table ? threeCapsTable() : manySafesAndStrikes(table.safes, table.strikes, table.amounts));
  const pc = prepare(exit.capTable, exit.exitDate);
  const { value, seconds, peakHeap } = measured(() => {
    const found = findBreakpoints(pc, exit.range);
    return { breakpoints: found.length, answers: found.map((b) => solve(pc, b.exitValue).answers.length) };
  });
  const run: Run = { ...value, seconds, peakHeap, heapLimit: Math.round(getHeapStatistics().heap_size_limit / 2 ** 20) };
  parentPort.postMessage(run);
}
