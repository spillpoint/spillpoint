"""The SAFEs' greater-of comes last (E20; 0.5.0, 05c1): the series, warrants and notes find their stable answer among
themselves, each weighing its outcomes with the SAFEs paid as their text pays them given those decisions, and the
SAFEs then take the greater of their two amounts.

Under the old rule, where every decision was weighed at once, Larkspur's non-participating Seed and its two
post-money SAFEs went round in a circle near the Seed's conversion: no decision set was stable.

    python3 -m unittest discover reference/tests
"""

import copy
import json
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

CASES = Path(__file__).resolve().parent.parent.parent / "cases"

from spillpoint_ref.model import CapTable  # noqa: E402
from spillpoint_ref.waterfall import Waterfall, _AtExit, _flip  # noqa: E402


def larkspur_safes_only():
    """Edge case 12j: Larkspur's table without its note."""
    table = json.loads((CASES / "edge-12j-larkspur-safes-at-a-sale" / "inputs.json").read_text())["exit"]["cap_table"]
    return Waterfall(CapTable.from_json(table), None)


class SafesLast(unittest.TestCase):
    def test_the_seed_keeps_its_preference_through_the_old_cycle(self):
        """At $16,545,000, where no decision set was stable, the Seed keeps its $2,925,000 preference: converting, with
        the SAFEs following into their Conversion Amounts, would pay it $2,921,654.22 (Jordan's check)."""
        wf = larkspur_safes_only()
        x = F(16545000)
        at = _AtExit(wf, x)
        outcomes = wf.evaluate(x)
        self.assertEqual(len(outcomes), 1)
        bits = outcomes[0]["decisions"]
        seed = wf.players.index("cls-seed")
        self.assertFalse(bits[seed])
        self.assertEqual(wf.player_value(outcomes[0]["totals"], "cls-seed"), 2925000)
        converted = at.follow(_flip(bits, seed))
        self.assertEqual([wf.players[i] for i in at.safes if converted[i]], ["safe-x1", "safe-s3"])
        self.assertEqual(round(float(at.value(converted, seed)), 2), 2921654.22)

    def test_safes_that_convert_only_because_the_others_do_take_cash(self):
        """With the Seed and Series A both converted at $12M, the two equal SAFEs could both take cash, $250,000 each,
        or both convert, $252,449 each: converting alone pays less. They take the fewest conversions (E5), the
        outcome from below, since none gains by converting alone."""
        wf = larkspur_safes_only()
        at = _AtExit(wf, F(12000000))
        bits = [False] * len(wf.players)
        for p in ("cls-seed", "cls-series-a"):
            bits[wf.players.index(p)] = True
        settled = at.follow(tuple(bits))
        self.assertEqual([wf.players[i] for i in at.safes if settled[i]], [])
        both = list(settled)
        for i in at.safes:
            both[i] = True
        both = at.settle(tuple(both))
        self.assertTrue(all(at.safe_settled(both, i) for i in at.safes), "both converting is stable too")

    def test_every_sale_value_has_an_answer_where_the_old_rule_had_none(self):
        """The old cycle ran from about $16,531,250 to $16,556,250 without the note, and $16,887,500 to $16,925,000
        with it (edge case 13j); each point now has one stable outcome."""
        wf = larkspur_safes_only()
        for x in range(16_500_000, 16_600_001, 12_500):
            with self.subTest(x=x):
                self.assertEqual(len(wf.evaluate(F(x))), 1)
        table = json.loads((CASES / "edge-13j-larkspur-at-a-sale" / "inputs.json").read_text())["exit"]["cap_table"]
        import datetime

        with_note = Waterfall(CapTable.from_json(table), datetime.date(2025, 12, 31))
        for x in range(16_875_000, 16_950_001, 12_500):
            with self.subTest(x=x, note=True):
                self.assertEqual(len(with_note.evaluate(F(x))), 1)

    def test_a_series_indifferent_where_its_choice_moves_the_safes_keeps_its_preference(self):
        """At the jump, $16,559,391.30 in 12j, the Seed is indifferent, but converting would move the SAFEs into their
        Conversion Amounts: it keeps its preference there, so the outcome from below holds (E20, as X16 and E13)."""
        wf = larkspur_safes_only()
        expected = json.loads((CASES / "edge-12j-larkspur-safes-at-a-sale" / "expected.json").read_text())["exit"]
        jump = next(b for b in expected["breakpoints"] if b.get("payouts_jump"))
        n, d = (jump["exact"].split("/") + ["1"])[:2]
        outcomes = wf.evaluate(F(int(n), int(d)))
        self.assertEqual(len(outcomes), 1)
        self.assertFalse(outcomes[0]["decisions"][wf.players.index("cls-seed")])


if __name__ == "__main__":
    unittest.main()
