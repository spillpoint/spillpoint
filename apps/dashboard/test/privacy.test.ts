// @vitest-environment node
//
// Cap table data never leaves the computer (CLAUDE.md, rule 5). This builds
// the page as it ships and checks two things: the browser is told to refuse
// every request the page might make, and the page's scripts contain no way to
// make one, nor any browser storage.

import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dashboard = resolve(import.meta.dirname, "..");
let outDir: string;
let html: string;
let scripts: { file: string; text: string }[];

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "spillpoint-build-"));
  // Build as `pnpm build` does: the test runner sets NODE_ENV=test, which would bundle React's development build instead.
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await build({ root: dashboard, configFile: resolve(dashboard, "vite.config.ts"), mode: "production", logLevel: "silent", build: { outDir, emptyOutDir: true } });
  } finally {
    process.env.NODE_ENV = nodeEnv;
  }
  html = readFileSync(join(outDir, "index.html"), "utf8");
  scripts = readdirSync(join(outDir, "assets"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => ({ file: f, text: readFileSync(join(outDir, "assets", f), "utf8") }));
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("the built page", () => {
  it("tells the browser to refuse every connection, form post and outside resource", () => {
    const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
    expect(meta).not.toBeNull();
    const policy = meta![1]!.replaceAll("&#39;", "'");
    for (const directive of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "object-src 'none'", "frame-src 'none'", "base-uri 'none'", "script-src 'self'"]) {
      expect(policy).toContain(directive);
    }
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
    // The policy comes before anything it governs.
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<script"));
  });

  it("loads only its own files", () => {
    const sources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) expect(source).toMatch(/^(\.\/assets\/|data:)/);
  });

  it("contains no way to send anything, and keeps nothing in browser storage", () => {
    const forbidden = /\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection|importScripts|serviceWorker|localStorage|sessionStorage|indexedDB|document\.cookie/g;
    const found = scripts.flatMap(({ file, text }) => [...text.matchAll(forbidden)].map((m) => `${file}: ${m[0]}`));
    expect(found).toEqual([]);
  });

  it("mentions no web address except XML namespaces and documentation links in library error messages", () => {
    const allowed = [
      /^http:\/\/www\.w3\.org\//,
      /^https:\/\/react\.dev\/errors\//,
      /^https:\/\/redux(-toolkit)?\.js\.org\/Errors/,
      /^https:\/\/github\.com\/MikeMcl\/decimal\.js/,
      // Immer's error messages point here for details.
      /^https:\/\/bit\.ly\/3cXEKWf/,
    ];
    const addresses = scripts.flatMap(({ text }) => [...text.matchAll(/https?:\/\/[A-Za-z0-9./_%#?=&+-]+/g)].map((m) => m[0]));
    expect(addresses.filter((a) => !allowed.some((r) => r.test(a)))).toEqual([]);
  });
});
