"""Brute-force exit waterfall.

At each exit value, try every combination of decisions (each convertible
preferred series converts or not; each option strike class exercises or not),
run the waterfall for each, and keep the combinations that are stable: no
single decision-maker would be better off flipping its own decision.

This is deliberately a different method from the engine, which solves for
the stable decisions directly.
"""

import itertools
from fractions import Fraction

ZERO = Fraction(0)


class Waterfall:
    def __init__(self, ct):
        self.ct = ct
        sec = ct.securities
        # Decision-makers. Participating uncapped preferred never converts (SPEC).
        self.converters = [
            sid
            for sid in ct.preferred_ids()
            if sec[sid]["participation"] in ("non_participating", "participating_capped")
        ]
        self.options = [sid for sid in ct.option_ids() if ct.shares_of(sid) > 0]
        self.players = self.converters + self.options
        self.shares = {sid: ct.shares_of(sid) for sid in sec}
        self.ratio = {sid: ct.conversion_ratio(sid) for sid in sec}
        # Preference amount = shares × original issue price × multiple.
        self.pref = {
            sid: self.shares[sid] * sec[sid]["original_issue_price"] * sec[sid]["preference_multiple"]
            for sid in ct.preferred_ids()
        }
        # Cap on total return for capped participating = shares × OIP × cap multiple.
        self.cap_total = {
            sid: self.shares[sid] * sec[sid]["original_issue_price"] * sec[sid]["cap_multiple"]
            for sid in ct.preferred_ids()
            if sec[sid]["participation"] == "participating_capped"
        }
        self.lines = [(h, s, n) for (h, s), n in ct.positions.items() if n > 0]

    def decision_sets(self):
        for bits in itertools.product((False, True), repeat=len(self.players)):
            yield tuple(bits)

    def run(self, exit_value, bits):
        """Waterfall for one fixed set of decisions.

        Returns (per-security totals, common price per share, state flags).
        Option totals are net of strike.
        """
        ct = self.ct
        sec = ct.securities
        d = dict(zip(self.players, bits))
        total = {sid: ZERO for sid in sec}

        # Exercised options pay their strike, which is added to proceeds.
        strike_cash = sum(
            (self.shares[o] * sec[o]["strike"] for o in self.options if d[o]), ZERO
        )
        remaining = exit_value + strike_cash

        # Preferences, tier by tier, most senior first. Within a tier, pari
        # passu: a shortfall is shared pro rata by preference amount.
        tier_full = []
        for tier in ct.seniority:
            claims = {s: self.pref[s] for s in tier if not d.get(s, False) and self.pref[s] > 0}
            need = sum(claims.values(), ZERO)
            if need == 0:
                tier_full.append(None)
                continue
            paid = min(remaining, need)
            for s, c in claims.items():
                total[s] += paid * c / need
            tier_full.append(remaining >= need)
            remaining -= paid

        # Residual: common, exercised options, converted preferred, and
        # participating preferred, all on an exact as-converted basis.
        part = {}
        for sid, s in sec.items():
            if s["kind"] == "common":
                part[sid] = Fraction(self.shares[sid])
            elif s["kind"] == "option":
                if d.get(sid, False):
                    part[sid] = Fraction(self.shares[sid])
            elif d.get(sid, False) or s["participation"] != "non_participating":
                part[sid] = self.shares[sid] * self.ratio[sid]
        part = {k: v for k, v in part.items() if v > 0}

        # Capped participation: preference plus participation stops at the cap.
        room = {
            sid: self.cap_total[sid] - total[sid]
            for sid in self.cap_total
            if sid in part and not d.get(sid, False)
        }
        capped_at = set()
        active = dict(part)
        while True:
            n = sum(active.values(), ZERO)
            p = remaining / n if n else ZERO
            over = [s for s in active if s in room and p * active[s] > room[s]]
            if not over:
                break
            s = min(over, key=lambda k: room[k] / active[k])
            total[s] += room[s]
            remaining -= room[s]
            capped_at.add(s)
            del active[s]
        for s, n_s in active.items():
            total[s] += p * n_s
        common_price = p

        for o in self.options:
            if d[o]:
                total[o] -= self.shares[o] * sec[o]["strike"]

        flags = (tuple(tier_full), tuple(sorted(capped_at)))
        return total, common_price, flags

    def player_value(self, total, sid):
        return total[sid]

    def equilibria(self, exit_value):
        """All stable decision sets at this exit value, deduplicated by payout."""
        results = {}
        for bits in self.decision_sets():
            results[bits] = self.run(exit_value, bits)
        stable = []
        for bits, (total, price, flags) in results.items():
            ok = True
            for i, sid in enumerate(self.players):
                flipped = bits[:i] + (not bits[i],) + bits[i + 1 :]
                if results[flipped][0][sid] > total[sid]:
                    ok = False
                    break
            if ok:
                stable.append((bits, total, price, flags))
        if not stable:
            raise ValueError(f"no stable decision set at exit {exit_value}")
        return stable

    def split_to_lines(self, total):
        """Per holder × security amounts. A security's total splits pro rata by shares."""
        out = {}
        for h, s, n in self.lines:
            out[(h, s)] = total[s] * n / self.shares[s]
        return out

    def evaluate(self, exit_value):
        """Distinct equilibrium outcomes at one exit value.

        Stable decision sets that pay every holder exactly the same are one
        outcome. Its canonical decisions are the ones with the fewest
        conversions and exercises: a series converts, or an option is
        exercised, only when that strictly pays more. The tie-break never
        changes a payout.
        """
        exit_value = Fraction(exit_value)
        groups = {}
        for bits, total, price, flags in self.equilibria(exit_value):
            lines = self.split_to_lines(total)
            key = tuple(sorted(lines.items()))
            groups.setdefault(key, []).append((bits, total, price, flags, lines))
        outcomes = []
        for members in groups.values():
            members.sort(key=lambda m: (sum(m[0]), m[0]))
            bits, total, price, flags, lines = members[0]
            outcomes.append(
                {
                    "decisions": bits,
                    "lines": lines,
                    "totals": total,
                    "common_price": price,
                    "flags": flags,
                }
            )
        outcomes.sort(key=lambda o: o["decisions"])
        return outcomes

    def signature(self, exit_value):
        """Everything that fixes the slope of every payout: decisions, tiers filled, caps binding."""
        return tuple(sorted((o["decisions"], o["flags"]) for o in self.evaluate(exit_value)))

    def payout_vector(self, exit_value):
        outs = self.evaluate(exit_value)
        if len(outs) != 1:
            return None
        lines = outs[0]["lines"]
        return [lines[(h, s)] for h, s, _ in self.lines]
