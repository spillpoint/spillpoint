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
  period's fee factor.

Either way a joining LP owes its own part of each fee call before its close,
its back fees, paid to the manager; nothing about fees moves between the LPs
(F29). closes.py takes the back fees from here.
"""

import datetime
from dataclasses import dataclass
from fractions import Fraction

from .waterfall import gp_commitment_part

PERIODS = {"quarterly": 4, "semiannual": 2, "annual": 1}  # F30: n periods a year


@dataclass
class FeeStep:
    rate: Fraction  # the annual rate on commitments
    start: object  # the date it's in force from: the schedule's `start` for the first (F30)


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


@dataclass
class Period:
    """One of the schedule's fee calls (F30, F31): its date, the days it covers, and its fee factor."""

    date: object  # the period's first day, or `start` for the first
    first_day: object  # the first day it covers: `start` for the first, the period's first day otherwise
    last_day: object  # the period's last day
    factor: Fraction  # the rate in force on each day it covers, added up, over n times the calendar period's days


def _period(day, n):
    """F30: the calendar quarter, half-year or year a day is in, as (first day, last day)."""
    months = 12 // n
    first_month = (day.month - 1) // months * months + 1
    first = datetime.date(day.year, first_month, 1)
    next_month = first_month + months
    following = datetime.date(day.year + 1, 1, 1) if next_month > 12 else datetime.date(day.year, next_month, 1)
    return first, following - datetime.timedelta(days=1)


def rate_on(schedule, day):
    """F30: the rate in force on a day is the last step whose date (`start` for the first) is on or before it."""
    rate = None
    for step in schedule.steps:
        if step.start <= day:
            rate = step.rate
    return rate


def periods(schedule, d):
    """F30: the schedule's calls to D, in date order. One for each period from `start`'s to D's, none dated after D
    (FA39); a period whose fee factor is 0, every day of it at a rate of 0, isn't a call (FA40)."""
    out = []
    first, last = _period(schedule.start, schedule.n)
    covers = schedule.start
    while covers <= d:
        whole = (last - first).days + 1
        day, added = covers, Fraction(0)
        while day <= last:
            added += rate_on(schedule, day)
            day += datetime.timedelta(days=1)
        factor = added / (schedule.n * whole)
        if factor > 0:
            out.append(Period(covers, covers, last, factor))
        first, last = _period(last + datetime.timedelta(days=1), schedule.n)
        covers = first
    return out


def lp_fee(fund, lp, factor):
    """F30: an LP's fee for a period: its commitment, times its class factor (its class's fee rate over the schedule's
    first rate, or 1), times the period's fee factor. That's its F22 fee weight times the fee factor."""
    return fund.fee_weight(lp) * factor


def lps_fee(fund, factor):
    """F30: the LPs' fees for a period added up; without listed LPs, `commitments` times the fee factor."""
    if fund.lps:
        return sum((lp_fee(fund, lp, factor) for lp in fund.lps), Fraction(0))
    return fund.schedule.commitments * factor


def call_amount(fund, factor):
    """F30: the call is the LPs' fees; when the GP commitment pays fees (F3), that over (1 − g), so it pays g of it."""
    lps = lps_fee(fund, factor)
    return lps / (1 - fund.gp_share) if fund.pays_fees else lps


def _weights_in(fund, date):
    return sum((fund.fee_weight(lp) for lp in fund.lps if fund.is_in(lp, date)), Fraction(0))


def _weights_all(fund):
    return sum((fund.fee_weight(lp) for lp in fund.lps), Fraction(0))


def rate_per_weight(fund, call):
    """F29: what a fee call charges each unit of fee weight. A schedule's call: its fee factor (F30). An entered one: the
    LPs' part of it (F3) over the fee weights of the LPs in at its date (FA21), which F28's call_without_payers keeps
    above 0."""
    if call.scheduled:
        return call.factor
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
