// Checks an Open Cap Format export without sharing it (0.5.0, 05a; ASSUMPTIONS O15):
//
//   pnpm ocf-check path/to/export.zip
//   pnpm ocf-check path/to/folder-of-ocf-files
//
// It reads the export as the page does, with the page's own zip reader and the engine's readOcf, then tries each set
// of answers to the blanks the import leaves through the engine. It prints only counts and codes: never a name, an
// id, an amount or a date, so its output can be pasted anywhere. It reads only the files named and writes nothing.
//
// Needs Node 22.18 or later, which runs the page's TypeScript sources directly. `pnpm ocf-check` builds the engine
// first, since the page's sources import it as a package.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`ocf-check needs Node 22.18 or later, which runs TypeScript directly; this is Node ${process.versions.node}.`);
  process.exit(1);
}
const target = process.argv[2];
if (!target) {
  console.error("Usage: pnpm ocf-check <export.zip | folder of .ocf.json files>");
  process.exit(1);
}

/** Every file under a folder, named by its path inside it. */
function filesUnder(dir) {
  return readdirSync(dir, { recursive: true })
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isFile())
    .sort()
    .map((path) => ({ name: relative(dir, path), bytes: new Uint8Array(readFileSync(path)) }));
}

const path = resolve(target);
const picked = statSync(path).isDirectory() ? filesUnder(path) : [{ name: basename(path), bytes: new Uint8Array(readFileSync(path)) }];
const { checkExport } = await import("../apps/dashboard/src/ocfCheck.ts");
const { version } = JSON.parse(readFileSync(new URL("../packages/engine/package.json", import.meta.url), "utf8"));
console.log((await checkExport(picked, version)).join("\n"));
