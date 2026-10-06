// The README's worked examples print what the README says they print. Each
// ```js block followed by an "Output:" block runs against the engine's own
// exports, with its import from "spillpoint" bound to them.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, it } from "vitest";

import * as spillpoint from "../src/index.ts";

const readme = readFileSync(resolve(import.meta.dirname, "../README.md"), "utf8");
const examples = [...readme.matchAll(/```js\n([\s\S]*?)```\n\nOutput:\n\n```\n([\s\S]*?)```/g)].map((m) => ({ code: m[1]!, output: m[2]! }));

it("has its two worked examples", () => {
  expect(examples).toHaveLength(2);
});

it.each(examples.map((e, i) => [i + 1, e] as const))("example %i prints its Output block", (_, { code, output }) => {
  const imported = /^import \{([^}]*)\} from "spillpoint";$/m;
  expect(code).toMatch(imported);
  const lines: string[] = [];
  const run = new Function("spillpoint", "console", code.replace(imported, "const {$1} = spillpoint;"));
  run(spillpoint, { log: (...args: unknown[]) => lines.push(args.join(" ")) });
  expect(lines.join("\n")).toBe(output.trimEnd());
});
