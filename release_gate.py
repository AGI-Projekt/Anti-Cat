#!/usr/bin/env python3
"""Static release checks for CAT Kitty Edition."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent
errors = []
def check(condition, message):
    if not condition: errors.append(message)
for target in ("chromium", "firefox"):
    path = ROOT / "manifest" / f"{target}.json"
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
        check(manifest.get("manifest_version") == 3, f"{target}: expected Manifest V3")
        check(manifest.get("version") == (ROOT / "VERSION").read_text().strip(), f"{target}: version mismatch")
        check("storage" in manifest.get("permissions", []), f"{target}: storage permission missing")
    except Exception as exc:
        errors.append(f"{target}: manifest invalid: {exc}")
try:
    rules = json.loads((ROOT / "src/blocker/rules.json").read_text(encoding="utf-8"))
    ids = [rule.get("id") for rule in rules]
    check(len(ids) == len(set(ids)), "duplicate DNR rule IDs")
    check(all(isinstance(i, int) and i > 0 for i in ids), "DNR rule IDs must be positive integers")
except Exception as exc:
    errors.append(f"rules.json invalid: {exc}")
for rel in ("src/background/service-worker.js", "src/detector/detector.js", "src/cleaner/cleaner.js", "src/kitty-ui/popup.html", "src/kitty-ui/options.html"):
    check((ROOT / rel).is_file(), f"required source missing: {rel}")
if errors:
    print("RELEASE GATE: FAIL")
    print("\n".join(f"- {e}" for e in errors))
    sys.exit(1)
print("RELEASE GATE: PASS — manifest, rules and source inventory valid")
