# spillpoint

Open-source exit waterfall engine and dashboard. Given a cap table and an exit value, spillpoint works out who gets what: preferences, participation and caps, conversions and options. It also finds every breakpoint where the payout curve bends or jumps, and explains each one in plain English.

## Try it

**[spillpoint.github.io/spillpoint](https://spillpoint.github.io/spillpoint/)** runs in your browser. You can:

- Start from a fictional example, a blank cap table, or a file you saved.
- See what you get at any exit value, against your share of the company, and where your payout starts.
- Follow the payoff curves by holder or by class. Every breakpoint is marked and explained, including how it changes your payout.
- Edit the cap table:
  - holders
  - common stock
  - options at each strike
  - preferred series, with their preference, participation and cap
  - the order the preferred series are paid in
  - one group of series that convert together
  - the unissued option pool
- Save the cap table to a file on your computer, and open it again.

Your cap table stays in your browser. GitHub Pages serves the page, and sees the visit as it would for any site. After that, the page makes no network requests and tells the browser to block any it might try. Nothing is kept anywhere unless you save a file.

The page doesn't yet build a cap table from its rounds, such as priced rounds and SAFEs or notes converting. Nor does it handle cumulative dividends, warrants, management carve-outs, escrow and earnouts, or SAFEs and notes still outstanding at a sale. A saved file that uses one of these is refused with a message saying so, never quietly ignored.

> The charter and the signed documents govern, not this tool.

## The engine

The engine is on npm as [`spillpoint`](packages/engine/README.md). It runs entirely on your machine, with no network access, so your cap table never leaves it.

Coming next:
- **Open Cap Format import,** so you can load a cap table exported from your cap table software.

## In this repository

- [`packages/engine`](packages/engine): the `spillpoint` npm package.
- [`apps/dashboard`](apps/dashboard): the page above. Run it locally with `pnpm install && pnpm dev`.
- [`cases`](cases): the locked test cases, each with its inputs, expected values and a plain-English derivation.
- [`reference`](reference): an independent calculator, using exact fractions and a different method, that produced the expected values.
- [`docs`](docs): the rules ([`SPEC.md`](docs/SPEC.md)) and every modeling choice with its default ([`ASSUMPTIONS.md`](docs/ASSUMPTIONS.md)).

Licensed under Apache-2.0.
