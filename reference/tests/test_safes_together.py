"""SAFEs that convert together (E20, rule 2: the most conversions; 05c6, Jordan, after #74).

Where only SAFEs change at a jump, several can convert at once: none of them
would convert alone, but each does once the others convert, because a
post-money SAFE converts into a fixed share of the Liquidity Capitalization and
the others' cash no longer comes off the top. The jump is where the last of
them becomes indifferent with the others already converting, so the reference
places it by flipping each changed SAFE from the outcome above the jump as well
as from the one below. Flipping only from below (one SAFE converting alone, never
indifferent there) found no point, and the search stopped with "cannot place the
jump near ...".

The table is 05c4's random-1-001 (reference/tools/random_safes.py, seed 1)
without its note and options: common and four post-money SAFEs.

    python3 -m unittest discover reference/tests
"""

import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from spillpoint_ref import breakpoints  # noqa: E402
from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.waterfall import Waterfall  # noqa: E402


def safe(fid, holder, amount, cap, discount="0"):
    return {"id": fid, "holder": holder, "purchase_amount": amount, "post_money_cap": cap, "discount": discount}


FOUR_SAFES = {
    "holders": [
        {"id": "founder_a", "name": "Founder A"},
        {"id": "founder_b", "name": "Founder B"},
        {"id": "safe_holder_0", "name": "SAFE Investor 0"},
        {"id": "safe_holder_1", "name": "SAFE Investor 1"},
        {"id": "safe_holder_2", "name": "SAFE Investor 2"},
        {"id": "safe_holder_3", "name": "SAFE Investor 3"},
    ],
    "securities": [{"id": "common", "name": "Common Stock", "kind": "common"}],
    "seniority": [],
    "positions": [
        {"holder": "founder_a", "security": "common", "shares": 5000000},
        {"holder": "founder_b", "security": "common", "shares": 1000000},
    ],
    "unissued_pool": 0,
    "unconverted_safes": [
        safe("safe_0", "safe_holder_0", "250000", "8000000"),
        safe("safe_1", "safe_holder_1", "250000", "8000000"),
        safe("safe_2", "safe_holder_2", "100000", "20000000"),
        safe("safe_3", "safe_holder_3", "500000", "6000000", "0.2"),
    ],
}


class SafesTogether(unittest.TestCase):
    def test_two_safes_converting_together_place_their_jump(self):
        """Above $6.6M SAFE 3 has converted: 1/12 of what is left after $600,000 of cash. SAFEs 0 and 1 each convert
        into 3.125% (their $250,000 over the $8M cap) once both convert, with SAFE 2's $100,000 still cash:
        3.125% x ($8,100,000 - $100,000) = $250,000, so they convert together at $8.1M. Alone, either would get 3.125% x
        ($8,100,000 - $350,000) = $242,187.50, less than its cash."""
        wf = Waterfall(CapTable.from_json(FOUR_SAFES), None)
        found = breakpoints.find(wf, 0, 12000000, 200000)
        self.assertEqual([(x, jumps) for x, _, _, jumps in found], [(1100000, False), (6600000, False), (8100000, True)])

        x, sl, sr, jumps = found[-1]
        switches = [r for r in breakpoints.reasons(wf, x, sl, sr, jumps) if r["code"] == "safe_switches"]
        self.assertEqual([r["security"] for r in switches], ["safe_0", "safe_1"])
        self.assertIn("It converts together with SAFE Investor 1's SAFE. On its own, converting would pay it only "
                      "$242,187.50 here, less than its cash", switches[0]["text"])

        # SAFE 3 jumps from 1/12 of $7,500,000 to 1/12 of $8,000,000, and common down from $6,875,000.
        below, above = wf.evaluate(x)[0]["totals"], wf.evaluate(x + F(1, 100))[0]["totals"]
        self.assertEqual(below["safe_3"], 625000)
        self.assertEqual(below["common"], 6875000)
        self.assertEqual(round(float(above["safe_3"]), 2), 666666.67)
        self.assertEqual(round(float(above["common"]), 2), 6833333.34)
        self.assertEqual(above["safe_0"], F(1, 32) * (x + F(1, 100) - 100000))


if __name__ == "__main__":
    unittest.main()
