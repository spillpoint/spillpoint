"""Brute-force exit waterfall.

At each exit value, try every combination of decisions (each convertible
preferred series, or conversion group, converts or not; each option strike
class and each warrant exercises or not), run the waterfall for each, and keep
the combinations that are stable: no single decision-maker would be better
off flipping its own decision.

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
        # Convertible series: non-participating and capped participating.
        # Participating uncapped preferred never converts (SPEC).
        convertible = [
            sid
            for sid in ct.preferred_ids()
            if sec[sid]["participation"] in ("non_participating", "participating_capped")
        ]
        # Conversion groups (SPEC toggle): series that must convert together,
        # as when a class vote forces conversion. The group converts only if
        # holders of more than (or at least) the threshold share of its
        # as-converted shares each do strictly better converting; a holder who
        # is indifferent votes to stay.
        self.members = {}
        self.vote = {}
        grouped = set()
        for g in ct.conversion_groups:
            pid = "+".join(g["series"])
            self.members[pid] = list(g["series"])
            self.vote[pid] = g
            grouped.update(g["series"])
        for sid in convertible:
            if sid not in grouped:
                self.members[sid] = [sid]
        order = {sid: i for i, sid in enumerate(convertible)}
        self.converters = sorted(self.members, key=lambda p: order[self.members[p][0]])
        self.options = [sid for sid in ct.option_ids() if ct.shares_of(sid) > 0]
        self.warrants = [sid for sid in ct.warrant_ids() if ct.shares_of(sid) > 0]
        self.players = self.converters + self.options + self.warrants
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
        # Voting weight in each group: a holder's as-converted shares of its series.
        self.voters = {}
        for pid, members in self.members.items():
            if pid in self.vote:
                weights = {}
                for h, s, n in self.lines:
                    if s in members:
                        weights[h] = weights.get(h, ZERO) + n * self.ratio[s]
                self.voters[pid] = weights

    def holder_group_payout(self, total, pid, holder):
        """What one holder receives on its shares of a conversion group's series."""
        members = self.members[pid]
        return sum(
            (total[s] * n / self.shares[s] for h, s, n in self.lines if h == holder and s in members),
            ZERO,
        )

    def vote_converts(self, pid, total_convert, total_stay):
        """Class vote: do holders of enough of the group's shares each do strictly better converting?"""
        g = self.vote[pid]
        weights = self.voters[pid]
        yes = sum(
            (w for h, w in weights.items()
             if self.holder_group_payout(total_convert, pid, h) > self.holder_group_payout(total_stay, pid, h)),
            ZERO,
        )
        share = yes / sum(weights.values(), ZERO)
        return share > g["threshold"] if g["rule"] == "more_than" else share >= g["threshold"]

    def decision_sets(self):
        for bits in itertools.product((False, True), repeat=len(self.players)):
            yield tuple(bits)

    def unit_shares(self, bits):
        """Shares of each preferred series, counting exercised warrants for that series."""
        d = dict(zip(self.players, bits))
        units = {sid: self.shares[sid] for sid in self.ct.preferred_ids()}
        for w in self.warrants:
            u = self.ct.securities[w]["underlying"]
            if d[w] and u != "common":
                units[u] += self.shares[w]
        return units

    def run(self, exit_value, bits):
        """Waterfall for one fixed set of decisions.

        Returns (per-security totals, common price per share, state flags).
        Option and warrant totals are net of strike.
        """
        ct = self.ct
        sec = ct.securities
        d = dict(zip(self.players, bits))
        converted = {s: d[p] for p in self.converters for s in self.members[p]}
        total = {sid: ZERO for sid in sec}

        # Warrant for preferred: once exercised, its shares are shares of that
        # series, with the series' per-share preference, participation, cap,
        # and conversion. Preference is per share at the series' original
        # issue price, not the warrant's strike.
        units = self.unit_shares(bits)
        oip = {s: sec[s]["original_issue_price"] for s in units}
        pref = {s: units[s] * oip[s] * sec[s]["preference_multiple"] for s in units}
        cap_total = {s: units[s] * oip[s] * sec[s]["cap_multiple"] for s in self.cap_total}

        # Exercised options and warrants pay their strike, which is added to proceeds.
        exercised = [x for x in self.options + self.warrants if d[x]]
        strike_cash = sum((self.shares[x] * sec[x]["strike"] for x in exercised), ZERO)
        remaining = exit_value + strike_cash

        # Preferences, tier by tier, most senior first. Within a tier, pari
        # passu: a shortfall is shared pro rata by preference amount.
        tier_full = []
        for tier in ct.seniority:
            claims = {s: pref[s] for s in tier if not converted.get(s, False) and pref[s] > 0}
            need = sum(claims.values(), ZERO)
            if need == 0:
                tier_full.append(None)
                continue
            paid = min(remaining, need)
            for s, c in claims.items():
                total[s] += paid * c / need
            tier_full.append(remaining >= need)
            remaining -= paid

        # Residual: common, exercised options and common warrants, converted
        # preferred, and participating preferred, all on an exact as-converted basis.
        part = {}
        for sid, s in sec.items():
            if s["kind"] == "common":
                part[sid] = Fraction(self.shares[sid])
            elif s["kind"] in ("option", "warrant"):
                if d.get(sid, False) and (s["kind"] == "option" or s["underlying"] == "common"):
                    part[sid] = Fraction(self.shares[sid])
            elif converted.get(sid, False) or s["participation"] != "non_participating":
                part[sid] = units[sid] * self.ratio[sid]
        part = {k: v for k, v in part.items() if v > 0}

        # Capped participation: preference plus participation stops at the cap.
        room = {
            sid: cap_total[sid] - total[sid]
            for sid in cap_total
            if sid in part and not converted.get(sid, False)
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

        # Split each series' total between its original shares and the shares
        # from exercised warrants for it, pro rata by shares.
        for w in self.warrants:
            u = sec[w]["underlying"]
            if d[w] and u != "common":
                part_w = total[u] * self.shares[w] / units[u]
                total[w] += part_w
                total[u] -= part_w

        for x in exercised:
            total[x] -= self.shares[x] * sec[x]["strike"]

        flags = (tuple(tier_full), tuple(sorted(capped_at)))
        return total, common_price, flags

    def player_value(self, total, player):
        if player in self.members:
            return sum((total[s] for s in self.members[player]), ZERO)
        return total[player]

    def equilibria(self, exit_value):
        """All stable decision sets at this exit value."""
        results = {}
        for bits in self.decision_sets():
            results[bits] = self.run(exit_value, bits)
        stable = []
        for bits, (total, price, flags) in results.items():
            ok = True
            for i, player in enumerate(self.players):
                flipped = bits[:i] + (not bits[i],) + bits[i + 1 :]
                if player in self.vote:
                    on, off = (bits, flipped) if bits[i] else (flipped, bits)
                    if self.vote_converts(player, results[on][0], results[off][0]) != bits[i]:
                        ok = False
                        break
                elif self.player_value(results[flipped][0], player) > self.player_value(total, player):
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
        conversions and exercises: a series converts, or an option or warrant
        is exercised, only when that strictly pays more. The tie-break never
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
