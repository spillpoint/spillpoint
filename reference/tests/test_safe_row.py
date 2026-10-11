"""A row of identical SAFEs pays as the SAFEs one by one (OX11; 0.6.0 plan, answer 10; 06e5).

OCX 0.4/0.5's convertibles table gives a count and a total for each type and terms, never a holder, so the import
reads a row as one SAFE for the total, at the row's cap and discount, held by a holder made for it. This test shows
that's exact: every other holder is paid the same, and the row's SAFE is paid what its SAFEs together would be, at
every exit value, with the same breakpoints.

**Post-money:** the reference prices several post-money SAFEs (X13), so the row is compared with its SAFEs one by
one, beside a preferred series, options and a pool. Each converts into a fixed share of the Liquidity
Capitalization, purchase amount ÷ cap, so three identical SAFEs convert into three times one's share, as the row does.

**Pre-money:** the reference, like the engine, refuses a pre-money SAFE beside another SAFE or beside preferred stock
(X14). That refusal is why combining a row matters: it lets a row of them be read at all. So the SAFEs one by one are
worked here, from X14's own text, for common stock and a pool:
- **Conversion:** each converts into purchase amount ÷ Liquidity Price shares, where Liquidity Price = cap ÷ Liquidity
  Capitalization, and that capitalization leaves out the pool and every SAFE. So each of N SAFEs of amount a converts
  into a × LC ÷ cap shares, whoever else converts, and the row into N times that.
- **Its cash:** a SAFE's cash ranks only against other SAFEs, ahead of common, so N SAFEs take N × a, shared pro rata.
- **The choice:** a SAFE converts where its shares are worth more than its cash. With m of them converting and the
  others' cash paid first, one converting is worth shares × (X − (N − m) × a) ÷ (LC + m × shares). Since shares =
  a × LC ÷ cap, that's at least a exactly when X ≥ cap + N × a, whatever m is. So identical SAFEs never split, and
  the row decides as they do.

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

N, AMOUNT, CAP, DISCOUNT = 3, 200000, 8000000, "0.2"


def table(safes, preferred):
    holders = [{"id": "founder", "name": "Founder"}, {"id": "employee", "name": "Employee"}, {"id": "investor", "name": "Investor"}]
    securities = [{"id": "common", "name": "Common Stock", "kind": "common"}]
    positions = [{"holder": "founder", "security": "common", "shares": 6000000}]
    if preferred:
        securities += [
            {"id": "options_0.5", "name": "Options ($0.5 strike)", "kind": "option", "strike": "0.5"},
            {"id": "seed", "name": "Seed Preferred", "kind": "preferred", "original_issue_price": "1", "conversion_price": "1",
             "preference_multiple": "1", "participation": "non_participating", "cap_multiple": None, "anti_dilution": "none"},
        ]
        positions += [{"holder": "employee", "security": "options_0.5", "shares": 500000}, {"holder": "investor", "security": "seed", "shares": 1000000}]
    return Waterfall(CapTable.from_json({
        "holders": holders + [{"id": f["holder"], "name": f["holder"]} for f in safes],
        "securities": securities,
        "seniority": [["seed"]] if preferred else [],
        "positions": positions,
        "unissued_pool": 1000000,
        "unconverted_safes": safes,
    }), None)


def safes(kind, n, amount):
    return [{"id": f"safe_{i}", "holder": f"safe_holder_{i}", "purchase_amount": str(amount), kind: str(CAP), "discount": DISCOUNT} for i in range(n)]


def exit_values(found):
    """Every $100,000 to $30M, and each breakpoint with a cent either side."""
    xs = {F(x) for x in range(0, 30000001, 100000)}
    for x, *_ in found:
        xs |= {x, x - F(1, 100), x + F(1, 100)}
    return sorted(x for x in xs if x >= 0)


class SafeRow(unittest.TestCase):
    def test_a_row_of_post_money_safes_pays_as_its_safes_one_by_one(self):
        one_by_one = table(safes("post_money_cap", N, AMOUNT), preferred=True)
        row = table(safes("post_money_cap", 1, N * AMOUNT), preferred=True)
        found_apart = breakpoints.find(one_by_one, 0, 30000000, 250000)
        found_row = breakpoints.find(row, 0, 30000000, 250000)
        self.assertEqual([(x, jumps) for x, _, _, jumps in found_apart], [(x, jumps) for x, _, _, jumps in found_row])
        self.assertGreaterEqual(len(found_row), 3)  # the cash paid in full, the seed converting, the SAFEs converting
        for x in exit_values(found_row):
            [apart], [together] = one_by_one.evaluate(x), row.evaluate(x)
            a, t = apart["totals"], together["totals"]
            parts = [a[f"safe_{i}"] for i in range(N)]
            self.assertEqual(sum(parts), t["safe_0"], x)
            self.assertEqual(len(set(parts)), 1, x)  # identical SAFEs are paid alike
            for sid in ("common", "options_0.5", "seed"):
                self.assertEqual(a[sid], t[sid], (x, sid))

    def test_a_row_of_pre_money_safes_pays_as_its_safes_one_by_one(self):
        row = table(safes("pre_money_cap", 1, N * AMOUNT), preferred=False)
        lc = F(6000000)  # common outstanding; the pool and the SAFEs are left out (X14)
        shares = F(AMOUNT) * lc / CAP  # each SAFE's conversion shares, whoever else converts

        def one_by_one(x):
            """Each of the N SAFEs, and common, as X14 pays them."""
            if x >= CAP + N * AMOUNT:
                price = x / (lc + N * shares)
                return shares * price, lc * price
            cash = min(F(AMOUNT), x / N)
            return cash, x - N * cash

        found = breakpoints.find(row, 0, 30000000, 250000)
        self.assertEqual([x for x, *_ in found], [N * AMOUNT, CAP + N * AMOUNT])  # the cash paid in full; converting
        for x in exit_values(found):
            [together] = row.evaluate(x)
            each, common = one_by_one(x)
            self.assertEqual(together["totals"]["safe_0"], N * each, x)
            self.assertEqual(together["totals"]["common"], common, x)
        # Converting, each SAFE's shares are worth exactly its cash at cap + N × a, and more above it, wherever the others stand.
        x = F(CAP + N * AMOUNT)
        for m in range(N + 1):
            converting_worth = shares * (x - (N - m) * AMOUNT) / (lc + m * shares)
            self.assertEqual(converting_worth, AMOUNT, m)


if __name__ == "__main__":
    unittest.main()
