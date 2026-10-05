// Build step: the compiler rewrites "./x.ts" imports to "./x.js" in the
// JavaScript it emits but not in the .d.ts declarations. Older TypeScript
// versions in a user's project may not resolve a ".ts" path from a
// declaration file, so the declarations get the same ".js" paths.
// Plain JavaScript, so the build runs on every supported Node (22 and later).

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");
for (const file of readdirSync(dist).filter((f) => f.endsWith(".d.ts"))) {
  const path = join(dist, file);
  const text = readFileSync(path, "utf8");
  const fixed = text.replace(/(from\s+"\.\/[^"]+)\.ts"/g, '$1.js"');
  if (fixed !== text) writeFileSync(path, fixed);
}
