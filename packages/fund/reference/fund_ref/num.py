"""Exact numbers and dates for the fund reference (F17).

Every amount, rate and multiple is a Fraction. Case files carry exact values as
strings: "5000000", "0.08", or "a/b" when the decimal doesn't terminate (FC1).
This file is the fund reference's own; it doesn't import spillpoint's reference/.
"""

import datetime
import math
import re
from fractions import Fraction

_EXACT = re.compile(r"^-?(\d+|\d+\.\d+|\d+/\d+)$")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_exact(value):
    """An exact string as a Fraction, or None if it isn't one (F18, bad_number).

    A JSON number is not an exact string: 5000 is refused, "5000" is read.
    """
    if not isinstance(value, str) or not _EXACT.match(value):
        return None
    if "/" in value:
        num, den = value.split("/")
        if int(den) == 0:
            return None
    return Fraction(value)


def parse_date(value):
    """An ISO date, YYYY-MM-DD, that exists on the calendar, or None (F18, bad_date)."""
    if not isinstance(value, str) or not _DATE.match(value):
        return None
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        return None


def days(start, end):
    """Whole days from start to end, leap days included (Actual/365's numerator, F6, F17)."""
    return (end - start).days


def _terminates(x):
    d = x.denominator
    for p in (2, 5):
        while d % p == 0:
            d //= p
    return d == 1


def exact(x):
    """Exact string: a plain decimal when it terminates, otherwise 'a/b' (FC1)."""
    x = Fraction(x)
    if x.denominator == 1:
        return str(x.numerator)
    if _terminates(x):
        sign = "-" if x < 0 else ""
        x = abs(x)
        places = 0
        while (x * 10**places).denominator != 1:
            places += 1
        digits = str((x * 10**places).numerator).rjust(places + 1, "0")
        return f"{sign}{digits[:-places]}.{digits[-places:]}"
    return f"{x.numerator}/{x.denominator}"


def money(x):
    """To the cent, half away from zero, as spillpoint's cases show amounts (F17)."""
    x = Fraction(x)
    sign = "-" if x < 0 else ""
    scaled = abs(x) * 100
    n = math.floor(scaled)
    if scaled - n >= Fraction(1, 2):
        n += 1
    if n == 0:
        sign = ""
    digits = str(n).rjust(3, "0")
    return f"{sign}{digits[:-2]}.{digits[-2:]}"


def usd(x):
    """Dollars for a reason's text (FC6): "$10,890,000" when the cents are zero, "$4,004,383.56" when not."""
    whole, cents = money(x).split(".")
    text = f"${int(whole):,}"
    return text if cents == "00" else f"{text}.{cents}"


def percent(rate):
    """A rate as a reason's text gives it: 0.08 → "8%", 0.075 → "7.5%"."""
    return f"{exact(Fraction(rate) * 100)}%"


def multiple(m):
    """An LP multiple as a reason's text gives it: 3 → "3.0x", 2.25 → "2.25x"."""
    s = exact(m)
    if "/" in s:
        return f"{s}x"
    return f"{s}.0x" if "." not in s else f"{s}x"
