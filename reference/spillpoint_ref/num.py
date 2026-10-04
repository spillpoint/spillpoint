"""Exact numbers for the reference calculator.

Every money amount, price, and share count is a Fraction. JSON carries exact
values as strings: "5500000", "0.05", or "a/b" when the decimal doesn't
terminate.
"""

from fractions import Fraction
import math


def parse(value):
    """Read a JSON number or string into an exact Fraction."""
    if isinstance(value, bool):
        raise TypeError("booleans are not numbers")
    if isinstance(value, int):
        return Fraction(value)
    if isinstance(value, float):
        raise TypeError("floats are not allowed in case files; use a string")
    return Fraction(value)


def floor(x):
    return math.floor(x)


def _terminates(x):
    d = x.denominator
    for p in (2, 5):
        while d % p == 0:
            d //= p
    return d == 1


def exact(x):
    """Exact string: a plain decimal when it terminates, otherwise 'a/b'."""
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


def decimal(x, places):
    """Round half away from zero to a fixed number of places, as a string."""
    x = Fraction(x)
    sign = "-" if x < 0 else ""
    scaled = abs(x) * 10**places
    n = math.floor(scaled)
    if scaled - n >= Fraction(1, 2):
        n += 1
    if places == 0:
        return f"{sign}{n}"
    digits = str(n).rjust(places + 1, "0")
    out = f"{digits[:-places]}.{digits[-places:]}"
    if n == 0:
        sign = ""
    return f"{sign}{out}"


def money(x):
    """Display to the cent."""
    return decimal(x, 2)


def usd(x):
    """Human-readable dollars for explanations: $1,234,567.89."""
    s = money(x)
    neg = s.startswith("-")
    s = s.lstrip("-")
    whole, cents = s.split(".")
    whole = f"{int(whole):,}"
    return f"{'-' if neg else ''}${whole}.{cents}"


def usd_price(x, places=4):
    return f"${decimal(x, places)}"


def count(x, places=2):
    """Share counts for explanations: 1,169,043 or 6,576,234.36."""
    s = decimal(x, places)
    whole, _, frac = s.partition(".")
    whole = f"{int(whole):,}"
    return whole if not frac or set(frac) == {"0"} else f"{whole}.{frac}"
