#!/usr/bin/env python3
"""Build loadable WebExtension profiles from the CAT 1.0.0 source tree."""
from __future__ import annotations
import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPECTED_VERSION = "1.0.0"
PROFILES = {
    "chromium": ROOT / "manifest" / "chromium.json",
    "firefox": ROOT / "manifest" / "firefox.json",
}
FILE_MAP = {
    "src/background/service-worker.js": "service-worker.js",
    "src/detector/detector.js": "detector.js",
    "src/cleaner/cleaner.js": "cleaner.js",
    "src/blocker/rules.json": "rules.json",
    "src/kitty-ui/popup.html": "popup.html",
    "src/kitty-ui/popup.js": "popup.js",
    "src/kitty-ui/options.html": "options.html",
    "src/kitty-ui/options.js": "options.js",
}


def build(profile: str, output: Path) -> Path:
    manifest_path = PROFILES[profile]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("manifest_version") != 3 or manifest.get("version") != EXPECTED_VERSION:
        raise ValueError(f"Nieprawidłowy manifest profilu {profile}; wymagany Manifest V3 i wersja {EXPECTED_VERSION}.")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for source, target in FILE_MAP.items():
        src = ROOT / source
        if not src.is_file():
            raise FileNotFoundError(f"Brak pliku źródłowego: {source}")
        shutil.copy2(src, output / target)
    shutil.copytree(ROOT / "public" / "icons", output / "icons")
    shutil.copy2(manifest_path, output / "manifest.json")
    shutil.copy2(ROOT / "docs" / "EXTENSION_README_PL.md", output / "README_PL.md")

    # Validate every manifest reference before declaring a build successful.
    for icon in manifest.get("icons", {}).values():
        if not (output / icon).is_file():
            raise FileNotFoundError(f"Manifest wskazuje brakującą ikonę: {icon}")
    for icon in manifest.get("action", {}).get("default_icon", {}).values():
        if not (output / icon).is_file():
            raise FileNotFoundError(f"Manifest wskazuje brakującą ikonę akcji: {icon}")
    popup = manifest.get("action", {}).get("default_popup")
    if popup and not (output / popup).is_file():
        raise FileNotFoundError(f"Manifest wskazuje brakujący popup: {popup}")
    options = manifest.get("options_page")
    if not options or not (output / options).is_file():
        raise FileNotFoundError("Manifest wskazuje brakującą stronę opcji.")
    background = manifest.get("background", {})
    scripts = [background["service_worker"]] if background.get("service_worker") else background.get("scripts", [])
    for script in scripts:
        if not (output / script).is_file():
            raise FileNotFoundError(f"Manifest wskazuje brakujący skrypt tła: {script}")
    for item in manifest.get("content_scripts", []):
        for script in item.get("js", []):
            if not (output / script).is_file():
                raise FileNotFoundError(f"Manifest wskazuje brakujący content script: {script}")
    for resource in manifest.get("declarative_net_request", {}).get("rule_resources", []):
        path = output / resource.get("path", "")
        if not path.is_file():
            raise FileNotFoundError(f"Brak zestawu reguł DNR: {resource.get('id')}")
        rules = json.loads(path.read_text(encoding="utf-8"))
        ids = [rule.get("id") for rule in rules if isinstance(rule, dict)]
        if len(ids) != len(set(ids)):
            raise ValueError(f"Zduplikowane ID reguł w {path.name}.")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", choices=["chromium", "firefox", "all"], nargs="?", default="chromium")
    args = parser.parse_args()
    if args.profile == "chromium":
        print(f"Chromium bundle: {build('chromium', ROOT / 'browser-extension')}")
    elif args.profile == "firefox":
        print(f"Firefox experimental bundle: {build('firefox', ROOT / 'dist' / 'firefox')}")
    else:
        chromium = build("chromium", ROOT / "browser-extension")
        chromium_dist = build("chromium", ROOT / "dist" / "chromium")
        firefox = build("firefox", ROOT / "dist" / "firefox")
        print(f"Chromium loadable bundle: {chromium}\nChromium release copy: {chromium_dist}\nFirefox experimental bundle: {firefox}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
