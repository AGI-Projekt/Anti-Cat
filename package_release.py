#!/usr/bin/env python3
"""Build extension profiles and reproducible ZIP packages."""
from __future__ import annotations
import hashlib, json, zipfile
from pathlib import Path
from build_extension import build
ROOT = Path(__file__).resolve().parent
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
OUT = ROOT / "release-artifacts"
OUT.mkdir(exist_ok=True)
def zip_dir(source: Path, dest: Path, prefix: str):
    with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(source.rglob("*")):
            if file.is_file(): archive.write(file, f"{prefix}/{file.relative_to(source).as_posix()}")
def main():
    profiles = {target: build(target) for target in ("chromium", "firefox")}
    artifacts = []
    for target, folder in profiles.items():
        path = OUT / f"Cat-Kitty-Edition-{VERSION}-{target.title()}.zip"
        zip_dir(folder, path, f"Cat-Kitty-Edition-{VERSION}-{target}")
        artifacts.append(path)
    source_zip = OUT / f"Cat-Kitty-Edition-{VERSION}-Source.zip"
    with zipfile.ZipFile(source_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(ROOT.rglob("*")):
            if not file.is_file() or OUT in file.parents or ".git" in file.parts or "__pycache__" in file.parts or file.suffix == ".pyc": continue
            archive.write(file, f"Cat-Kitty-Edition-{VERSION}/{file.relative_to(ROOT).as_posix()}")
    artifacts.append(source_zip)
    lines = []
    for file in artifacts:
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        lines.append(f"{digest}  {file.name}")
    sums = OUT / f"Cat-Kitty-Edition-{VERSION}-SHA256SUMS.txt"
    sums.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Release artifacts:")
    for file in [*artifacts, sums]: print(f"- {file}")
if __name__ == "__main__": main()
