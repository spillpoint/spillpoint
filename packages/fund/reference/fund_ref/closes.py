"""Later closes and their equalization (F25), exactly.

The waterfall treats every LP as in from the start (F25), so nothing here
changes an account or a tier. What's worked out is the cash that moves between
LPs at each later close:
- each call was paid, as the fund made it, by the LPs in at its date (FA21), by
  commitment, or by F22's fee weight for a fee call;
- at each later close, in date order, the LPs in by then rebalance every call
  before the close: each one's part becomes the LPs' part of the call times its
  weight over theirs. The joining LPs pay in their parts; the LPs already in
  get back what they had paid over theirs;
- each joining LP pays interest at the equalization rate, simple, Actual/365,
  on its part of each earlier call, from the call's date to its close. The
  interest on a call goes to the LPs already in, in proportion to what each
  gets back of that call.

The GP commitment pays its part of each call as it's made and is in no
equalization (F25), so a call's LPs' part is the call less the GP commitment's
(F3).
"""

from dataclasses import dataclass, field
from fractions import Fraction

from .num import days
from .waterfall import YEAR, gp_commitment_part


@dataclass
class Moves:
    """One LP's equalization: at one later close, or over all of them (F26)."""

    capital_paid: Fraction = Fraction(0)  # paid in at its close
    capital_returned: Fraction = Fraction(0)  # got back at a later close
    interest_paid: Fraction = Fraction(0)
    interest_received: Fraction = Fraction(0)

    def add(self, other):
        self.capital_paid += other.capital_paid
        self.capital_returned += other.capital_returned
        self.interest_paid += other.interest_paid
        self.interest_received += other.interest_received


@dataclass
class Close:
    date: object
    joining: list  # the LPs joining at it, in the input's order
    moves: dict = field(default_factory=dict)  # LP index -> Moves, for every LP in by then


@dataclass
class Equalization:
    rate: Fraction
    closes: list  # Close, in date order
    totals: list  # Moves, one an LP in the input's order


def _parts(fund, call, members):
    """F25: the LPs' part of a call divided among `members` (LP indices) by their weights (F22, F23)."""
    lps_part = call.amount - gp_commitment_part(fund, call.kind, call.amount)
    weights = {i: fund.weight(fund.lps[i], call.kind) for i in members}
    total = sum(weights.values(), Fraction(0))
    return {i: lps_part * w / total for i, w in weights.items()}


def equalization(fund):
    """The fund's equalization, or None when no LP joins at a later close (F25, F26)."""
    lps = fund.lps
    dates = sorted({lp.close for lp in lps if fund.joins_later(lp)})
    if not dates:
        return None
    calls = [f for f in fund.flows if f.type == "call"]
    # The fund's calls as it made them: each paid by the LPs in at its date (FA21). F28 refuses a call no LP pays.
    held = {c.index: _parts(fund, c, [i for i, lp in enumerate(lps) if fund.is_in(lp, c.date)]) for c in calls}
    rate = fund.equalization_rate
    closes = []
    for date in dates:
        members = [i for i, lp in enumerate(lps) if fund.is_in(lp, date)]
        joining = [i for i in members if lps[i].close == date]
        close = Close(date, [lps[i] for i in joining], {i: Moves() for i in members})
        for c in calls:
            if not c.date < date:
                continue  # FA21: a call on the close's date was paid by the LPs joining that day
            before, after = held[c.index], _parts(fund, c, members)
            back = {i: before[i] - after[i] for i in members if i not in joining}
            n = days(c.date, date)
            interest = sum((rate * after[i] * n / YEAR for i in joining), Fraction(0))
            for i in joining:
                close.moves[i].capital_paid += after[i]
                close.moves[i].interest_paid += rate * after[i] * n / YEAR
            all_back = sum(back.values(), Fraction(0))
            for i, b in back.items():
                close.moves[i].capital_returned += b
                # The interest on this call goes to the LPs already in, in proportion to what each gets back of it.
                if all_back:
                    close.moves[i].interest_received += interest * b / all_back
            held[c.index] = after
        closes.append(close)
    totals = [Moves() for _ in lps]
    for close in closes:
        for i, m in close.moves.items():
            totals[i].add(m)
    return Equalization(rate, closes, totals)
