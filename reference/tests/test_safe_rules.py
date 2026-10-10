"""Two rules for SAFEs at a sale (Jordan, after #71; cases 12k and 12l, 05c3).

Rule 2, in E20: SAFEs that could settle more than one way, each converting only because the others do, take the most
conversions. Rule 3, in X1: shares from a warrant exercised into a series that keeps its preference are left out of a
post-money SAFE's Liquidity Capitalization, like the series' other shares.

    python3 -m unittest discover reference/tests
"""

import json
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

CASES = Path(__file__).resolve().parent.parent.parent / "cases"

from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.waterfall import Waterfall, _AtExit, _flip  # noqa: E402


def case_waterfall(name):
    table = json.loads((CASES / name / "inputs.json").read_text())["exit"]["cap_table"]
    return Waterfall(CapTable.from_json(table), None)


def chosen(wf, outcome):
    return [p for p, on in zip(wf.players, outcome["decisions"]) if on]


class MostConversions(unittest.TestCase):
    """12k: two equal SAFEs, $500,000 each at a $5M post-money cap, beside 10,000,000 common."""

    def test_both_convert_inside_the_range_where_both_taking_cash_is_stable_too(self):
        wf = case_waterfall("edge-12k-two-equal-safes")
        x = F(5250000)
        at = _AtExit(wf, x)
        cash = at.settle(tuple(False for _ in wf.players))
        self.assertTrue(all(at.safe_settled(cash, i) for i in at.safes), "both taking cash is stable")
        (outcome,) = wf.evaluate(x)
        self.assertEqual(chosen(wf, outcome), ["safe_x", "safe_y"])
        self.assertEqual(outcome["totals"]["safe_x"], 525000)
        # Converting alone pays less than cash until $5.5M: a tenth of what the other's cash leaves.
        alone = at.settle(_flip(cash, wf.players.index("safe_x")))
        self.assertEqual(at.value(alone, wf.players.index("safe_x")), F(475000))

    def test_at_5m_each_is_indifferent_so_both_take_cash_and_payouts_bend(self):
        wf = case_waterfall("edge-12k-two-equal-safes")
        (outcome,) = wf.evaluate(F(5000000))
        self.assertEqual(chosen(wf, outcome), [])
        self.assertEqual(outcome["totals"]["safe_x"], 500000)


class WarrantSharesKeepingThePreference(unittest.TestCase):
    """12l: case 8's warrant for 200,000 Seed at $0.50, below the Seed's $1.00 preference, beside a post-money SAFE."""

    def test_the_count_leaves_out_warrant_shares_exercised_into_a_seed_keeping_its_preference(self):
        wf = case_waterfall("edge-12l-warrant-below-preference-beside-a-safe")
        (f,) = wf.safes
        keeps = {"seed": False}
        self.assertEqual(wf.liquidity_capitalization(f, keeps, [f], (), ["warrant_seed"]), F(8000000) / F("0.9"))
        # Not exercised, the warrant is an outstanding Option, counted (R29).
        self.assertEqual(wf.liquidity_capitalization(f, keeps, [f], (), []), F(8200000) / F("0.9"))
        # Converted, the Seed and the warrant's shares are both counted.
        self.assertEqual(wf.liquidity_capitalization(f, {"seed": True}, [f], (), ["warrant_seed"]), F(10200000) / F("0.9"))

    def test_at_7m_the_safe_takes_cash_where_counting_the_warrant_would_convert_it(self):
        wf = case_waterfall("edge-12l-warrant-below-preference-beside-a-safe")
        (outcome,) = wf.evaluate(F(7000000))
        self.assertEqual(chosen(wf, outcome), ["warrant_seed"])
        self.assertEqual(outcome["totals"]["safe_s"], 500000)
        # Converting, it would get a tenth of the $4,900,000 left after the Seed's $2,200,000: $490,000.
        at = _AtExit(wf, F(7000000))
        bits = _flip(outcome["decisions"], wf.players.index("safe_s"))
        self.assertEqual(at.value(at.settle(bits), wf.players.index("safe_s")), F(490000))


if __name__ == "__main__":
    unittest.main()
