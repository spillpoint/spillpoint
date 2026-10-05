// Works out the breakpoints and the curves off the page's main thread.

import { computeAnalysis } from "./analysis.ts";

self.onmessage = (e: MessageEvent<{ id: number; exit: unknown }>) => {
  try {
    self.postMessage({ id: e.data.id, ok: true, analysis: computeAnalysis(e.data.exit) });
  } catch (error) {
    self.postMessage({ id: e.data.id, ok: false, message: (error as Error).message });
  }
};
