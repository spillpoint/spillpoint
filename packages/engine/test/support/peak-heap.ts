// Timing a piece of work, with the most heap it held at once (10j): the largest heap in use before any garbage
// collection while it ran, or at its end. Like a process's own memory, it counts garbage not yet collected, so it
// varies a little from run to run and with the heap's limit: a figure to print beside a time, never a check.

import { GCProfiler } from "node:v8";

export interface Measured<T> {
  value: T;
  seconds: number;
  /** In MB of 2²⁰ bytes. */
  peakHeap: number;
}

export function measured<T>(work: () => T): Measured<T> {
  const profiler = new GCProfiler();
  profiler.start();
  const start = performance.now();
  const value = work();
  const seconds = (performance.now() - start) / 1000;
  let peak = process.memoryUsage().heapUsed;
  // Node gives each collection's heap in camelCase, though its types name the fields as getHeapStatistics does.
  for (const gc of profiler.stop()?.statistics ?? []) peak = Math.max(peak, (gc.beforeGC.heapStatistics as unknown as { usedHeapSize: number }).usedHeapSize);
  return { value, seconds, peakHeap: Math.round(peak / 2 ** 20) };
}
