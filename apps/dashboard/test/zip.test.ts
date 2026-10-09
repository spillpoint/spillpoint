// Reading a .zip with no dependency (M6 plan, answer 11): zips of our own Quillfern package (OCF case 12) made by
// macOS's ditto (as Finder's Compress makes them, with a __MACOSX resource fork), by the zip command, and as Windows'
// Compress-Archive writes one, with "\" between folders. That last is synthesized (test/fixtures/README.md), since
// this machine can't run Windows. Anything else is refused by name.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { readOcf } from "spillpoint";
import { describe, expect, it } from "vitest";

import { importOcf } from "../src/ocfImport.ts";
import { crc32, readZip } from "../src/zip.ts";

const fixture = (name: string) => new Uint8Array(readFileSync(resolve(import.meta.dirname, "fixtures", name)));
const packageDir = resolve(import.meta.dirname, "../../../cases/ocf-12-ledger/package");
const packageFiles = readdirSync(packageDir).sort().map((name) => ({ name, content: JSON.parse(readFileSync(resolve(packageDir, name), "utf8")) as unknown }));

describe.each(["quillfern-macos.zip", "quillfern-zip.zip", "quillfern-windows.zip"])("%s", (zip) => {
  it("holds the package's files, byte for byte, and nothing else once macOS's resource forks are set aside", async () => {
    const imported = await importOcf([{ name: zip, bytes: fixture(zip) }]);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const base = (n: string) => n.slice(n.lastIndexOf("/") + 1);
    expect(imported.files.map((f) => base(f.name)).sort()).toEqual(packageFiles.map((f) => f.name));
    for (const f of imported.files) expect(f.content).toEqual(packageFiles.find((p) => p.name === base(f.name))!.content);
    expect(imported.skipped).toEqual([]);
  });

  it("imports exactly as the package's files do", async () => {
    const imported = await importOcf([{ name: zip, bytes: fixture(zip) }]);
    expect(imported.ok && imported.result).toEqual(readOcf(packageFiles));
  });
});

/** The zip command's zip, with one change at a central directory entry's offset: the first file's. */
function patched(at: number, write: (view: DataView, entry: number) => void): Uint8Array {
  const bytes = fixture("quillfern-zip.zip").slice();
  const view = new DataView(bytes.buffer);
  let end = bytes.length - 22;
  while (view.getUint32(end, true) !== 0x06054b50) end--;
  let entry = view.getUint32(end + 16, true);
  // The zip command lists the folder first; the first file comes after it.
  for (let i = 0; i < at; i++) entry += 46 + view.getUint16(entry + 28, true) + view.getUint16(entry + 30, true) + view.getUint16(entry + 32, true);
  write(view, entry);
  return bytes;
}

describe("what it refuses, by name", () => {
  it("another compression method", async () => {
    const bzip2 = patched(1, (v, e) => v.setUint16(e + 10, 12, true));
    await expect(readZip(bzip2)).rejects.toThrow("quillfern/StockClasses.ocf.json is compressed with bzip2, which this page doesn't read.");
  });

  it("an encrypted entry", async () => {
    const encrypted = patched(1, (v, e) => v.setUint16(e + 8, v.getUint16(e + 8, true) | 1, true));
    await expect(readZip(encrypted)).rejects.toThrow("quillfern/StockClasses.ocf.json is encrypted in the zip.");
  });

  it("a damaged entry, by its checksum", async () => {
    const damaged = patched(1, (v, e) => v.setUint32(e + 16, (v.getUint32(e + 16, true) ^ 1) >>> 0, true));
    await expect(readZip(damaged)).rejects.toThrow("quillfern/StockClasses.ocf.json is damaged in the zip: it doesn't match its checksum.");
  });

  it("a file that isn't a zip, and a .zip beside loose files", async () => {
    expect(await importOcf([{ name: "x.zip", bytes: new TextEncoder().encode('{"not": "a zip"}') }])).toEqual({
      ok: false,
      message: "Couldn't read x.zip. It isn't a zip file this page can read: it has no zip directory.",
    });
    expect(await importOcf([{ name: "a.zip", bytes: fixture("quillfern-zip.zip") }, { name: "Manifest.ocf.json", bytes: new Uint8Array() }])).toEqual({
      ok: false,
      message: "Open a .zip on its own, or the package's .ocf.json files together, not both.",
    });
  });
});

it("computes the zip format's CRC-32", () => {
  expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
});
