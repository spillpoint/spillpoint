# spillpoint

Open-source exit waterfall engine and dashboard. Given a cap table and an exit value, spillpoint works out who gets what: preferences, participation and caps, conversions and options. It also finds every breakpoint where the payout curve bends or jumps, and explains each one in plain English.

## Try it

**[spillpoint.github.io/spillpoint](https://spillpoint.github.io/spillpoint/)** runs in your browser. You can:

- Start from a fictional example, a blank cap table, a blank company to build from its rounds, or a file you saved.
- See what you get at any exit value, against your share of the company, and where your payout starts.
- Follow the payoff curves by holder or by class. Every breakpoint is marked and explained, including how it changes your payout. Where a carve-out alongside the preferences makes payouts curve, the curves follow it.
- Edit the cap table:
  - holders
  - common stock
  - options at each strike
  - warrants, for common or a preferred series, at each strike
  - preferred series, with their preference, participation and cap, and any cumulative dividends
  - the order the preferred series are paid in
  - one group of series that convert together
  - the unissued option pool
  - SAFEs and convertible notes still outstanding at the sale
- Set the sale's terms under Exit terms, even when the cap table is built from rounds:
  - its date, which notes' interest and cumulative dividends accrue up to
  - a management carve-out, in tiers, paid before the preferences or alongside them
  - escrow and earnouts, as a schedule of payments. The Payouts tab shows each holder's take of each payment, and warns when a later payment lowers what someone has been paid so far.
- Build the cap table from the company's history on the Rounds tab: shares issued, the option pool, grants, warrants, SAFEs and convertible notes, and priced rounds with their pool top-ups, pro-rata, anti-dilution, pay-to-play and cumulative dividends. Each event shows what it did, what it did to your share, and the cap table after it. The fictional example, Millrace Robotics, opens from its ten events.
- Save the cap table, or the rounds that build it, to a file on your computer, and open it again.

Your cap table stays in your browser. GitHub Pages serves the page, and sees the visit as it would for any site. After that, the page makes no network requests and tells the browser to block any it might try. Nothing is kept anywhere unless you save a file.

The page doesn't build a few combinations within a round: the engine's README lists them. Anything it doesn't handle is refused with a message saying so, never quietly ignored.

> The charter and the signed documents govern, not this tool.

## The engine

The engine is on npm as [`spillpoint`](packages/engine/README.md). It runs entirely on your machine, with no network access, so your cap table never leaves it. From version 0.1.0 it also builds a cap table from a company's rounds: SAFEs and notes converting, priced rounds with their pool top-ups, pro-rata, anti-dilution and pay-to-play. From 0.2.0 it also pays warrants, cumulative dividends, management carve-outs, escrow and earnouts, and SAFEs and notes still outstanding at a sale. From 0.3.0 it also converts SAFEs and notes in a round that triggers anti-dilution or has pay-to-play, and a post-money SAFE beside notes or other SAFEs; and it takes a carve-out as a term of the sale. Its README lists what it still refuses.

Coming next:
- **Open Cap Format import,** so you can load a cap table exported from your cap table software.

## In this repository

- [`packages/engine`](packages/engine): the `spillpoint` npm package.
- [`apps/dashboard`](apps/dashboard): the page above. Run it locally with `pnpm install && pnpm dev`.
- [`cases`](cases): the locked test cases, each with its inputs, expected values and a plain-English derivation.
- [`reference`](reference): an independent calculator, using exact fractions and a different method, that produced the expected values.
- [`docs`](docs): the rules ([`SPEC.md`](docs/SPEC.md)) and every modeling choice with its default ([`ASSUMPTIONS.md`](docs/ASSUMPTIONS.md)).

Licensed under Apache-2.0.
