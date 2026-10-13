// @vitest-environment node
//
// A fund's data never leaves the computer (CLAUDE.md, rule 5). This builds the fund page as it would ship and checks,
// as the main page's privacy test does: the browser is told to refuse every request the page might make, the page
// loads only its own files, and its scripts contain no way to make a request, nor any browser storage.

import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
let outDir: string;
let html: string;
let scripts: { file: string; text: string }[];

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "spillpoint-fund-build-"));
  // Build as `pnpm build` does: the test runner sets NODE_ENV=test, which would bundle React's development build instead.
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await build({ root: app, configFile: resolve(app, "vite.config.ts"), mode: "production", logLevel: "silent", build: { outDir, emptyOutDir: true } });
  } finally {
    process.env.NODE_ENV = nodeEnv;
  }
  html = readFileSync(join(outDir, "index.html"), "utf8");
  scripts = readdirSync(join(outDir, "assets"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => ({ file: f, text: readFileSync(join(outDir, "assets", f), "utf8") }));
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("the built fund page", () => {
  it("tells the browser to refuse every connection, form post and outside resource, before anything it governs", () => {
    const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
    expect(meta).not.toBeNull();
    const policy = meta![1]!.replaceAll("&#39;", "'");
    for (const directive of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "object-src 'none'", "frame-src 'none'", "base-uri 'none'", "script-src 'self'"]) {
      expect(policy).toContain(directive);
    }
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<script"));
  });

  it("loads only its own files, by relative paths, so it works under /fund/ wherever the site is", () => {
    const sources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) expect(source).toMatch(/^(\.\/assets\/|\.\/favicon\.svg$|\.\/favicon-32\.png$)/);
    expect(html).toContain("<title>spillpoint: fund waterfall</title>");
  });

  it("ships its icons beside index.html", () => {
    for (const name of ["favicon.svg", "favicon-32.png"]) {
      expect(readFileSync(join(outDir, name)).equals(readFileSync(join(app, "public", name))), name).toBe(true);
    }
  });

  it("contains no way to send anything, and keeps nothing in browser storage", () => {
    const forbidden = /\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection|importScripts|serviceWorker|localStorage|sessionStorage|indexedDB|document\.cookie/g;
    const found = scripts.flatMap(({ file, text }) => [...text.matchAll(forbidden)].map((m) => `${file}: ${m[0]}`));
    expect(found).toEqual([]);
  });

  it("mentions no web address except documentation links in library error messages", () => {
    const allowed = [/^http:\/\/www\.w3\.org\//, /^https:\/\/react\.dev\/errors\//, /^https:\/\/github\.com\/MikeMcl\/decimal\.js/];
    const addresses = scripts.flatMap(({ text }) => [...text.matchAll(/https?:\/\/[A-Za-z0-9./_%#?=&+-]+/g)].map((m) => m[0]));
    expect(addresses.filter((a) => !allowed.some((r) => r.test(a)))).toEqual([]);
  });

  it("carries the fund engine and never the company engine", () => {
    const all = scripts.map((s) => s.text).join("\n");
    // One of readFund's refusals, which only the fund engine words this way.
    expect(all.includes("a fund needs at least one call")).toBe(true);
    // The company engine's own error classes, which only the main page's bundle has.
    for (const name of ["ImportRefusal", "UnsupportedTermError", "NoAnswerError"]) expect(all.includes(name), name).toBe(false);
  });
});
