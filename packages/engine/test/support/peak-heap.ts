// Timing a piece of work, with the most heap it held at once (10j). The heap is collected first, and the peak is the
// largest heap in use before any garbage collection while it ran, or at its end, less what was in use before it: so
// rows run one after another each count their own. Like a process's own memory, it counts garbage not yet collected,
// so it varies a little from run to run and with the heap's limit: a figure to print beside a time, never a check.

import { GCProfiler, setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";

// A collection on demand, as test runners' leak checks get one: the flag, then a fresh context that has `gc`.
setFlagsFromString("--expose-gc");
const collect = runInNewContext("gc") as () => void;

export interface Measured<T> {
  value: T;
  seconds: number;
  /** In MB of 2²⁰ bytes. */
  peakHeap: number;
}

export function measured<T>(work: () => T): Measured<T> {
  collect();
  const before = process.memoryUsage().heapUsed;
  const profiler = new GCProfiler();
  profiler.start();
  const start = performance.now();
  const value = work();
  const seconds = (performance.now() - start) / 1000;
  let peak = process.memoryUsage().heapUsed;
  // Node gives each collection's heap in camelCase, though its types name the fields as getHeapStatistics does.
  for (const gc of profiler.stop()?.statistics ?? []) peak = Math.max(peak, (gc.beforeGC.heapStatistics as unknown as { usedHeapSize: number }).usedHeapSize);
  return { value, seconds, peakHeap: Math.max(0, Math.round((peak - before) / 2 ** 20)) };
}
