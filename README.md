# spillpoint

Open-source exit waterfall engine. Given a cap table and an exit value, spillpoint works out who gets what: preferences, participation and caps, conversions and options. It also finds every breakpoint where the payout curve bends or jumps, and explains each one in plain English.

The engine is on npm as [`spillpoint`](packages/engine/README.md). It runs entirely on your machine, with no network access, so your cap table never leaves it.

Coming next:
- **A dashboard that runs in your browser,** with payoff curves, breakpoints and a cap table editor.
- **Open Cap Format import,** so you can load a cap table exported from your cap table software.

> The charter and the signed documents govern, not this tool.

## In this repository

- [`packages/engine`](packages/engine): the `spillpoint` npm package.
- [`cases`](cases): the locked test cases, each with its inputs, expected values and a plain-English derivation.
- [`reference`](reference): an independent calculator, using exact fractions and a different method, that produced the expected values.
- [`docs`](docs): the rules ([`SPEC.md`](docs/SPEC.md)) and every modeling choice with its default ([`ASSUMPTIONS.md`](docs/ASSUMPTIONS.md)).

Licensed under Apache-2.0.
