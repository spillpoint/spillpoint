"""More than one stable outcome (05c5; Jordan, after #73).

Where more than one outcome is stable, paying holders differently, the
reference stops with a plain message naming the series, warrants and notes
whose choices differ, as the engine does. The tables are two of 05c4's random
ones (reference/tools/random_safes.py, seed 1): two non-participating series at
the same price beside post-money SAFEs, where either one converting is stable.

    python3 -m unittest discover reference/tests
"""

import datetime
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.waterfall import SeveralAnswers, Waterfall  # noqa: E402


def series(sid, name, price):
    return {
        "id": sid, "name": name, "kind": "preferred", "original_issue_price": price, "conversion_price": price,
        "preference_multiple": "1", "participation": "non_participating", "cap_multiple": None, "anti_dilution": "none",
    }


def holders(*pairs):
    return [{"id": i, "name": n} for i, n in pairs]


def safe(fid, holder, amount, cap, discount="0"):
    return {"id": fid, "holder": holder, "purchase_amount": amount, "post_money_cap": cap, "discount": discount}


# random-1-149: Series 0 and Series 1 Preferred, both at $1.00, beside two SAFEs.
RANDOM_1_149 = {
    "holders": holders(
        ("founder_a", "Founder A"), ("founder_b", "Founder B"), ("investor_0", "Investor 0"), ("investor_1", "Investor 1"),
        ("lender_l", "Lender L"), ("safe_holder_0", "SAFE Investor 0"), ("safe_holder_1", "SAFE Investor 1"),
    ),
    "securities": [
        {"id": "common", "name": "Common Stock", "kind": "common"},
        series("series_0", "Series 0 Preferred", "1"),
        series("series_1", "Series 1 Preferred", "1"),
        {"id": "warrants_series_0", "name": "Warrants for series_0", "kind": "warrant", "strike": "0.5", "underlying": "series_0"},
    ],
    "seniority": [["series_0"], ["series_1"]],
    "positions": [
        {"holder": "founder_a", "security": "common", "shares": 5000000},
        {"holder": "founder_b", "security": "common", "shares": 1000000},
        {"holder": "investor_0", "security": "series_0", "shares": 1000000},
        {"holder": "investor_1", "security": "series_1", "shares": 2000000},
        {"holder": "lender_l", "security": "warrants_series_0", "shares": 100000},
    ],
    "unissued_pool": 0,
    "unconverted_safes": [safe("safe_0", "safe_holder_0", "1000000", "8000000"), safe("safe_1", "safe_holder_1", "500000", "8000000", "0.2")],
}

# random-1-185: Series 0 and Series 1 Preferred, both at $0.50, beside three SAFEs and a note; two answers only from
# about $10.10M to $10.14M.
RANDOM_1_185 = {
    "holders": holders(
        ("founder_a", "Founder A"), ("founder_b", "Founder B"), ("investor_0", "Investor 0"), ("investor_1", "Investor 1"),
        ("lender_l", "Lender L"), ("safe_holder_0", "SAFE Investor 0"), ("safe_holder_1", "SAFE Investor 1"),
        ("safe_holder_2", "SAFE Investor 2"), ("note_holder", "Investor N"),
    ),
    "securities": [
        {"id": "common", "name": "Common Stock", "kind": "common"},
        series("series_0", "Series 0 Preferred", "0.5"),
        series("series_1", "Series 1 Preferred", "0.5"),
        {"id": "warrants_series_0", "name": "Warrants for series_0", "kind": "warrant", "strike": "0.25", "underlying": "series_0"},
    ],
    "seniority": [["series_0", "series_1"]],
    "positions": [
        {"holder": "founder_a", "security": "common", "shares": 4000000},
        {"holder": "founder_b", "security": "common", "shares": 2000000},
        {"holder": "investor_0", "security": "series_0", "shares": 8000000},
        {"holder": "investor_1", "security": "series_1", "shares": 2000000},
        {"holder": "lender_l", "security": "warrants_series_0", "shares": 200000},
    ],
    "unissued_pool": 500000,
    "unconverted_safes": [
        safe("safe_0", "safe_holder_0", "250000", "10000000"),
        safe("safe_1", "safe_holder_1", "100000", "4000000"),
        safe("safe_2", "safe_holder_2", "500000", "10000000"),
    ],
    "unconverted_notes": [
        {
            "id": "note_n", "holder": "note_holder", "principal": "500000", "interest_rate": "0.06", "issue_date": "2024-01-01",
            "valuation_cap": "5000000", "conversion_base": "with_pool", "discount": "0", "repayment_multiple": "2",
        }
    ],
}

# random-1-121: Series 0 and Series 1 Preferred, both at $1.00 and pari passu, beside two SAFEs; two answers from
# $12,055,555.56 (05c6).
RANDOM_1_121 = {
    "holders": holders(
        ("founder_a", "Founder A"), ("founder_b", "Founder B"), ("employee_c", "Employee C"), ("investor_0", "Investor 0"),
        ("investor_1", "Investor 1"), ("safe_holder_0", "SAFE Investor 0"), ("safe_holder_1", "SAFE Investor 1"),
    ),
    "securities": [
        {"id": "common", "name": "Common Stock", "kind": "common"},
        {"id": "options_0", "name": "Options ($0 strike)", "kind": "option", "strike": "0"},
        series("series_0", "Series 0 Preferred", "1"),
        series("series_1", "Series 1 Preferred", "1"),
    ],
    "seniority": [["series_0", "series_1"]],
    "positions": [
        {"holder": "founder_a", "security": "common", "shares": 4000000},
        {"holder": "founder_b", "security": "common", "shares": 1000000},
        {"holder": "employee_c", "security": "options_0", "shares": 500000},
        {"holder": "investor_0", "security": "series_0", "shares": 4000000},
        {"holder": "investor_1", "security": "series_1", "shares": 1000000},
    ],
    "unissued_pool": 0,
    "unconverted_safes": [safe("safe_0", "safe_holder_0", "500000", "15000000"), safe("safe_1", "safe_holder_1", "1000000", "10000000")],
}

MESSAGE = (
    "At {at}: Series 0 Preferred and Series 1 Preferred are at the same price, so with the SAFEs outstanding either could "
    "convert here, and the documents don't say which. spillpoint doesn't pick one. Adding a round that converts the SAFEs "
    "avoids this."
)


class TwoAnswers(unittest.TestCase):
    def test_two_series_at_the_same_price_beside_safes(self):
        wf = Waterfall(CapTable.from_json(RANDOM_1_149), None)
        with self.assertRaises(SeveralAnswers) as stop:
            wf.evaluate(F(11047000))
        self.assertEqual(str(stop.exception), MESSAGE.format(at="$11,047,000.00"))

    def test_a_short_stretch_of_two_answers(self):
        wf = Waterfall(CapTable.from_json(RANDOM_1_185), datetime.date(2025, 12, 31))
        with self.assertRaises(SeveralAnswers) as stop:
            wf.evaluate(F(10125000))
        self.assertEqual(str(stop.exception), MESSAGE.format(at="$10,125,000.00"))
        # Outside it, one answer.
        self.assertEqual(len(wf.evaluate(F(10000000))), 1)
        self.assertEqual(len(wf.evaluate(F(10200000))), 1)

    def test_where_the_second_answer_begins(self):
        """The engine's breakpoint search stops here too (05c6): a cent below, one answer; a cent above, two."""
        wf = Waterfall(CapTable.from_json(RANDOM_1_121), None)
        self.assertEqual(len(wf.evaluate(F("12055555.55"))), 1)
        with self.assertRaises(SeveralAnswers) as stop:
            wf.evaluate(F("12055555.57"))
        self.assertEqual(str(stop.exception), MESSAGE.format(at="$12,055,555.57"))


if __name__ == "__main__":
    unittest.main()
