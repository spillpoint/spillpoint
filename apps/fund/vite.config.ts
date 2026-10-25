/// <reference types="vitest/config" />
// The fund page's build (notes/plan-fund-page.md). As the main page's:
// - "spillpoint-fund" resolves to the fund engine's sources, not a build, so the
//   page always runs the current engine with no build step. It never imports
//   "spillpoint", the company engine (CLAUDE.md, the fund workstream).
// - The examples are read from the locked fund cases at build time and reduced
//   to each one's input, so they can't drift from the tests.
// - No network: the built page loads nothing from anywhere else.
// - The footer names spillpoint-fund's version and the commit it was built from.
// - A Content-Security-Policy on the built page, the main page's exactly (a test
//   holds the two equal), so the browser refuses any request the page might try
//   to make: a fund's data never leaves the computer (CLAUDE.md, rule 5).
//
// Not deployed until spillpoint-fund 0.1.0's release step (f01n): Pages uploads
// only apps/dashboard/dist until then.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const repo = resolve(import.meta.dirname, "../..");
const casesDir = resolve(repo, "packages/fund/cases");

/**
 * The examples the page offers (plan answer 5), each with the X it opens at. Most VC funds have flat 20%, so the page
 * opens on one, case 3; case 8's steps come second, labelled as premium carry, since read first they looked like extra
 * carry rather than bands of one carry (f01g, from Jordan's look at the page). From f02c the premium-carry fund is case
 * 17 and the clawback case 19, the same funds with LPs, so the LPs' card and its clawback column show from the picker;
 * their labels say so, since the picker is how a GP finds the LPs (f02c review, answer 1). From f03c case 26 follows the
 * clawback example, so the classes card and the equalization card show from the picker, at its listed X, between its
 * two breakpoints.
 */
export const EXAMPLES = [
  { id: "fund-03-gp-commitment", label: "A fund: 20% carry and a 2% GP commitment", defaultX: "20000000" },
  { id: "fund-17-lps-three", label: "A VC fund with premium carry and three LPs: 20%, then 25% from 3x and 30% from 5x", defaultX: "40000000" },
  { id: "fund-19-lps-clawback", label: "A late call, a clawback and two LPs", defaultX: "0" },
  { id: "fund-26-closes-and-classes", label: "Two later closes and a friends-and-family class", defaultX: "5200000" },
  { id: "fund-12-spv", label: "An SPV: one company, the exit as its last distribution", defaultX: "6000000" },
];

function examples(): Plugin {
  const id = "virtual:fund-examples";
  return {
    name: "spillpoint-fund-examples",
    resolveId: (source) => (source === id ? `\0${id}` : null),
    load(loadId) {
      if (loadId !== `\0${id}`) return null;
      const out = EXAMPLES.map((e) => {
        const inputsPath = resolve(casesDir, e.id, "inputs.json");
        this.addWatchFile(inputsPath);
        const inputs = JSON.parse(readFileSync(inputsPath, "utf8"));
        return { id: e.id, label: e.label, fictional: true, defaultX: e.defaultX, fund: inputs.fund };
      });
      return `export default ${JSON.stringify(out)};`;
    },
  };
}

/**
 * What the page was built from, for its footer: spillpoint-fund's version, and the commit, since the page runs the fund
 * engine's sources from main. A build with uncommitted changes says so. Read once, at build time.
 */
function buildInfo(): Plugin {
  const id = "virtual:fund-build";
  const fundVersion: string = JSON.parse(readFileSync(resolve(repo, "packages/fund/package.json"), "utf8")).version;
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  let commit = "unknown commit";
  try {
    commit = git("rev-parse", "--short=7", "HEAD");
    if (git("status", "--porcelain")) commit += ", modified";
  } catch {
    // Not a git checkout (a source archive, say): the version still shows.
  }
  return {
    name: "spillpoint-fund-build-info",
    resolveId: (source) => (source === id ? `\0${id}` : null),
    load: (loadId) => (loadId === `\0${id}` ? `export default ${JSON.stringify({ fundVersion, commit })};` : null),
  };
}

/**
 * Everything the built page may load: its own scripts and styles, and nothing else. The main page's policy, word for
 * word (test/csp.test.ts): connect-src 'none' blocks fetch, XMLHttpRequest, WebSocket, EventSource and beacons;
 * form-action 'none' blocks form posts.
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
    name: "spillpoint-fund-csp",
    apply: "build",
    transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY }, injectTo: "head-prepend" }],
  };
}

export default defineConfig({
  // Every path relative, so the page works under /spillpoint/fund/ now and spillpoint.io/fund/ later, unchanged.
  base: "./",
  plugins: [react(), examples(), buildInfo(), contentSecurityPolicy()],
  resolve: {
    alias: { "spillpoint-fund": resolve(repo, "packages/fund/src/index.ts") },
  },
  // Vite's module-preload helper calls fetch() on the page's own files. A page that makes no network requests
  // shouldn't contain one.
  build: { modulePreload: { polyfill: false } },
  test: {
    environment: "jsdom",
    testTimeout: 20_000,
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
  },
});
