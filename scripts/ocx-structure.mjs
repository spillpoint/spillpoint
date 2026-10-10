// The cell-kinds script (0.6.0, 06c; ASSUMPTIONS OX2): what kinds of cell an OCX workbook's columns hold, with
// counts, so a real export can settle what its header rows can't, without anyone sending the file:
//
//   pnpm ocx-structure path/to/export.xlsx
//
// It reads the workbook as the page will, with the page's own .xlsx reader, and prints only counts, kinds and the
// format's own tab names and headers: never a value, a name, an amount or a date, and nothing from the Additional
// Information block. It reads only the file named and writes nothing.
//
// Needs Node 22.18 or later, which runs the page's TypeScript sources directly.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`ocx-structure needs Node 22.18 or later, which runs TypeScript directly; this is Node ${process.versions.node}.`);
  process.exit(1);
}
const target = process.argv[2];
if (!target) {
  console.error("Usage: pnpm ocx-structure <export.xlsx>");
  process.exit(1);
}

const { readXlsx, XlsxError } = await import("../apps/dashboard/src/xlsx.ts");
const { structureLines } = await import("../apps/dashboard/src/ocxStructure.ts");
const { version } = JSON.parse(readFileSync(new URL("../packages/engine/package.json", import.meta.url), "utf8"));
try {
  console.log(structureLines(await readXlsx(new Uint8Array(readFileSync(resolve(target)))), version).join("\n"));
} catch (e) {
  // The code only: a refusal's message can name a tab or a part, which can name the company (O15).
  if (e instanceof XlsxError) console.log(`spillpoint ${version}: an OCX workbook's structure, in counts and kinds\nWorkbook: refused, ${e.code}`);
  else console.log(`spillpoint ${version}: an OCX workbook's structure, in counts and kinds\nWorkbook: unexpected ${e?.name ?? "error"}`);
  process.exitCode = 1;
}
