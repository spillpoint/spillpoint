// Runs the breakpoint finder off the page's main thread.

import { computeBreakpoints } from "./breakpoints.ts";

self.onmessage = (e: MessageEvent<{ id: number; exit: unknown }>) => {
  try {
    self.postMessage({ id: e.data.id, ok: true, breakpoints: computeBreakpoints(e.data.exit) });
  } catch (error) {
    self.postMessage({ id: e.data.id, ok: false, message: (error as Error).message });
  }
};
