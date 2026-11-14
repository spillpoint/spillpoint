// The site as Pages uploads it (f01n): the main page built, the fund page built and copied into its folder as fund/,
// exactly as .github/workflows/pages.yml does. The folder, fund/ inside it, loads nothing from elsewhere: each page
// refuses every outside connection, every file either loads is inside the folder, and each links to the other. From 10h
// it is served from spillpoint.io, and the same build works at the old address too, its files, worker and links.

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FORM_URL } from "../../site/signUp.ts";

const repo = resolve(import.meta.dirname, "../../..");
let site: string;
let fundOut: string;

beforeAll(async () => {
  site = mkdtempSync(join(tmpdir(), "spillpoint-site-"));
  fundOut = mkdtempSync(join(tmpdir(), "spillpoint-site-fund-"));
  // Build as `pnpm build` does: the test runner sets NODE_ENV=test, which would bundle React's development build instead.
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    for (const [app, outDir] of [
      ["apps/dashboard", site],
      ["apps/fund", fundOut],
    ] as const) {
      const root = resolve(repo, app);
      await build({ root, configFile: resolve(root, "vite.config.ts"), mode: "production", logLevel: "silent", build: { outDir, emptyOutDir: true } });
    }
  } finally {
    process.env.NODE_ENV = nodeEnv;
  }
  // pages.yml: cp -r apps/fund/dist apps/dashboard/dist/fund
  cpSync(fundOut, join(site, "fund"), { recursive: true });
}, 120_000);

afterAll(() => {
  rmSync(site, { recursive: true, force: true });
  rmSync(fundOut, { recursive: true, force: true });
});

/** Every file in the uploaded folder, by its path inside it. */
function files(dir = site): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [relative(site, path)];
  });
}
const pages = () => ["index.html", "fund/index.html"];
const text = (file: string) => readFileSync(join(site, file), "utf8");

describe("the site, the fund page under fund/", () => {
  it("has both pages, each with its own files beside it", () => {
    const all = files();
    for (const page of pages()) expect(all).toContain(page);
    expect(all.filter((f) => f.startsWith("fund/assets/")).length).toBeGreaterThan(0);
    expect(all.filter((f) => f.startsWith("assets/")).length).toBeGreaterThan(0);
  });

  it("tells the browser, on each page, to refuse every connection, form post and outside resource, the same way", () => {
    const policies = pages().map((page) => {
      const html = text(page);
      const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
      expect(meta, page).not.toBeNull();
      expect(html.indexOf("Content-Security-Policy"), page).toBeLessThan(html.indexOf("<script"));
      const policy = meta![1]!.replaceAll("&#39;", "'");
      for (const directive of ["default-src 'none'", "connect-src 'none'", "form-action 'none'"]) expect(policy, page).toContain(directive);
      expect(policy, page).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
      return policy;
    });
    expect(policies[1]).toBe(policies[0]);
  });

  it("loads only files inside the folder, each page its own, by relative paths that are there", () => {
    for (const page of pages()) {
      const html = text(page);
      const sources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!);
      expect(sources.length, page).toBeGreaterThan(0);
      for (const source of sources) {
        expect(source, `${page}: ${source}`).toMatch(/^\.\//);
        const file = join(dirname(join(site, page)), source);
        // Inside the folder, and inside the page's own part of it: the main page never loads the fund page's files.
        expect(relative(site, file).startsWith(".."), `${page}: ${source}`).toBe(false);
        expect(existsSync(file), `${page}: ${source}`).toBe(true);
        if (page === "index.html") expect(source.startsWith("./fund/"), source).toBe(false);
      }
    }
  });

  it("links each page to the other, both inside the folder", () => {
    const scripts = (prefix: string) => files().filter((f) => f.startsWith(`${prefix}assets/`) && f.endsWith(".js")).map(text).join("\n");
    // The main page's footer links to ./fund/, and the fund page's back to ../: each resolves to the other page.
    // As the minifier writes them, in quotes or backticks.
    expect(scripts("")).toMatch(/href:["'`]\.\/fund\/["'`]/);
    expect(scripts("fund/")).toMatch(/href:["'`]\.\.\/["'`]/);
    expect(existsSync(join(site, "fund", "index.html"))).toBe(true);
    expect(existsSync(join(site, "fund", "..", "index.html"))).toBe(true);
  });

  it("contains no way to send anything, keeps nothing in browser storage, and names no other address but the sign-up form's", () => {
    const scripts = files().filter((f) => f.endsWith(".js"));
    const forbidden = /\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection|importScripts|serviceWorker|localStorage|sessionStorage|indexedDB|document\.cookie/g;
    expect(scripts.flatMap((f) => [...text(f).matchAll(forbidden)].map((m) => `${f}: ${m[0]}`))).toEqual([]);
    // The two pages' own privacy tests' lists: XML namespaces, and documentation links in library error messages.
    const allowed = [
      /^http:\/\/www\.w3\.org\//,
      /^https:\/\/react\.dev\/errors\//,
      /^https:\/\/redux(-toolkit)?\.js\.org\/Errors/,
      /^https:\/\/github\.com\/MikeMcl\/decimal\.js/,
      /^https:\/\/bit\.ly\/3cXEKWf/,
    ];
    // The sign-up form's address (10h), exactly as FORM_URL has it, set aside whole: in each page's scripts, and nowhere else.
    const withForm = files().filter((f) => text(f).includes(FORM_URL));
    expect(withForm.every((f) => /^(fund\/)?assets\/[^/]+\.js$/.test(f)), withForm.join(", ")).toBe(true);
    expect(withForm.map((f) => (f.startsWith("fund/") ? "the fund page" : "the main page")).sort()).toEqual(["the fund page", "the main page"]);
    const addresses = files()
      .filter((f) => /\.(js|html|css)$/.test(f))
      .flatMap((f) => [...text(f).replaceAll(FORM_URL, "").matchAll(/https?:\/\/[A-Za-z0-9./_%#?=&+-]+/g)].map((m) => `${f}: ${m[0]}`));
    expect(addresses.filter((a) => !allowed.some((r) => r.test(a.split(": ")[1]!)))).toEqual([]);
  });
});

/**
 * The two addresses the site is served from (10h): spillpoint.io, and the old address, which serves the same build until
 * the domain is set in Settings → Pages and redirects to spillpoint.io after. Both have to work, so the merge and the
 * switch can come in either order without a moment when the live page is broken.
 */
const ADDRESSES = ["https://spillpoint.io/", "https://spillpoint.github.io/spillpoint/"];

/** The file in the uploaded folder that Pages serves at a URL under the site's address: a folder's URL, its index.html. */
function served(url: URL, address: string): string | null {
  if (!url.href.startsWith(address)) return null;
  let path = decodeURIComponent(url.pathname.slice(new URL(address).pathname.length));
  if (path === "" || path.endsWith("/")) path += "index.html";
  const file = join(site, path);
  return existsSync(file) && statSync(file).isFile() ? relative(site, file) : null;
}

/** Each page's address under the site's, and the file Pages serves there. */
const pageAt = (address: string) => [
  { url: address, page: "index.html" },
  { url: `${address}fund/`, page: "fund/index.html" },
];

describe.each(ADDRESSES)("the site served from %s", (address) => {
  const origin = new URL(address).origin;

  it("serves each page at its address, and every file each page loads from that address, on its own origin", () => {
    for (const { url, page } of pageAt(address)) {
      expect(served(new URL(url), address), url).toBe(page);
      const sources = [...text(page).matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!);
      expect(sources.length, page).toBeGreaterThan(0);
      for (const source of sources) {
        const loaded = new URL(source, url);
        // The page's own origin: anything from another one, its Content-Security-Policy would refuse.
        expect(loaded.origin, `${url}: ${source}`).toBe(origin);
        expect(served(loaded, address), `${url}: ${source}`).not.toBeNull();
        // Inside the page's own part of the site: the main page's files are never the fund page's, nor the reverse.
        expect(served(loaded, address)!.startsWith("fund/"), `${url}: ${source}`).toBe(page.startsWith("fund/"));
      }
    }
  });

  it("starts the main page's worker from a file beside its script, on the page's own origin", () => {
    // Each script's address, from the page that loads it; then every file a script names relative to itself, as the
    // worker is: new URL("analysis.worker-….js", import.meta.url).
    let workers = 0;
    for (const { url, page } of pageAt(address)) {
      for (const [, source] of text(page).matchAll(/<script[^>]* src="([^"]+)"/g)) {
        const script = new URL(source!, url);
        const named = [...text(served(script, address)!).matchAll(/new URL\(["'`]([^"'`]+)["'`],\s*import\.meta\.url\)/g)].map((m) => m[1]!);
        for (const name of named) {
          const loaded = new URL(name, script);
          expect(loaded.origin, `${url}: ${name}`).toBe(origin);
          expect(served(loaded, address), `${url}: ${name}`).toMatch(page.startsWith("fund/") ? /^fund\/assets\// : /^assets\//);
          if (/analysis\.worker-[^/]+\.js$/.test(name)) workers++;
        }
      }
    }
    expect(workers).toBe(1);
  });

  it("links each page to the other at this address", () => {
    const scripts = (prefix: string) => files().filter((f) => f.startsWith(`${prefix}assets/`) && f.endsWith(".js")).map(text).join("\n");
    const [main, fund] = pageAt(address);
    // The main page's footer link, ./fund/, and the fund page's, ../, as the minifier writes them.
    const link = (js: string, href: string) => new RegExp(`href:["'\`]${href.replaceAll(".", "\\.")}["'\`]`).test(js);
    expect(link(scripts(""), "./fund/")).toBe(true);
    expect(link(scripts("fund/"), "../")).toBe(true);
    expect(new URL("./fund/", main!.url).href).toBe(fund!.url);
    expect(served(new URL("./fund/", main!.url), address)).toBe("fund/index.html");
    expect(new URL("../", fund!.url).href).toBe(main!.url);
    expect(served(new URL("../", fund!.url), address)).toBe("index.html");
  });
});
