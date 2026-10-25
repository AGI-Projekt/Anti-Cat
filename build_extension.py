#!/usr/bin/env python3
"""Build minimal WebExtensions packages from tracked source files."""
from __future__ import annotations
import json, shutil, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent

def build(target: str) -> Path:
    if target not in {"chromium", "firefox"}:
        raise SystemExit("Usage: python build_extension.py [chromium|firefox|all]")
    out = ROOT / "dist" / target
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    manifest = json.loads((ROOT / "manifest" / f"{target}.json").read_text(encoding="utf-8"))
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    copies = {
      "src/background/service-worker.js": "service-worker.js",
      "src/detector/detector.js": "detector.js",
      "src/cleaner/cleaner.js": "cleaner.js",
      "src/kitty-ui/popup.html": "popup.html",
      "src/kitty-ui/popup.js": "popup.js",
      "src/kitty-ui/options.html": "options.html",
      "src/kitty-ui/options.js": "options.js",
      "src/blocker/rules.json": "rules.json",
    }
    for source, dest in copies.items(): shutil.copy2(ROOT / source, out / dest)
    return out

if __name__ == "__main__":
    targets = ["chromium", "firefox"] if len(sys.argv) < 2 or sys.argv[1] == "all" else [sys.argv[1]]
    for target in targets: print(f"Built: {build(target)}")
