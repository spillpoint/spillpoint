/// <reference types="vitest/config" />
// The dashboard's build. Four things matter here:
// - "spillpoint" resolves to the engine's sources, not its built dist/, so the
//   dashboard always runs the current engine with no build step (M3 plan).
// - The examples are read from the locked cases at build time and reduced to
//   the exit input each needs, so they can't drift from the tests and the
//   page doesn't ship whole expected.json files.
// - No network: the built page loads nothing from anywhere else.
// - A Content-Security-Policy on the built page, so the browser itself refuses
//   any request the page might try to make: cap table data never leaves the
//   computer (CLAUDE.md, rule 5).

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

/**
 * Everything the built page may load: its own scripts, worker and styles,
 * and nothing else. connect-src 'none' blocks fetch, XMLHttpRequest,
 * WebSocket, EventSource and beacons; form-action 'none' blocks form posts.
 * The page saves by downloading a file it makes itself, which needs none of
 * these.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "worker-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "font-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "manifest-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

/** Adds the policy to the built page. The dev server is left without it: its live reload needs a connection. */
function contentSecurityPolicy(): Plugin {
  return {
    name: "spillpoint-csp",
    apply: "build",
    transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY }, injectTo: "head-prepend" }],
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), examples(), contentSecurityPolicy()],
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
    // Some tests do real work: Millrace's breakpoints twice, or a case built click by click. They take about a
    // second alone, but a busy machine or CI runner can stretch that past the 5-second default.
    testTimeout: 20_000,
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
  },
});
