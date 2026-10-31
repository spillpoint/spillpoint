"""Management fees (F29, F30), exactly.

A fee is each LP's own, on its own commitment by F22's fee weight (F29). Two
ways a fund's fee calls come in:
- entered as cash flows, as before. An entered fee call before a later close
  was paid by the LPs in at its date (FA21): its rate per unit of fee weight is
  the LPs' part of it (F3) over their fee weights. Every LP's part of it, as if
  in from the start, is that rate times its own fee weight, so in the waterfall
  the call counts at its full size, the joiners' back fees included;
- worked out by a schedule (F30): one call for each calendar period from
  `start` to D's period, in advance, each LP's fee its fee weight times the
  period's fee factor. From 0.6.0 each step has a basis (F39): commitments, as
  before, or net invested capital, worked day by day (F38, deals.py). A day on
  invested capital charges the rate on the LPs' part of that day's net invested
  capital, shared between the LPs by fee weight as a day on commitments is.

Either way a joining LP owes its own part of each fee call before its close,
its back fees, paid to the manager; nothing about fees moves between the LPs
(F29). closes.py takes the back fees from here.
"""

import datetime
from dataclasses import dataclass, field
from fractions import Fraction

from . import deals
from .waterfall import gp_commitment_part

PERIODS = {"quarterly": 4, "semiannual": 2, "annual": 1}  # F30: n periods a year
COMMITMENTS, INVESTED_CAPITAL = "commitments", "invested_capital"  # F39: a step's basis
BASES = (COMMITMENTS, INVESTED_CAPITAL)


@dataclass
class FeeStep:
    rate: Fraction  # the annual rate on its basis
    start: object  # the date it's in force from: the schedule's `start` for the first (F30)
    basis: str = COMMITMENTS  # F39: commitments, the default, or net invested capital


@dataclass
class Schedule:
    """F30: the management fee schedule, as read."""

    start: object
    frequency: str
    steps: list  # FeeStep, in date order
    commitments: Fraction | None  # the fee's base, for a fund that doesn't list its LPs

    @property
    def n(self):
        return PERIODS[self.frequency]

    @property
    def first_rate(self):
        """F30: the schedule's first rate is the fund's: a class's `fee_rate` is against it (F22)."""
        return self.steps[0].rate

    @property
    def charges_commitments(self):
        """F39, F40: a step on commitments, whatever its date, needs `commitments` from a fund that doesn't list its LPs."""
        return any(s.basis == COMMITMENTS for s in self.steps)

    @property
    def charges_invested_capital(self):
        """F39, F40: a step on invested capital, whatever its date, needs the fund's investments (F33)."""
        return any(s.basis == INVESTED_CAPITAL for s in self.steps)


@dataclass
class Period:
    """One of the schedule's fee calls (F30, F31, F39): its date, the days it covers, its fee factor on commitments, and
    its days on invested capital."""

    date: object  # the period's first day, or `start` for the first
    first_day: object  # the first day it covers: `start` for the first, the period's first day otherwise
    last_day: object  # the period's last day
    # F30: the rate in force on each day it covers on commitments, added up, over n times the calendar period's days. A
    # schedule with no step on invested capital has every day here, so this is 0.5.0's fee factor.
    factor: Fraction
    whole: int = 0  # the calendar period's days
    # F39: the days it covers on invested capital at a rate above 0, in runs [first day, last day, rate] of one rate each.
    invested_days: list = field(default_factory=list)
    # F39: those days' rate times the fund's net invested capital that day (F38), added up, over n times the calendar
    # period's days. Whole-fund dollars, the GP commitment's part included; set once the investments are read (invested()).
    on_invested: Fraction = Fraction(0)

    @property
    def nothing_to_call(self):
        """F39: every day it covers at a rate of 0, or on invested capital with nothing invested (FA40, widened)."""
        return self.factor == 0 and self.on_invested == 0


def _period(day, n):
    """F30: the calendar quarter, half-year or year a day is in, as (first day, last day)."""
    months = 12 // n
    first_month = (day.month - 1) // months * months + 1
    first = datetime.date(day.year, first_month, 1)
    next_month = first_month + months
    following = datetime.date(day.year + 1, 1, 1) if next_month > 12 else datetime.date(day.year, next_month, 1)
    return first, following - datetime.timedelta(days=1)


def step_on(schedule, day):
    """F30: the step in force on a day is the last one whose date (`start` for the first) is on or before it. Its rate
    and its basis (F39) are the day's."""
    step = None
    for s in schedule.steps:
        if s.start <= day:
            step = s
    return step


def periods(schedule, d):
    """F30, F39: the schedule's calls to D by date, in date order. One for each period from `start`'s to D's, none dated
    after D (FA39), and none whose every day is at a rate of 0 (FA40): decided by the schedule alone, so they count for
    `no_calls`, `distribution_before_call` and the fund's first call before the investments are read (F39). Each day it
    covers goes by the step in force: on commitments, its rate into the fee factor; on invested capital, the day kept, in
    runs of one rate, for invested() to work once the investments are read. One with nothing to call there isn't a call
    after all."""
    out = []
    first, last = _period(schedule.start, schedule.n)
    covers = schedule.start
    while covers <= d:
        whole = (last - first).days + 1
        day, added, invested_days = covers, Fraction(0), []
        while day <= last:
            step = step_on(schedule, day)
            if step.basis == INVESTED_CAPITAL:
                if step.rate > 0:
                    if invested_days and invested_days[-1][2] == step.rate and invested_days[-1][1] == day - datetime.timedelta(days=1):
                        invested_days[-1][1] = day
                    else:
                        invested_days.append([day, day, step.rate])
            else:
                added += step.rate
            day += datetime.timedelta(days=1)
        if added > 0 or invested_days:
            out.append(Period(covers, covers, last, added / (schedule.n * whole), whole, invested_days))
        first, last = _period(last + datetime.timedelta(days=1), schedule.n)
        covers = first
    return out


def invested(fund, period):
    """F39: a period's days on invested capital, each its rate times the fund's net invested capital that day (F38),
    added up, over n times the calendar period's days. A day after D counts at D's: no check, exit or write-off is after
    D, and X isn't one of them, so X doesn't move the fees."""
    added = Fraction(0)
    for first, last, rate in period.invested_days:
        day = first
        while day <= last:
            added += rate * deals.invested_on(fund, day)
            day += datetime.timedelta(days=1)
    return added / (fund.schedule.n * period.whole)


def per_weight(fund, period):
    """F30, F39: a period's fee on each unit of fee weight, for a fund that lists its LPs. On commitments, the fee factor.
    On invested capital, the LPs' part of it, (1 − g) (F3), shared by the LPs' fee weights over their commitments: so
    each LP pays the rate on its share of invested capital, by commitment, times its class factor."""
    if not period.on_invested:
        return period.factor
    commitments = sum((lp.commitment for lp in fund.lps), Fraction(0))
    return period.factor + (1 - fund.gp_share) * period.on_invested / commitments


def lp_fee(fund, lp, period):
    """F30, F39: an LP's fee for a period: its commitment, times its class factor (its class's fee rate over the
    schedule's first rate, or 1), times the period's fee on each unit of commitment. That's its F22 fee weight times
    per_weight(): its fee weight over all fee weights, times the LPs' fee."""
    return fund.fee_weight(lp) * per_weight(fund, period)


def lps_fee(fund, period):
    """F30, F39: the LPs' fees for a period added up. Without listed LPs, `commitments` times the fee factor, and the LPs'
    part, (1 − g), of the days on invested capital: that last factor is 1 (F39). A schedule wholly on invested capital
    needs no `commitments`, and its fee factor is 0."""
    if fund.lps:
        return sum((lp_fee(fund, lp, period) for lp in fund.lps), Fraction(0))
    out = (1 - fund.gp_share) * period.on_invested
    if period.factor:
        out += fund.schedule.commitments * period.factor
    return out


def call_amount(fund, period):
    """F30: the call is the LPs' fees; when the GP commitment pays fees (F3), that over (1 − g), so it pays g of it."""
    lps = lps_fee(fund, period)
    return lps / (1 - fund.gp_share) if fund.pays_fees else lps


def _weights_in(fund, date):
    return sum((fund.fee_weight(lp) for lp in fund.lps if fund.is_in(lp, date)), Fraction(0))


def _weights_all(fund):
    return sum((fund.fee_weight(lp) for lp in fund.lps), Fraction(0))


def rate_per_weight(fund, call):
    """F29: what a fee call charges each unit of fee weight. A schedule's call: its fee on each unit of fee weight (F30,
    F39). An entered one: the LPs' part of it (F3) over the fee weights of the LPs in at its date (FA21), which F28's
    call_without_payers keeps above 0."""
    if call.scheduled:
        return per_weight(fund, call.period)
    return (call.amount - gp_commitment_part(fund, call.kind, call.amount)) / _weights_in(fund, call.date)


def lps_part(fund, call):
    """F3, F29: the LPs' part of a call as the waterfall counts it, every LP in from the start (F25). An investment or
    expense call, or a fee call with no later close before it, is the call less the GP commitment's part, as before. An
    entered fee call before a later close counts at its full size: its rate per fee weight times every LP's weight, so it
    grows by the joiners' back fees. A schedule's call is every LP's own fee already."""
    part = call.amount - gp_commitment_part(fund, call.kind, call.amount)
    if call.kind != "fee" or call.scheduled or not fund.lps:
        return part
    w_in, w_all = _weights_in(fund, call.date), _weights_all(fund)
    return part if w_in == w_all else part * w_all / w_in


def back_fees(fund, lp, close):
    """F29: a joining LP's own part of each fee call before its close (FA21: a call on its close's date it paid as made),
    as if it had been in from the start, paid at its close to the manager."""
    calls = [f for f in fund.flows if f.type == "call" and f.kind == "fee" and f.date < close]
    return sum((rate_per_weight(fund, c) * fund.fee_weight(lp) for c in calls), Fraction(0))
