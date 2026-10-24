"""Hand-checkable tests for the fund reference.

Each test uses numbers small enough to check on paper, with the working in the
comments. The spec's worked examples A, B and C are here too, to the cent.

    python3 -m unittest discover packages/fund/reference/tests
"""

import copy
import datetime
import json
import random
import sys
import unittest
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
CASES = Path(__file__).resolve().parents[2] / "cases"

from fund_ref import breakpoints  # noqa: E402
from fund_ref.accounts import Model  # noqa: E402
from fund_ref.case import apply_change, run_case  # noqa: E402
from fund_ref.closes import equalization  # noqa: E402
from fund_ref.inputs import Refusal, read  # noqa: E402
from fund_ref.lps import each_lp, shares  # noqa: E402
from fund_ref.num import days, exact, money, multiple, percent, usd  # noqa: E402
from fund_ref.waterfall import Waterfall  # noqa: E402


def call(date, amount, kind="investment"):
    return {"date": date, "type": "call", "kind": kind, "amount": amount}


def dist(date, amount):
    return {"date": date, "type": "distribution", "amount": amount}


def fund(terms, flows, as_of, **more):
    return Waterfall(read({"as_of": as_of, "terms": terms, "cash_flows": flows, **more}))


def codes(found):
    return [(money(x), [r["code"] for r in rs]) for x, rs in found]


EXAMPLE_A = {
    "terms": {
        "carry": {"steps": [{"rate": "0.20"}, {"rate": "0.25", "from_lp_multiple": "3"}]},
        "gp_commitment": {"share": "0.01"},
    },
    "flows": [
        call("2021-01-15", "8000000"),
        call("2021-01-15", "495000", "fee"),
        call("2022-01-15", "495000", "fee"),
        call("2022-06-01", "2000000"),
        dist("2024-05-01", "4000000"),
    ],
    "as_of": "2026-09-30",
}

EXAMPLE_B = {
    "terms": {"carry": "0.20", "pref": {"rate": "0.08"}, "catch_up": {"gp_share": "1"}},
    "flows": [call("2020-01-01", "10000000")],
    "as_of": "2025-01-01",
}

EXAMPLE_C = {
    "terms": {"carry": "0.20"},
    "flows": [call("2020-03-01", "10000000"), dist("2022-03-01", "15000000"), call("2023-03-01", "2000000")],
    "as_of": "2025-03-01",
}


class Numbers(unittest.TestCase):
    def test_money_rounds_half_away_from_zero(self):
        self.assertEqual(money(F(4004383561643, 1000000)), "4004383.56")
        self.assertEqual(money(F(5, 1000)), "0.01")
        self.assertEqual(money(0), "0.00")

    def test_reason_wording(self):
        # FC6: whole dollars without cents, otherwise to the cent; rates as percents; multiples to one place at least.
        self.assertEqual(usd(10890000), "$10,890,000")
        self.assertEqual(usd(F(292320000, 73)), "$4,004,383.56")
        self.assertEqual(percent(F(8, 100)), "8%")
        self.assertEqual(percent(F(75, 1000)), "7.5%")
        self.assertEqual(multiple(3), "3.0x")
        self.assertEqual(multiple(F(9, 4)), "2.25x")
        self.assertEqual(exact(F(1, 3)), "1/3")

    def test_whole_days_with_leap_days(self):
        # F6, F17: 2020 and 2024 are leap years. 366 + 365 + 365 + 365 + 366 = 1,827.
        self.assertEqual(days(datetime.date(2020, 1, 1), datetime.date(2025, 1, 1)), 1827)
        self.assertEqual(days(datetime.date(2023, 7, 1), datetime.date(2024, 7, 1)), 366)


class GpCommitment(unittest.TestCase):
    """F3: fee-free by default, paying its share of investment and expense calls."""

    flows = [call("2021-01-01", "1000"), call("2021-01-01", "100", "fee"), call("2021-01-01", "50", "expense")]

    def paid_in(self, gp):
        wf = fund({"gp_commitment": gp}, self.flows, "2022-01-01")
        return wf.before.lps_paid_in, wf.before.gp_commitment_paid_in

    def test_defaults(self):
        # 10% of 1,000 and of 50: 105. LPs: 900 + 100 + 45 = 1,045.
        self.assertEqual(self.paid_in({"share": "0.1"}), (1045, 105))

    def test_pays_fees_and_not_expenses(self):
        # 10% of 1,000 and of 100: 110. LPs: 900 + 90 + 50 = 1,040.
        self.assertEqual(self.paid_in({"share": "0.1", "pays_fees": True, "pays_expenses": False}), (1040, 110))

    def test_gets_its_share_of_every_distribution_outside_the_tiers(self):
        # X = 2,000: 200 to the GP commitment, 1,800 down the tiers: 1,045 capital, then 755 at 80/20.
        out = fund({"gp_commitment": {"share": "0.1"}}, self.flows, "2022-01-01").evaluate(2000)
        self.assertEqual(out.this.gp_commitment, 200)
        self.assertEqual(out.this.lp_capital, 1045)
        self.assertEqual(out.this.gp_carry, [F(151)])


class SpecExamples(unittest.TestCase):
    def test_a_the_vc_default(self):
        wf = fund(**EXAMPLE_A)
        # The earlier $4,000,000: $40,000 to the GP commitment, $3,960,000 to LPs as capital.
        self.assertEqual(wf.before.to_date.gp_commitment, 40000)
        self.assertEqual(wf.before.to_date.lp_capital, 3960000)
        self.assertEqual(wf.before.lps_paid_in, 10890000)
        self.assertEqual(codes(breakpoints.find(wf)), [("7000000.00", ["capital_returned"]), ("34500000.00", ["carry_step"])])
        out = wf.evaluate(34500000)
        self.assertEqual(out.this.gp_carry, [F(5445000), F(0)])
        self.assertEqual(out.this.gp_commitment, 345000)
        self.assertEqual(out.ledger.to_date.lps, 3 * 10890000)
        # Above $34,500,000: 75% LPs, 25% carry, of the 99% that runs the tiers.
        above = wf.evaluate(34600000)
        self.assertEqual(above.this.gp_carry[1], F(100000) * F(99, 100) * F(1, 4))

    def test_a_reasons_read_as_the_spec_words_them(self):
        found = dict(breakpoints.find(fund(**EXAMPLE_A)))
        self.assertEqual(found[F(7000000)][0]["text"], "LPs have their $10,890,000 of paid-in capital back")
        self.assertEqual(found[F(34500000)][0]["text"], "LPs reach 3.0x: carry is 25% from here")

    def test_b_a_pref_and_full_catch_up(self):
        wf = fund(**EXAMPLE_B)
        # 1,827 days: 10,000,000 × 8% × 1,827 / 365 = 4,004,383.56.
        self.assertEqual(money(wf.before.pref_accrued), "4004383.56")
        found = breakpoints.find(wf)
        self.assertEqual(
            [(money(x), rs[0]["code"]) for x, rs in found],
            [("10000000.00", "capital_returned"), ("14004383.56", "pref_met"), ("15005479.45", "catch_up_done")],
        )
        out = wf.evaluate(found[2][0])
        self.assertEqual(money(out.this.gp_catch_up), "1001095.89")  # 20% of 5,005,479.45 of profit
        self.assertEqual(found[1][1][0]["text"], "LPs have their 8% pref, $4,004,383.56")
        self.assertEqual(found[2][1][0]["text"], "the GP has 20% of the profit")

    def test_b_as_a_hard_hurdle(self):
        terms = dict(EXAMPLE_B["terms"])
        del terms["catch_up"]
        wf = fund(terms, EXAMPLE_B["flows"], EXAMPLE_B["as_of"])
        found = breakpoints.find(wf)
        # F15: both tiers are all to LPs, but each ends, so each is a breakpoint.
        self.assertEqual(codes(found), [("10000000.00", ["capital_returned"]), ("14004383.56", ["pref_met"])])
        # 80/20 from there: $1,000 more gives the GP $200.
        self.assertEqual(wf.evaluate(found[1][0] + 1000).this.gp_carry, [F(200)])

    def test_c_a_clawback(self):
        wf = fund(**EXAMPLE_C, final=True)
        # Paid $1,000,000 of carry on $5,000,000 of profit; total profit is $3,000,000 + X.
        for x, entitled, owed in [(0, 600000, 400000), (1000000, 800000, 200000), (2000000, 1000000, 0), (3000000, 1200000, 0)]:
            out = wf.evaluate(x)
            self.assertEqual((out.entitlement, out.clawback), (entitled, owed), x)
        # Capital returned and clawback cleared together.
        self.assertEqual(codes(breakpoints.find(wf)), [("2000000.00", ["capital_returned", "clawback_cleared"])])


class Pref(unittest.TestCase):
    def test_accrues_on_a_balance_that_falls(self):
        # 10% on 1,000 for 2021 is 100. The 2022-01-01 distribution of 400 is all capital (F5 before F6), so 600 is
        # unreturned through 2022: 60 more. Pref to D: 160, of which none is paid.
        wf = fund({"pref": {"rate": "0.1"}}, [call("2021-01-01", "1000"), dist("2022-01-01", "400")], "2023-01-01")
        self.assertEqual(wf.before.pref_accrued, 160)
        self.assertEqual(codes(breakpoints.find(wf)), [("600.00", ["capital_returned"]), ("760.00", ["pref_met"])])

    def test_capital_called_on_d_accrues_none(self):
        # F4: calls come first on D, and X returns them the same day.
        wf = fund({"pref": {"rate": "0.1"}}, [call("2021-01-01", "1000"), call("2022-01-01", "500")], "2022-01-01")
        self.assertEqual(wf.before.pref_accrued, 100)
        self.assertEqual(wf.before.lps_paid_in, 1500)

    def test_hurdle_balance_never_below_zero(self):
        # F12: 1,000 called, 3,000 back after a year, 500 called the next year. The hurdle balance is 1,000 for the
        # first year and max(0, 1,500 − 3,000) = 0 after, so the run on the totals has 100 of pref, not 150.
        terms = {"pref": {"rate": "0.1"}}
        flows = [call("2020-01-01", "1000"), dist("2021-01-01", "3000"), call("2022-01-01", "500")]
        wf = fund(terms, flows, "2023-01-01", final=True)
        # 2020 has 366 days: 10% × 1,000 × 366 / 365.
        self.assertEqual(wf.before.hurdle_pref, F(100 * 366, 365))
        # The running pref adds 10% × 500 for 2022.
        self.assertEqual(wf.before.pref_accrued, F(100 * 366, 365) + 50)


class Steps(unittest.TestCase):
    terms = {"carry": {"steps": [{"rate": "0.2"}, {"rate": "0.3", "from_lp_multiple": "2"}]}}

    def test_a_step_applies_only_above_its_threshold(self):
        # F11: 100 called. 20% until LPs have 200: they keep 80 of each 100, so 125 more after capital. Then 30%.
        wf = fund(self.terms, [call("2021-01-01", "100")], "2022-01-01")
        self.assertEqual(codes(breakpoints.find(wf)), [("100.00", ["capital_returned"]), ("225.00", ["carry_step"])])
        self.assertEqual(wf.evaluate(325).this.gp_carry, [F(25), F(30)])

    def test_carry_starts_at_the_step_the_lps_are_already_past(self):
        # 100 called, 300 back: capital 100, 125 at 20% (GP 25), 75 at 30% (GP 22.5). LPs have 252.5.
        # Then 20 more called: LPs are at 252.5 / 120, past 2x, so after X's 20 of capital the carry tier is at 30%.
        wf = fund(self.terms, [call("2020-01-01", "100"), dist("2021-01-01", "300"), call("2022-01-01", "20")], "2023-01-01")
        self.assertEqual(wf.before.to_date.lps, F(505, 2))
        self.assertEqual(codes(breakpoints.find(wf)), [("20.00", ["capital_returned"])])
        self.assertEqual(wf.evaluate(120).this.gp_carry, [F(0), F(30)])

    def test_a_late_call_leaves_a_clawback_more_distributions_never_clear(self):
        # F12's last paragraph, in case 13's shape at a tenth of a millionth: it holds at 0.65625 for good.
        flows = [call("2020-01-01", "10"), dist("2022-01-01", "30"), call("2023-01-01", "10")]
        wf = fund(self.terms, flows, "2025-01-01", final=True)
        self.assertEqual([wf.evaluate(x).clawback for x in (0, 10, 15, F(255, 16), 100)], [F(11, 4), F(3, 4), F(3, 4), F(21, 32), F(21, 32)])
        found = breakpoints.find(wf)
        self.assertEqual(
            [(exact(x), [(r["code"], r.get("change")) for r in rs]) for x, rs in found],
            [
                ("10", [("capital_returned", None), ("clawback_changes", "stops_falling")]),
                ("15", [("clawback_changes", "starts_to_fall")]),
                ("15.9375", [("carry_step", None), ("clawback_changes", "stops_falling")]),
            ],
        )
        self.assertEqual(found[1][1][0]["fund_totals"], "carry_step")
        self.assertEqual(
            found[1][1][0]["text"], "the clawback owed starts to fall: on the fund's totals, LPs reach 2.0x: carry is 30% from here"
        )


class Nav(unittest.TestCase):
    def test_the_nav_point_is_final(self):
        # F14: the NAV point reports the clawback even when X isn't final; the other points don't.
        case = {
            "case": "nav",
            "xs": ["1"],
            "fund": {"as_of": "2025-03-01", "terms": {"carry": "0.2"}, "cash_flows": EXAMPLE_C["flows"], "nav": "1000000"},
        }
        points = {p["x"]: p for p in run_case(case)["points"]}
        self.assertNotIn("clawback", points["1.00"])
        self.assertEqual(points["1000000.00"]["clawback"], {"carry_paid": "1000000.00", "entitlement": "800000.00", "owed": "200000.00"})
        self.assertEqual(points["1000000.00"]["tags"], ["nav"])


BASE = {"as_of": "2025-01-01", "terms": EXAMPLE_B["terms"], "cash_flows": EXAMPLE_B["flows"]}


class Refusals(unittest.TestCase):
    """F18 beyond the fixtures in packages/fund/cases/fund-14-refused."""

    def refused(self, change):
        with self.assertRaises(Refusal) as ctx:
            read(apply_change(BASE, change))
        return (ctx.exception.kind, ctx.exception.term, ctx.exception.path)

    def test_input_fields(self):
        self.assertEqual(self.refused({"set": {"currency": "USD"}}), ("input", "unknown_field", "currency"))
        self.assertEqual(self.refused({"del": "as_of"}), ("input", "missing_field", "as_of"))
        self.assertEqual(self.refused({"set": {"final": "yes"}}), ("input", "bad_field", "final"))
        self.assertEqual(self.refused({"set": {"distribution_date": "2025-13-01"}}), ("input", "bad_date", "distribution_date"))
        self.assertEqual(self.refused({"set": {"nav": "-1"}}), ("input", "bad_number", "nav"))
        self.assertEqual(self.refused({"set": {"cash_flows[0].amount": "0"}}), ("input", "bad_number", "cash_flows[0].amount"))
        self.assertEqual(self.refused({"set": {"cash_flows[0].type": "transfer"}}), ("input", "bad_field", "cash_flows[0].type"))
        self.assertEqual(self.refused({"del": "cash_flows[0].kind"}), ("input", "missing_field", "cash_flows[0].kind"))

    def test_terms(self):
        self.assertEqual(self.refused({"set": {"terms.pref.rate": "0"}}), ("input", "bad_number", "terms.pref.rate"))
        self.assertEqual(self.refused({"set": {"terms.catch_up.gp_share": "1.5"}}), ("input", "bad_number", "terms.catch_up.gp_share"))
        self.assertEqual(self.refused({"set": {"terms.carry": "-0.1"}}), ("input", "bad_number", "terms.carry"))
        self.assertEqual(self.refused({"set": {"terms.carry": None}}), ("input", "bad_number", "terms.carry"))
        first_with_multiple = {"steps": [{"rate": "0.2", "from_lp_multiple": "2"}]}
        self.assertEqual(self.refused({"set": {"terms.carry": first_with_multiple}}), ("input", "steps_out_of_order", "terms.carry.steps[0]"))
        missing_multiple = {"steps": [{"rate": "0.2"}, {"rate": "0.3"}]}
        self.assertEqual(
            self.refused({"set": {"terms.carry": missing_multiple}}), ("input", "missing_field", "terms.carry.steps[1].from_lp_multiple")
        )
        self.assertEqual(self.refused({"set": {"terms.gp_commitment": {"share": "0.01", "pays_fees": 1}}}), ("input", "bad_field", "terms.gp_commitment.pays_fees"))

    def test_unsupported_inside_a_term_and_before_anything_else(self):
        self.assertEqual(self.refused({"set": {"terms.catch_up.lookback": "1"}}), ("unsupported", "lookback", "terms.catch_up.lookback"))
        # FA2: unsupported first, even with an input problem earlier in the file.
        self.assertEqual(self.refused({"set": {"as_of": "soon", "terms.american": True}}), ("unsupported", "american", "terms.american"))

    def test_what_is_read(self):
        # Simple compounding is the default, and null is the same as leaving an optional term out (FA3).
        read(apply_change(BASE, {"set": {"terms.pref.compounding": "simple"}}))
        f = read(apply_change(BASE, {"set": {"terms.gp_commitment": None, "nav": None}, "del": "terms.catch_up"}))
        self.assertEqual((f.has_gp_commitment, f.nav, f.catch_up), (False, None, None))
        self.assertEqual(read({"as_of": "2025-01-01", "terms": {}, "cash_flows": EXAMPLE_B["flows"]}).steps[0].rate, F(1, 5))


ONE_CALL = {"as_of": "2026-03-01", "terms": {"carry": "0.20"}, "cash_flows": [call("2022-03-01", "5000000")]}
THREE = [{"name": "Alder", "commitment": "1000000"}, {"name": "Birch", "commitment": "1000000"}, {"name": "Cedar", "commitment": "1000000"}]


def lp_case(inputs, lps, xs):
    return run_case({"case": "lps", "xs": xs, "fund": {**inputs, "lps": lps}})


def by_lp(point, key):
    return [e[key]["exact"] for e in point["by_lp"]]


class Lps(unittest.TestCase):
    """F19, F20: each LP's share of what the LPs get."""

    def test_a_share_is_the_commitment_over_all_the_commitments_exactly(self):
        # 700,000 + 1,100,000 + 300,000 = 2,100,000: 1/3, 11/21 and 1/7, which add up to exactly 1.
        f = read({**ONE_CALL, "lps": [{"name": "A", "commitment": "700000"}, {"name": "B", "commitment": "1100000"}, {"name": "C", "commitment": "300000"}]})
        self.assertEqual(shares(f), [F(1, 3), F(11, 21), F(1, 7)])
        self.assertEqual(sum(shares(f)), 1)

    def test_commitments_only_divide(self):
        # F19: $5M, $3.5M and $1.5M add up to $10M, whatever the calls: halves, 7/20 and 3/20. Any amounts in the same
        # proportions give the same shares, an "a/b" commitment included (FA18).
        dollars = [{"name": "A", "commitment": "5000000"}, {"name": "B", "commitment": "3500000"}, {"name": "C", "commitment": "1500000"}]
        tenths = [{"name": "A", "commitment": "10/2"}, {"name": "B", "commitment": "3.5"}, {"name": "C", "commitment": "1.5"}]
        self.assertEqual(shares(read({**ONE_CALL, "lps": dollars})), [F(1, 2), F(7, 20), F(3, 20)])
        self.assertEqual(shares(read({**ONE_CALL, "lps": tenths})), [F(1, 2), F(7, 20), F(3, 20)])

    def test_each_lp_gets_its_share_of_the_lps_amounts_exactly(self):
        # Case 1's fund: $5,000,000 called, 20% carry. Three equal LPs: each has paid in $5,000,000 / 3.
        # X = $2,000,000 is all capital: each LP gets $2,000,000 / 3 = $666,666.666…, to the cent $666,666.67.
        # X = $12,500,000: LPs get $5,000,000 + 80% of $7,500,000 = $11,000,000, so each $11,000,000 / 3.
        out = lp_case(ONE_CALL, THREE, ["2000000", "12500000"])
        self.assertEqual([lp["paid_in"]["exact"] for lp in out["lps"]], ["5000000/3"] * 3)
        self.assertEqual([lp["share"] for lp in out["lps"]], ["1/3"] * 3)
        at = {p["x"]: p for p in out["points"]}
        self.assertEqual(by_lp(at["2000000.00"], "distribution"), ["2000000/3"] * 3)
        self.assertEqual([e["distribution"]["amount"] for e in at["2000000.00"]["by_lp"]], ["666666.67"] * 3)
        self.assertEqual(by_lp(at["12500000.00"], "distribution"), ["11000000/3"] * 3)
        # Nothing was distributed before X, so to date is X's; not final, so no clawback.
        self.assertEqual(by_lp(at["12500000.00"], "to_date"), ["11000000/3"] * 3)
        self.assertNotIn("clawback", at["12500000.00"]["by_lp"][0])

    def test_each_lp_gets_its_share_of_the_clawback_owed_back(self):
        # Example C, final, with LPs at 70% and 30%. X = 0: the GP owes $400,000 back, $280,000 and $120,000.
        # X = $1,000,000: $200,000 owed, $140,000 and $60,000. X = $2,000,000: nothing owed, so zero each (F20).
        lps = [{"name": "Alder", "commitment": "7"}, {"name": "Birch", "commitment": "3"}]
        inputs = {"as_of": EXAMPLE_C["as_of"], "terms": EXAMPLE_C["terms"], "cash_flows": EXAMPLE_C["flows"], "final": True}
        at = {p["x"]: p for p in lp_case(inputs, lps, ["0", "1000000", "2000000"])["points"]}
        self.assertEqual(by_lp(at["0.00"], "clawback"), ["280000", "120000"])
        self.assertEqual(by_lp(at["1000000.00"], "clawback"), ["140000", "60000"])
        self.assertEqual(by_lp(at["2000000.00"], "clawback"), ["0", "0"])
        # To date: the earlier $15,000,000 gave the LPs $14,000,000, and X = $1,000,000 returns the late call.
        self.assertEqual(by_lp(at["1000000.00"], "to_date"), ["10500000", "4500000"])

    def test_the_nav_point_has_each_lps_clawback_though_x_is_not_final(self):
        # F14, F20: the NAV point is final by definition. Example C at NAV $1,000,000 owes $200,000: halves, $100,000.
        lps = [{"name": "Alder", "commitment": "1"}, {"name": "Birch", "commitment": "1"}]
        inputs = {"as_of": EXAMPLE_C["as_of"], "terms": EXAMPLE_C["terms"], "cash_flows": EXAMPLE_C["flows"], "nav": "1000000"}
        at = {p["x"]: p for p in lp_case(inputs, lps, ["1"])["points"]}
        self.assertEqual(by_lp(at["1000000.00"], "clawback"), ["100000", "100000"])
        self.assertNotIn("clawback", at["1.00"]["by_lp"][0])

    def test_the_lps_change_nothing_else(self):
        # F20: the waterfall, the GP commitment's line, the clawback and the breakpoints are as without LPs.
        inputs = {"as_of": EXAMPLE_A["as_of"], "terms": EXAMPLE_A["terms"], "cash_flows": EXAMPLE_A["flows"], "nav": "40000000", "final": True}
        without = run_case({"case": "lps", "xs": ["20000000", "50000000"], "fund": inputs})
        with_lps = lp_case(inputs, THREE, ["20000000", "50000000"])
        del with_lps["lps"]
        for p in with_lps["points"]:
            del p["by_lp"]
        self.assertEqual(with_lps, without)

    def test_left_out_null_or_empty_are_no_lps(self):
        for lps in (None, []):
            out = lp_case(ONE_CALL, lps, ["1"])
            self.assertNotIn("lps", out)
            self.assertNotIn("by_lp", out["points"][0])
        self.assertEqual(read(ONE_CALL).lps, [])

    def test_the_lps_amounts_add_up_to_theirs_exactly(self):
        # Shares add up to exactly 1, so the LPs' amounts do too, whatever the commitments.
        rng = random.Random(20261018)
        f = read(ONE_CALL)
        for _ in range(50):
            f.lps = read({**ONE_CALL, "lps": [{"name": str(i), "commitment": str(rng.randint(1, 10**7))} for i in range(rng.randint(1, 9))]}).lps
            amount = F(rng.randint(0, 10**9), rng.randint(1, 10**4))
            self.assertEqual(sum(each_lp(f, amount)), amount)


class LpRefusals(unittest.TestCase):
    """F21 beyond the fixtures in packages/fund/cases/fund-21-lps-refused, and FA17 to FA19."""

    def refused(self, inputs):
        with self.assertRaises(Refusal) as ctx:
            read(inputs)
        return (ctx.exception.kind, ctx.exception.term, ctx.exception.path)

    def lps(self, lps):
        return self.refused({**ONE_CALL, "lps": lps})

    def test_the_shape(self):
        self.assertEqual(self.lps({}), ("input", "bad_field", "lps"))
        self.assertEqual(self.lps("Alder"), ("input", "bad_field", "lps"))
        self.assertEqual(self.lps([{"name": "Alder", "commitment": "1"}, None]), ("input", "bad_field", "lps[1]"))

    def test_missing_or_null(self):
        # F21: null is missing. With both missing, the name comes first (FA19).
        self.assertEqual(self.lps([{"name": None, "commitment": "1"}]), ("input", "missing_field", "lps[0].name"))
        self.assertEqual(self.lps([{"name": "Alder", "commitment": None}]), ("input", "missing_field", "lps[0].commitment"))
        self.assertEqual(self.lps([{}]), ("input", "missing_field", "lps[0].name"))

    def test_other_fields_whatever_their_value(self):
        # FA18: unsupported even when null, and of two the first in the file's order; before a missing name (F21).
        self.assertEqual(self.lps([{"name": "Alder", "commitment": "1", "carry": None}]), ("unsupported", "carry", "lps[0].carry"))
        self.assertEqual(self.lps([{"mgmt_fee": "0.015", "carry": "0.15"}]), ("unsupported", "mgmt_fee", "lps[0].mgmt_fee"))

    def test_a_blank_name_is_whitespace_as_javascripts_trim_takes_it(self):
        # FA17: blank names, then names that aren't: U+001C is whitespace to Python, not to trim.
        for name in ["", " ", "\u00a0", "\ufeff\t", "\u2003\u3000\n"]:
            self.assertEqual(self.lps([{"name": name, "commitment": "1"}]), ("input", "bad_field", "lps[0].name"), repr(name))
        for name in ["\x1c", "\u0085", "\u200b"]:
            self.assertEqual(read({**ONE_CALL, "lps": [{"name": name, "commitment": "1"}]}).lps[0].name, name)

    def test_names_are_kept_and_compared_as_written(self):
        # FA17: not trimmed or case-folded, so these are three LPs.
        names = ["Alder", "Alder ", "alder"]
        f = read({**ONE_CALL, "lps": [{"name": n, "commitment": "1"} for n in names]})
        self.assertEqual([lp.name for lp in f.lps], names)
        self.assertEqual(self.lps([{"name": n, "commitment": "1"} for n in ["Alder", "Birch", "Birch"]]), ("input", "lp_name_repeated", "lps[2].name"))

    def test_names_and_commitments_of_the_wrong_kind(self):
        for name in [True, ["Alder"], {"en": "Alder"}]:
            self.assertEqual(self.lps([{"name": name, "commitment": "1"}]), ("input", "bad_field", "lps[0].name"))
        for commitment in ["1e6", "", "1,000,000", "1/0", True]:
            self.assertEqual(self.lps([{"name": "Alder", "commitment": commitment}]), ("input", "bad_number", "lps[0].commitment"))

    def test_the_lps_come_after_everything_else(self):
        # FA19: a fourth stage. A bad as_of, a flow after D and an unsupported term each come before the LPs' problems.
        bad = [{"name": "Alder", "commitment": "1", "carry": "0.15"}]
        self.assertEqual(self.refused({**ONE_CALL, "as_of": "soon", "lps": bad}), ("input", "bad_date", "as_of"))
        self.assertEqual(self.refused({**ONE_CALL, "distribution_date": "2020-01-01", "lps": "x"}), ("input", "cash_flow_after_distribution_date", "cash_flows[0]"))
        self.assertEqual(self.refused({**ONE_CALL, "terms": {"carry": "0.2", "hurdle_irr": "0.08"}, "lps": bad}), ("unsupported", "hurdle_irr", "terms.hurdle_irr"))

    def test_one_lp_at_a_time_in_f21s_order(self):
        # An LP is checked through before the next: lps[1]'s repeated name before lps[2]'s bad commitment.
        lps = [{"name": "Alder", "commitment": "1"}, {"name": "Alder", "commitment": "1"}, {"name": "Birch", "commitment": "0"}]
        self.assertEqual(self.lps(lps), ("input", "lp_name_repeated", "lps[1].name"))
        # Within an LP: fields, then presence, then the name, then the commitment, then the repeat.
        self.assertEqual(self.lps([{"name": "", "commitment": "0", "carry": "0.15"}]), ("unsupported", "carry", "lps[0].carry"))
        self.assertEqual(self.lps([{"name": "", "commitment": "0"}]), ("input", "bad_field", "lps[0].name"))
        self.assertEqual(self.lps([{"name": "Alder", "commitment": "1"}, {"name": "Alder", "commitment": "0"}]), ("input", "bad_number", "lps[1].commitment"))


def model(terms, flows, as_of, lps, **more):
    return Model(read({"as_of": as_of, "terms": terms, "cash_flows": flows, "lps": lps, **more}))


def named(found):
    return [(money(x), [r["text"] for r in rs]) for x, rs in found]


class Classes(unittest.TestCase):
    """F22, F23: each class's account runs the tiers on its own."""

    def test_a_fee_rate_weights_the_fee_calls(self):
        # F22: A on the fund's 2%, B in a class at 1%: fee weights 1 and 1 × 1% / 2% = 1/2, so of a 90 fee call A pays
        # 60 and B 30. The 1,000 investment call is by commitment, 500 each. Paid in: 560 and 530.
        terms = {"carry": "0.2", "fee_rate": "0.02", "lp_classes": [{"name": "Half", "fee_rate": "0.01"}]}
        flows = [call("2021-01-01", "1000"), call("2021-01-01", "90", "fee")]
        m = model(terms, flows, "2022-01-01", [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "Half"}])
        self.assertEqual([a.fee_share for a in m.accounts], [F(2, 3), F(1, 3)])
        self.assertEqual([a.run.before.lps_paid_in for a in m.accounts], [560, 530])
        self.assertEqual(m.lps_paid_in(), 1090)
        # F23, F27: each account gets half of X, so its capital is back at twice its paid-in, each reason named.
        self.assertEqual(
            named(breakpoints.find(m)),
            [("1060.00", ["Half: LPs have their $530 of paid-in capital back"]), ("1120.00", ["Fund terms: LPs have their $560 of paid-in capital back"])],
        )

    def test_each_account_runs_its_own_tiers(self):
        # 1,000 called, A and B committing equally, B's class paying no carry. X = 3,000 gives each account 1,500:
        # A's returns its 500 and pays 20% on the other 1,000 (GP 200); B's returns its 500 and keeps the rest.
        terms = {"carry": "0.2", "lp_classes": [{"name": "F&F", "carry": "0"}]}
        m = model(terms, [call("2021-01-01", "1000")], "2022-01-01", [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "F&F"}])
        out = m.evaluate(3000)
        (a, oa), (b, ob) = out.by_account
        self.assertEqual((oa.this.lp_capital, oa.this.gp_carry, oa.this.lps), (500, [F(200)], 1300))
        self.assertEqual((ob.this.lp_capital, ob.this.gp_carry, ob.this.lps), (500, [F(0)], 1500))
        # Both capitals are back at X = 1,000: one breakpoint, the fund's terms first (F27, FA15).
        self.assertEqual(
            named(breakpoints.find(m)),
            [("1000.00", ["Fund terms: LPs have their $500 of paid-in capital back", "F&F: LPs have their $500 of paid-in capital back"])],
        )

    def test_a_class_on_the_funds_terms_gives_the_same_amounts_as_none(self):
        # F23: example A's fund with three LPs, the third in a class with no terms of its own. Every amount the fund
        # reports is the same; the breakpoints are at the same X, each now with a reason from both accounts.
        inputs = {"as_of": EXAMPLE_A["as_of"], "terms": EXAMPLE_A["terms"], "cash_flows": EXAMPLE_A["flows"], "nav": "40000000", "final": True}
        plain = run_case({"case": "same", "xs": ["20000000", "50000000"], "fund": {**inputs, "lps": THREE}})
        same = [dict(THREE[0]), dict(THREE[1]), {**THREE[2], "class": "Same"}]
        classed = run_case({"case": "same", "xs": ["20000000", "50000000"], "fund": {**inputs, "terms": {**inputs["terms"], "lp_classes": [{"name": "Same"}]}, "lps": same}})
        self.assertEqual([b["exact"] for b in classed["breakpoints"]], [b["exact"] for b in plain["breakpoints"]])
        self.assertEqual([len(b["reasons"]) for b in classed["breakpoints"]], [2 * len(b["reasons"]) for b in plain["breakpoints"]])
        for p, q in zip(plain["points"], classed["points"]):
            for key in ("x", "tags", "clawback"):
                self.assertEqual(p.get(key), q.get(key))
            for block in ("distribution", "to_date"):
                self.assertEqual(p[block]["lps"], q[block]["lps"])
                self.assertEqual(p[block]["gp"]["total"], q[block]["gp"]["total"])
                self.assertEqual(p[block].get("gp_commitment"), q[block].get("gp_commitment"))
            self.assertEqual(p["by_lp"], q["by_lp"])

    def test_a_class_no_lp_names_has_no_account(self):
        # FA22: its terms are checked (F28) and do nothing.
        terms = {"carry": "0.2", "lp_classes": [{"name": "Empty", "carry": "0.1"}]}
        m = model(terms, [call("2021-01-01", "1000")], "2022-01-01", [{"name": "A", "commitment": "1"}])
        self.assertEqual([a.class_name for a in m.accounts], [None])
        self.assertFalse(m.named)

    def test_one_accounts_surplus_never_offsets_anothers_clawback(self):
        # F24, FA23: case 11's fund, half its LPs in a class whose carry steps to 30% from 1.5x. At X = $5,500,000,
        # the fund's-terms account has been paid $50,000 less carry than it's entitled to, and the class's GP owes
        # $81,250 back. The fund owes $81,250, not the $31,250 of carry paid less entitlement.
        f = json.loads((CASES / "fund-11-clawback-pref" / "inputs.json").read_text())["fund"]
        f["terms"]["lp_classes"] = [{"name": "Stepped", "carry": {"steps": [{"rate": "0.2"}, {"rate": "0.3", "from_lp_multiple": "1.5"}]}}]
        f["lps"] = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "Stepped"}]
        out = Model(read(f)).evaluate(5500000)
        self.assertEqual([o.owed_before_floor for _, o in out.by_account], [-50000, 81250])
        self.assertEqual((out.carry_paid - out.entitlement, out.clawback), (31250, 81250))

    def test_without_lps_the_classes_change_nothing(self):
        # F23: no listed LPs is one account, the whole LPs' side, whatever classes the terms list.
        terms = {**EXAMPLE_A["terms"], "fee_rate": "0.02", "lp_classes": [{"name": "Half", "fee_rate": "0.01", "carry": "0.1"}]}
        with_classes = run_case({"case": "c", "xs": ["20000000"], "fund": {"as_of": EXAMPLE_A["as_of"], "terms": terms, "cash_flows": EXAMPLE_A["flows"]}})
        without = run_case({"case": "c", "xs": ["20000000"], "fund": {"as_of": EXAMPLE_A["as_of"], "terms": EXAMPLE_A["terms"], "cash_flows": EXAMPLE_A["flows"]}})
        self.assertEqual(with_classes, without)


def eq_moves(e):
    return [(m.capital_paid, m.capital_returned, m.interest_paid, m.interest_received) for m in e.totals]


class Closes(unittest.TestCase):
    """F25: later closes and their equalization."""

    def test_one_later_close(self):
        # 1,000 called on 2021-01-01 and paid by A alone. B, committing as much, joins on 2021-07-01, 181 days later:
        # it pays in 500 and A gets 500 back. B pays 10% on 500 for 181 days, 9,050 / 365, all to A.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}]
        f = read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0.1"}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps})
        e = equalization(f)
        self.assertEqual([c.date.isoformat() for c in e.closes], ["2021-07-01"])
        self.assertEqual(eq_moves(e), [(0, 500, 0, F(9050, 365)), (500, 0, F(9050, 365), 0)])

    def test_a_call_on_the_close_date_is_paid_by_the_joining_lps(self):
        # FA21: B is in on its close's date, so it pays half of that day's 200 as it's made; only the earlier call is
        # caught up on, with interest.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}]
        flows = [call("2021-01-01", "1000"), call("2021-07-01", "200")]
        e = equalization(read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0.1"}, "cash_flows": flows, "lps": lps}))
        self.assertEqual(eq_moves(e), [(0, 500, 0, F(9050, 365)), (500, 0, F(9050, 365), 0)])

    def test_lps_closing_on_one_date_join_together(self):
        # F25: B and C join on one date: one close, each paying a third of the 1,000, A getting 2,000/3 back.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}, {"name": "C", "commitment": "1", "close": "2021-07-01"}]
        e = equalization(read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0"}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps}))
        self.assertEqual(len(e.closes), 1)
        self.assertEqual([lp.name for lp in e.closes[0].joining], ["B", "C"])
        self.assertEqual(eq_moves(e), [(0, F(2000, 3), 0, 0), (F(1000, 3), 0, 0, 0), (F(1000, 3), 0, 0, 0)])

    def test_a_close_rebalances_fee_calls_by_fee_weight(self):
        # F22, F25: a 90 fee call A paid alone. B joins in a class paying no fees, so its fee weight is 0: nothing
        # moves for the fee call, and B pays interest only on its half of the 1,000.
        terms = {"fee_rate": "0.02", "equalization_rate": "0.1", "lp_classes": [{"name": "F&F", "fee_rate": "0"}]}
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "class": "F&F", "close": "2021-07-01"}]
        flows = [call("2021-01-01", "1000"), call("2021-01-01", "90", "fee")]
        e = equalization(read({"as_of": "2022-01-01", "terms": terms, "cash_flows": flows, "lps": lps}))
        self.assertEqual(eq_moves(e), [(0, 500, 0, F(9050, 365)), (500, 0, F(9050, 365), 0)])

    def test_the_gp_commitment_is_outside_the_equalization(self):
        # F25: a 2% GP commitment pays 20 of the 1,000 as it's made. The LPs' part is 980, so B pays in 490.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-07-01"}]
        terms = {"gp_commitment": {"share": "0.02"}, "equalization_rate": "0"}
        e = equalization(read({"as_of": "2022-01-01", "terms": terms, "cash_flows": [call("2021-01-01", "1000")], "lps": lps}))
        self.assertEqual(eq_moves(e), [(0, 490, 0, 0), (490, 0, 0, 0)])

    def test_two_closes_rebalance_in_date_order(self):
        # A pays 1,200 on 2021-01-01. B joins on 2021-04-01: halves, so B pays 600 and A gets 600 back. C joins on
        # 2021-07-01: thirds, so C pays 400, and A and B each get 200 back. At 0% interest only capital moves.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-04-01"}, {"name": "C", "commitment": "1", "close": "2021-07-01"}]
        e = equalization(read({"as_of": "2022-01-01", "terms": {"equalization_rate": "0"}, "cash_flows": [call("2021-01-01", "1200")], "lps": lps}))
        self.assertEqual([c.date.isoformat() for c in e.closes], ["2021-04-01", "2021-07-01"])
        self.assertEqual(eq_moves(e), [(0, 800, 0, 0), (600, 200, 0, 0), (400, 0, 0, 0)])

    def test_each_lp_already_in_receives_the_rate_on_what_it_gets_back(self):
        # FA30: the interest on a call goes to the LPs already in pro rata to what each gets back of it, which comes to
        # each receiving the rate on what it gets back for the same days. Paid and received balance at every close.
        rng = random.Random(20261023)
        for _ in range(40):
            n = rng.randint(2, 5)
            start = datetime.date(2021, 1, 1)
            lps = [{"name": "LP 0", "commitment": str(rng.randint(1, 9))}]
            for i in range(1, n):
                lp = {"name": f"LP {i}", "commitment": str(rng.randint(1, 9))}
                if rng.random() < 0.7:
                    lp["close"] = (start + datetime.timedelta(days=rng.randint(1, 400))).isoformat()
                lps.append(lp)
            flows = [call(start.isoformat(), str(rng.randint(1, 50) * 100))]
            for _ in range(rng.randint(0, 3)):
                flows.append(call((start + datetime.timedelta(days=rng.randint(0, 400))).isoformat(), str(rng.randint(1, 50) * 100)))
            f = read({"as_of": "2023-01-01", "terms": {"equalization_rate": "0.07"}, "cash_flows": flows, "lps": lps})
            e = equalization(f)
            if e is None:
                continue
            for close in e.closes:
                moves = close.moves.values()
                self.assertEqual(sum(m.capital_paid for m in moves), sum(m.capital_returned for m in moves))
                self.assertEqual(sum(m.interest_paid for m in moves), sum(m.interest_received for m in moves))
                for i, m in close.moves.items():
                    if f.lps[i].close == close.date:
                        continue
                    want = sum(
                        F(7, 100) * (part(f, c, i, close.date, before=True) - part(f, c, i, close.date)) * days(c.date, close.date) / 365
                        for c in f.flows
                        if c.date < close.date
                    )
                    self.assertEqual(m.interest_received, want)
            # F25: after the last close every LP holds its share of every call, as if in from the start.
            last = e.closes[-1].date
            held = {i: sum(part(f, c, i, max(last, c.date)) for c in f.flows) for i in range(len(f.lps))}
            total = sum(c.amount for c in f.flows)
            for i, lp in enumerate(f.lps):
                self.assertEqual(held[i], total * lp.commitment / sum(x.commitment for x in f.lps))

    def test_the_waterfall_is_as_if_every_lp_were_in_from_the_start(self):
        # F25: case 25 with Cedar's close taken out gives every amount, breakpoint and paid-in the same.
        inputs = json.loads((CASES / "fund-25-later-close" / "inputs.json").read_text())
        late = run_case(inputs)
        fund = copy.deepcopy(inputs["fund"])
        del fund["lps"][2]["close"]
        start = run_case({**inputs, "fund": fund})
        del late["equalization"]
        del late["lps"][2]["close"]
        self.assertNotIn("equalization", start)
        self.assertEqual(late, start)

    def test_a_close_on_or_before_the_first_call_is_in_from_the_start(self):
        # F25: no later close, so no equalization rate is needed and none is worked out.
        lps = [{"name": "A", "commitment": "1"}, {"name": "B", "commitment": "1", "close": "2021-01-01"}, {"name": "C", "commitment": "1", "close": "2020-06-30"}]
        f = read({"as_of": "2022-01-01", "terms": {}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps})
        self.assertIsNone(equalization(f))
        self.assertNotIn("close", json.dumps(run_case({"case": "c", "xs": ["1"], "fund": {"as_of": "2022-01-01", "terms": {}, "cash_flows": [call("2021-01-01", "1000")], "lps": lps}})["lps"]))


def part(f, c, i, date, before=False):
    """LP i's part of call c among the LPs in by `date`, or with `before` the LPs in just before it: the call times its
    weight over theirs (F25). No GP commitment here, so the LPs' part is the call."""
    members = [j for j, lp in enumerate(f.lps) if lp.close is None or (lp.close < date if before else lp.close <= date)]
    if i not in members:
        return F(0)
    w = {j: f.weight(f.lps[j], c.kind) for j in members}
    return c.amount * w[i] / sum(w.values())


CLASSED = {
    "as_of": "2026-06-30",
    "terms": {"carry": "0.2", "fee_rate": "0.02", "equalization_rate": "0.08", "lp_classes": [{"name": "F&F", "fee_rate": "0", "carry": "0"}]},
    "cash_flows": [call("2022-01-01", "9000000"), call("2022-01-01", "160000", "fee")],
    "lps": [{"name": "Alder", "commitment": "6"}, {"name": "Cedar", "commitment": "1", "class": "F&F"}],
}


class ClassRefusals(unittest.TestCase):
    """F28 beyond the fixtures in packages/fund/cases/fund-27-classes-refused, and FA24 to FA27."""

    def refused(self, change, base=CLASSED):
        with self.assertRaises(Refusal) as ctx:
            read(apply_change(base, change))
        return (ctx.exception.kind, ctx.exception.term, ctx.exception.path)

    def test_null_is_left_out_but_for_a_carry(self):
        # FA24: null fee rates, classes, an LP's class and close are left out; a null class carry is refused.
        read(apply_change(CLASSED, {"set": {"terms.equalization_rate": None, "terms.lp_classes[0].fee_rate": None, "lps[1].class": None, "lps[0].close": None}}))
        self.assertEqual(read(apply_change(CLASSED, {"set": {"terms.lp_classes": None, "lps[1].class": None}})).classes, [])
        self.assertEqual(read(apply_change(CLASSED, {"set": {"terms.lp_classes": [], "lps[1].class": None}})).classes, [])
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0].carry": None}}), ("input", "bad_number", "terms.lp_classes[0].carry"))
        self.assertEqual(self.refused({"set": {"terms.fee_rate": None}}), ("input", "missing_field", "terms.fee_rate"))

    def test_a_classs_keys_in_the_files_order_its_carrys_among_them(self):
        # FA25: the first unsupported key in the class, its carry's own keys at the carry's place.
        cls = {"name": "F&F", "carry": {"steps": [{"rate": "0", "hurdle": "x"}]}, "pref": {"rate": "0.06"}}
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0]": cls}}), ("unsupported", "hurdle", "terms.lp_classes[0].carry.steps[0].hurdle"))
        cls = {"name": "F&F", "pref": {"rate": "0.06"}, "carry": {"tiers": []}}
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0]": cls}}), ("unsupported", "pref", "terms.lp_classes[0].pref"))
        # Stage 1 comes first: an unsupported class key before a bad fund carry.
        self.assertEqual(self.refused({"set": {"terms.carry": "2", "terms.lp_classes[0].mgmt_fee": "1"}}), ("unsupported", "mgmt_fee", "terms.lp_classes[0].mgmt_fee"))

    def test_the_order_within_and_between_classes(self):
        # F28, FA25: shape, name, repeat, fee rate (its own number before the fund's rate), carry, carry against the
        # catch-up; each class through before the next.
        no_rate = {"carry": "0.2", "lp_classes": [{"name": "A", "fee_rate": "-1"}]}
        self.assertEqual(self.refused({"set": {"terms": no_rate}}), ("input", "bad_number", "terms.lp_classes[0].fee_rate"))
        two = [{"name": "A", "carry": "2"}, {"name": "A"}]
        self.assertEqual(self.refused({"set": {"terms.lp_classes": two}}), ("input", "carry_rate_not_below_one", "terms.lp_classes[0].carry"))
        two = [{"name": "A"}, {"name": "A", "carry": "2"}]
        self.assertEqual(self.refused({"set": {"terms.lp_classes": two}}), ("input", "lp_class_name_repeated", "terms.lp_classes[1].name"))
        # The fund's own terms come first: a bad fee rate before a bad class, a bad fund carry before both.
        self.assertEqual(self.refused({"set": {"terms.fee_rate": "-1", "terms.lp_classes[0].name": ""}}), ("input", "bad_number", "terms.fee_rate"))
        self.assertEqual(self.refused({"set": {"terms.equalization_rate": "x", "terms.lp_classes[0].name": ""}}), ("input", "bad_number", "terms.equalization_rate"))

    def test_class_names_compare_as_written(self):
        # FA27: as LP names do (FA17): "F&F " and "f&f" aren't "F&F"; a blank name is JavaScript trim's whitespace.
        for cls in ["F&F ", "f&f", " F&F"]:
            self.assertEqual(self.refused({"set": {"lps[1].class": cls}}), ("input", "lp_class_unknown", "lps[1].class"))
        for name in ["", " ", "﻿"]:
            self.assertEqual(self.refused({"set": {"terms.lp_classes[0].name": name}}), ("input", "bad_field", "terms.lp_classes[0].name"))
        self.assertEqual(self.refused({"set": {"terms.lp_classes[0].name": ["F&F"]}}), ("input", "bad_field", "terms.lp_classes[0].name"))

    def test_an_lps_class_and_close_come_after_its_other_checks(self):
        # F28: within an LP, F21's checks first, then its class, then its close; each LP through before the next.
        self.assertEqual(self.refused({"set": {"lps[1].class": "X", "lps[1].commitment": "0"}}), ("input", "bad_number", "lps[1].commitment"))
        self.assertEqual(self.refused({"set": {"lps[1].class": "X", "lps[1].close": "soon"}}), ("input", "lp_class_unknown", "lps[1].class"))
        self.assertEqual(self.refused({"set": {"lps[0].close": "soon", "lps[1].class": "X"}}), ("input", "bad_date", "lps[0].close"))
        self.assertEqual(self.refused({"set": {"lps[1].class": True}}), ("input", "bad_field", "lps[1].class"))
        # A class the terms don't have, when they have none at all.
        self.assertEqual(self.refused({"set": {"terms.lp_classes": None, "terms.fee_rate": None}}), ("input", "lp_class_unknown", "lps[1].class"))

    def test_a_close_must_come_before_d(self):
        # FA32: with no distribution in the cash flows, D is the limit: X is a distribution on D.
        self.assertEqual(self.refused({"set": {"lps[1].close": "2026-06-30"}}), ("input", "lp_close_after_distribution", "lps[1].close"))
        read(apply_change(CLASSED, {"set": {"lps[1].close": "2026-06-29"}}))

    def test_what_the_lps_need_comes_last(self):
        # F28's fifth stage: after every LP is read. An LP's bad close comes before a missing equalization rate.
        change = {"del": "terms.equalization_rate", "set": {"lps[1].close": "2023-01-01", "lps[0].close": "x"}}
        self.assertEqual(self.refused(change), ("input", "bad_date", "lps[0].close"))
        change = {"del": "terms.equalization_rate", "set": {"lps[1].close": "2023-01-01"}}
        self.assertEqual(self.refused(change), ("input", "missing_field", "terms.equalization_rate"))
        # Fee calls no LP pays, as every LP pays no fees: the first by date, whatever its place in the list.
        late = {"cash_flows[1]": call("2023-01-01", "100", "fee"), "cash_flows[2]": call("2022-06-01", "100", "fee"), "lps[0].class": "F&F"}
        self.assertEqual(self.refused({"set": late}), ("input", "call_without_payers", "cash_flows[2]"))
        # Without listed LPs, nothing here applies: the LPs' side pays every call (F23).
        read(apply_change(CLASSED, {"set": {"lps": None}}))


def random_fund(rng):
    """A small fund with a pref or not, a catch-up or not, one to three carry steps, a GP commitment or not, and calls
    and distributions in any order after the first call: its X final."""
    steps = [{"rate": str(rng.choice([F(1, 10), F(3, 20), F(1, 5)]))}]
    for m in sorted(rng.sample([2, 3, 4], rng.randint(0, 2))):
        steps.append({"rate": str(F(steps[-1]["rate"]) + F(1, 20)), "from_lp_multiple": str(m)})
    terms = {"carry": {"steps": steps}}
    if rng.random() < 0.6:
        terms["pref"] = {"rate": rng.choice(["0.06", "0.08"])}
        if rng.random() < 0.6:
            terms["catch_up"] = {"gp_share": rng.choice(["1", "0.5"])}
    if rng.random() < 0.4:
        terms["gp_commitment"] = {"share": "0.02", "pays_fees": rng.random() < 0.5}
    start = datetime.date(2015, 1, 1)
    flows = [call(start.isoformat(), str(rng.randint(5, 20) * 100000))]
    day = start
    for _ in range(rng.randint(1, 6)):
        day += datetime.timedelta(days=rng.randint(30, 500))
        if rng.random() < 0.5:
            flows.append(call(day.isoformat(), str(rng.randint(1, 10) * 100000), rng.choice(["investment", "fee", "expense"])))
        else:
            flows.append(dist(day.isoformat(), str(rng.randint(1, 40) * 100000)))
    d = day + datetime.timedelta(days=rng.randint(0, 400))
    return {"as_of": d.isoformat(), "terms": terms, "cash_flows": flows, "final": True}


def random_classes(rng, inputs):
    """The same fund with two to four LPs, some in classes with their own fee rate or carry, some at later closes."""
    first = inputs["terms"]["carry"]["steps"][0]["rate"]
    s = F(inputs["terms"].get("catch_up", {}).get("gp_share", "1"))
    classes = []
    for name in ("Anchor", "F&F", "Stepped"):
        if rng.random() < 0.6:
            c = {"name": name}
            if rng.random() < 0.6:
                c["fee_rate"] = rng.choice(["0", "0.01", "0.025"])
            if rng.random() < 0.7:
                rates = [r for r in (F(0), F(1, 20), F(1, 10), F(1, 4)) if r < s]
                lo = rng.choice(rates)
                c["carry"] = str(lo) if rng.random() < 0.5 else {"steps": [{"rate": str(lo)}, {"rate": str(lo + F(1, 10)), "from_lp_multiple": rng.choice(["1.5", "2"])}]}
            classes.append(c)
    terms = {**inputs["terms"], "fee_rate": "0.02", "equalization_rate": rng.choice(["0", "0.06"]), "lp_classes": classes}
    calls = sorted(f["date"] for f in inputs["cash_flows"] if f["type"] == "call")
    dists = sorted(f["date"] for f in inputs["cash_flows"] if f["type"] == "distribution") + [inputs["as_of"]]
    lps = [{"name": "LP 0", "commitment": str(rng.randint(1, 9))}]
    if classes and rng.random() < 0.3:
        lps[0]["class"] = rng.choice(classes)["name"]
    for i in range(1, rng.randint(2, 4)):
        lp = {"name": f"LP {i}", "commitment": str(rng.randint(1, 9))}
        if classes and rng.random() < 0.6:
            lp["class"] = rng.choice(classes)["name"]
        later = [d for d in calls if d < dists[0]]
        if rng.random() < 0.4 and len(later) > 1:
            lp["close"] = later[-1]
        lps.append(lp)
    return {**inputs, "terms": terms, "lps": lps}


class RandomFunds(unittest.TestCase):
    def test_breakpoints_are_found_and_the_clawback_never_rises(self):
        # Every random fund's breakpoints are found and checked straight between (breakpoints.find raises if not).
        # As X grows, the clawback only holds or falls, so it never starts: F15's wording for its changes covers
        # them all (find raises NotSettled otherwise).
        rng = random.Random(20261013)
        for i in range(60):
            inputs = random_fund(rng)
            wf = Waterfall(read(inputs))
            found = breakpoints.find(wf)
            for x, rs in found:
                self.assertNotIn("clawback_starts", [r["code"] for r in rs], (i, inputs))
            xs = sorted({F(0)} | {x for x, _ in found})
            owed = [wf.evaluate(x).clawback for x in xs + [xs[-1] + 10**7]]
            self.assertEqual(owed, sorted(owed, reverse=True), (i, inputs))



    def test_with_classes_and_closes(self):
        # The same random funds with LPs in classes and at later closes: every account's breakpoints are found and
        # checked straight between, no account's clawback ever rises (FA9), the fund's amounts are the accounts' sums
        # (F23), and on the fund's terms alone the accounts give exactly 0.2.0's amounts.
        rng = random.Random(20261024)
        for i in range(40):
            inputs = random_classes(rng, random_fund(rng))
            try:
                f = read(inputs)
            except Refusal as r:
                self.assertEqual(r.term, "call_without_payers", (i, inputs))
                continue
            m = Model(f)
            found = breakpoints.find(m)
            # The case file's shapes (FC11) are written for it too.
            run_case({"case": "random", "xs": ["0"], "fund": inputs})
            xs = sorted({F(0)} | {x for x, _ in found})
            for a_i in range(len(m.accounts)):
                owed = [m.evaluate(x).by_account[a_i][1].clawback for x in xs + [xs[-1] + 10**7]]
                self.assertEqual(owed, sorted(owed, reverse=True), (i, inputs))
            for x in xs[1:] + [xs[-1] + 1]:
                out = m.evaluate(x)
                self.assertEqual(sum(o.this.lps + o.this.gp for _, o in out.by_account) + out.gp_commitment, x)
            plain = {**inputs, "lps": [{"name": lp["name"], "commitment": lp["commitment"]} for lp in inputs["lps"]]}
            one, wf = Model(read(plain)), Waterfall(read(plain))
            for x in xs + [xs[-1] + 1]:
                (_, o), w = one.evaluate(x).by_account[0], wf.evaluate(x)
                self.assertEqual((o.this.vector()[:-1], o.ledger.to_date.lps, o.clawback), (w.this.vector()[:-1], w.ledger.to_date.lps, w.clawback))


if __name__ == "__main__":
    unittest.main()
