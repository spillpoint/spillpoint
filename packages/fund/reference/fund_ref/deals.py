"""A fund's investments, and what each distribution realizes of them (F33), exactly.

An investment's cost made is its checks to date; what's left of it is the cost
made less the cost realized so far. A distribution from it realizes `share` of
what's left at its date; a write-off realizes all that's left, with no
proceeds; a distribution from an investment with nothing left, such as a release
from escrow after a full exit, realizes nothing more. A follow-on check adds to
what's left.

On one date: calls, then checks, then write-offs, then distributions in the
order listed (F4, widened). Calls don't change an investment, so the walk here
is checks, write-offs and distributions.

What's due before carry deal by deal (F35) needs two figures at each
distribution, both whole-fund amounts: the cost realized so far, its own
included, and the cost made by its date. Each distribution carries them
(`Flow.realized`, `Flow.made`), and so does each account's copy of it, since an
account's flows are the fund's scaled (accounts.py). The waterfall works the
LPs' part of them (waterfall.py). On the whole fund (F34) they change nothing.

X realizes its share of what's left of its investment at D, after every other
cash flow. When X is final, and at the NAV point, everything left of every
investment is realized at D: the fund ends (F33), so the cost realized is the
cost made.

From 0.6.0 the same walk gives the fund's net invested capital (F38), what a
fee step on invested capital charges (F39, fees.py): on a day, the checks made
to that day less the cost realized to that day, exited or written off, on
either carry basis. Each event counts from its own date, after every event of
that date in F4's widened order. X isn't in it.
"""

from dataclasses import dataclass
from fractions import Fraction


@dataclass
class Holding:
    """One investment's figures (F36): at D, before X."""

    made: Fraction = Fraction(0)  # its checks to date
    realized: Fraction = Fraction(0)  # exited or written off
    written_off: Fraction = Fraction(0)
    proceeds: Fraction = Fraction(0)  # the distributions from it, as whole-fund amounts

    @property
    def left(self):
        return self.made - self.realized


def realize(fund):
    """F33: walks the checks, write-offs and distributions in F4's widened order, setting each distribution's `realized`
    and `made` (F35), the fund's `holdings` at D before X (F36), its `made_at_d`, and `x_realized`, the cost realized with
    X's share of its investment when X isn't final."""
    by_name = {inv.name: i for i, inv in enumerate(fund.investments)}
    holdings = [Holding() for _ in fund.investments]
    events = [(c.date, 0, inv.index, c.index, c) for inv in fund.investments for c in inv.checks]
    events += [(w.date, 1, w.index, 0, w) for w in fund.write_offs]
    events += [(f.date, 2, f.index, 0, f) for f in fund.flows if f.type == "distribution"]
    made = realized = Fraction(0)
    invested = []
    for date, order, i, _, event in sorted(events, key=lambda e: e[:4]):
        if order == 0:
            # A check, or a follow-on: the cost made, and what's left of its investment, grow by it.
            holdings[i].made += event.amount
            made += event.amount
        elif order == 1:
            # A write-off ends all that's left of its investment, with no proceeds.
            h = holdings[by_name[event.investment]]
            gone = h.left
            h.realized += gone
            h.written_off += gone
            realized += gone
        else:
            if event.investment is not None:
                # A distribution sells `share` of what's left of its investment: that much cost is exited. With nothing
                # left, it realizes nothing more. One that names no investment realizes nothing (F38).
                h = holdings[by_name[event.investment]]
                gone = event.share * h.left
                h.realized += gone
                h.proceeds += event.amount
                realized += gone
            event.realized, event.made = realized, made
        # F38: net invested capital from this event's date on, the last event of a date giving that date's.
        invested.append((date, made - realized))
    fund.holdings = holdings
    fund.invested = invested
    fund.made_at_d = made
    fund.x_realized = realized
    if fund.distribution_from is not None:
        h = holdings[by_name[fund.distribution_from.investment]]
        fund.x_realized = realized + fund.distribution_from.share * h.left


def invested_on(fund, day):
    """F38: net invested capital on a day: the checks made to that day, less the cost realized to that day, exited or
    written off, whole-fund amounts. A check's date is the first day with it in; an exit's or a write-off's, the first
    day without the cost it realizes. Nothing before the first check."""
    net = Fraction(0)
    for date, value in fund.invested:
        if date > day:
            break
        net = value
    return net
