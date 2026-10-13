#!/usr/bin/env python3
"""Generate or check every fund case's expected.json (packages/fund/cases/fund-*).

    python3 packages/fund/reference/generate.py                       # write every expected.json
    python3 packages/fund/reference/generate.py --check               # fail if any expected.json differs
    python3 packages/fund/reference/generate.py fund-06-full-catch-up # one case only

A case with inputs.json is run as a fund (FC2); a case with fixtures/ is a set of refusals, each a change to a base
case's inputs (FC7).
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fund_ref.case import run_case, run_fixture  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
CASES = ROOT / "packages" / "fund" / "cases"


def render(obj):
    return json.dumps(obj, indent=2) + "\n"


def expected_for(d):
    if (d / "inputs.json").exists():
        return run_case(json.loads((d / "inputs.json").read_text()))
    fixtures = {}
    for f in sorted((d / "fixtures").iterdir()):
        fixture = json.loads(f.read_text())
        base = json.loads((CASES / fixture["base"] / "inputs.json").read_text())
        fixtures[f.name] = run_fixture(fixture, base)
    return {"case": d.name, "generated_by": "packages/fund/reference/generate.py", "fixtures": fixtures}


def main(argv):
    check = "--check" in argv
    names = [a for a in argv if not a.startswith("--")]
    dirs = [CASES / n for n in names] if names else sorted(p for p in CASES.iterdir() if p.name.startswith("fund-"))
    failed = []
    for d in dirs:
        text = render(expected_for(d))
        target = d / "expected.json"
        if check:
            if not target.exists() or target.read_text() != text:
                failed.append(d.name)
                print(f"MISMATCH {d.name}: expected.json differs from the fund reference's output")
            else:
                print(f"ok {d.name}")
        else:
            target.write_text(text)
            print(f"wrote {target.relative_to(ROOT)}")
    if not dirs:
        print("no fund cases found")
        sys.exit(1)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
