#!/usr/bin/env python3
"""Generate or check every case's expected.json from its inputs.json.

    python3 reference/generate.py            # write cases/*/expected.json
    python3 reference/generate.py --check    # fail if any expected.json differs
    python3 reference/generate.py millrace   # one case only
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from spillpoint_ref.case import run_case  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CASES = ROOT / "cases"


def render(obj):
    return json.dumps(obj, indent=2) + "\n"


def main(argv):
    check = "--check" in argv
    names = [a for a in argv if not a.startswith("--")]
    dirs = [CASES / n for n in names] if names else sorted(p for p in CASES.iterdir() if (p / "inputs.json").exists())
    failed = []
    for d in dirs:
        inputs = json.loads((d / "inputs.json").read_text())
        text = render(run_case(inputs))
        target = d / "expected.json"
        if check:
            if not target.exists() or target.read_text() != text:
                failed.append(d.name)
                print(f"MISMATCH {d.name}: expected.json differs from the reference output")
            else:
                print(f"ok {d.name}")
        else:
            target.write_text(text)
            print(f"wrote {target.relative_to(ROOT)}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
