/// <reference types="vitest/config" />
// The dashboard's build. Three things matter here:
// - "spillpoint" resolves to the engine's sources, not its built dist/, so the
//   dashboard always runs the current engine with no build step (M3 plan).
// - The examples are read from the locked cases at build time and reduced to
//   the exit input each needs, so they can't drift from the tests and the
//   page doesn't ship whole expected.json files.
// - No network: the built page loads nothing from anywhere else.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const repo = resolve(import.meta.dirname, "../..");
const casesDir = resolve(repo, "cases");

/** The examples the picker offers (M3 plan, answer 2): Millrace, and one simple case. */
const EXAMPLES = [
  { id: "millrace", label: "Millrace Robotics", defaultExitValue: "100000000" },
  { id: "edge-04-participating-capped", label: "Simple example: one series, capped participation", defaultExitValue: "40000000" },
];

function examples(): Plugin {
  const id = "virtual:examples";
  return {
    name: "spillpoint-examples",
    resolveId: (source) => (source === id ? `\0${id}` : null),
    load(loadId) {
      if (loadId !== `\0${id}`) return null;
      const out = EXAMPLES.map((e) => {
        const inputsPath = resolve(casesDir, e.id, "inputs.json");
        const expectedPath = resolve(casesDir, e.id, "expected.json");
        this.addWatchFile(inputsPath);
        this.addWatchFile(expectedPath);
        const inputs = JSON.parse(readFileSync(inputsPath, "utf8"));
        const exit = { ...inputs.exit };
        // C2: Millrace's exit runs on the post-Series B cap table recorded in expected.json.
        if (exit.cap_table_after_event) {
          const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
          const after = expected.cap_tables.find((t: { after_event: string }) => t.after_event === exit.cap_table_after_event);
          const { totals: _totals, ...capTable } = after.cap_table;
          exit.cap_table = capTable;
          delete exit.cap_table_after_event;
        }
        return { id: e.id, label: e.label, fictional: true, defaultExitValue: e.defaultExitValue, exit };
      });
      return `export default ${JSON.stringify(out)};`;
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), examples()],
  resolve: {
    alias: { spillpoint: resolve(repo, "packages/engine/src/index.ts") },
  },
  worker: { format: "es" },
  // Vite's module-preload helper calls fetch() on the page's own files.
  // Modern browsers don't need it, and a page that makes no network requests
  // shouldn't contain one.
  build: { modulePreload: { polyfill: false } },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
  },
});
