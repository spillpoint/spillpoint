"""A starting cap table (R31, 0.5.0, 05b1): a company's first event can be the cap table it stands at, and later events
build on it as on the table after any other event.

    python3 -m unittest discover reference/tests
"""

import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

CASES = Path(__file__).resolve().parent.parent.parent / "cases"

from spillpoint_ref.rounds import build  # noqa: E402


def round_cases():
    for d in sorted(CASES.iterdir()):
        inputs_path = d / "inputs.json"
        if not inputs_path.exists():
            continue
        inputs = json.loads(inputs_path.read_text())
        if "events" in inputs and not any(e["type"] == "start" for e in inputs["events"]):
            yield d.name, inputs


def issue_order(ct):
    """The order a table's series, SAFEs and notes were issued in, earliest first, as a start event gives it."""
    ids = list(ct.preferred_ids()) + [f["id"] for f in ct.safes] + [n["id"] for n in ct.notes]
    return sorted(ids, key=lambda i: ct.order[i])


def start_from(ct, date, order=True):
    return {"id": "start", "date": date, "type": "start", "cap_table": ct.to_json(), **({"issue_order": issue_order(ct)} if order else {})}


class StartingTable(unittest.TestCase):
    def test_every_round_case_split_at_every_event_rebuilds_its_later_tables(self):
        """The table after event k, given as a starting table with its issue order, plus the events after k, must
        rebuild the case's later tables, and what each round worked out, exactly."""
        splits = 0
        for name, inputs in round_cases():
            events = inputs["events"]
            built = build(inputs)
            for k in range(len(events) - 1):
                start = start_from(built[k][1], events[k].get("date"))
                rebuilt = build({"holders": inputs["holders"], "events": [start] + events[k + 1 :]})
                with self.subTest(case=name, after=events[k]["id"]):
                    self.assertEqual(rebuilt[0][1].to_json(), built[k][1].to_json())
                    for j in range(k + 1, len(events)):
                        self.assertEqual(rebuilt[j - k][1].to_json(), built[j][1].to_json(), events[j]["id"])
                        self.assertEqual(rebuilt[j - k][2], built[j][2], events[j]["id"])
                splits += 1
        self.assertGreater(splits, 100)

    def test_with_no_order_given_its_safes_and_notes_count_as_issued_after_its_series(self):
        """Case 16j's note and SAFE were issued before its Seed, so in the down Series A they count in the Seed's A,
        not against it (R25). Started from the table after the Seed with no order given, they count as issued after
        the Seed, so they count against it, and the Seed's new conversion price differs."""
        inputs = json.loads((CASES / "edge-16j-note-and-safe-from-before-the-seed" / "inputs.json").read_text())
        events = inputs["events"]
        built = build(inputs)
        seed = built[3][1]
        self.assertEqual(issue_order(seed), ["note_n", "safe_s", "seed"])
        with_order = build({"holders": inputs["holders"], "events": [start_from(seed, "2022-06-30")] + events[4:]})
        without = build({"holders": inputs["holders"], "events": [start_from(seed, "2022-06-30", order=False)] + events[4:]})
        cp = lambda ct: ct.securities["seed"]["conversion_price"]
        self.assertEqual(cp(with_order[1][1]), cp(built[4][1]))
        self.assertNotEqual(cp(without[1][1]), cp(built[4][1]))

    def test_a_starting_table_may_not_carry_a_carve_out(self):
        inputs = json.loads((CASES / "edge-16j-note-and-safe-from-before-the-seed" / "inputs.json").read_text())
        start = start_from(build(inputs)[0][1], "2022-01-10")
        start["cap_table"]["carve_out"] = {"timing": "before_preferences", "tiers": [{"from": "0", "to": None, "percent": "5"}], "allocation": [{"holder": "founder_a", "percent": "100"}]}
        with self.assertRaisesRegex(ValueError, "carve-out"):
            build({"holders": inputs["holders"], "events": [start]})

    def test_it_must_come_first_and_name_only_listed_holders(self):
        inputs = json.loads((CASES / "edge-16j-note-and-safe-from-before-the-seed" / "inputs.json").read_text())
        built = build(inputs)
        start = start_from(built[0][1], "2022-01-10")
        with self.assertRaisesRegex(ValueError, "first event"):
            build({"holders": inputs["holders"], "events": [inputs["events"][0], start]})
        with self.assertRaisesRegex(ValueError, "isn't listed in holders"):
            build({"holders": inputs["holders"][1:], "events": [start]})


if __name__ == "__main__":
    unittest.main()
