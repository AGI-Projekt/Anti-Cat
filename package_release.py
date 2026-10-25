#!/usr/bin/env python3
"""Create reproducible CAT 1.0.0 project/browser ZIPs and SHA-256 checksums."""
from __future__ import annotations
import argparse
import hashlib
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
PROJECT_NAME = f"Cat-Kitty-Edition-{VERSION}"
EXCLUDED_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", "dist-installer"}
EXCLUDED_FILES = {".DS_Store", "Thumbs.db"}


def should_include(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if any(part in EXCLUDED_DIRS for part in rel.parts):
        return False
    if path.name in EXCLUDED_FILES or path.suffix == ".pyc":
        return False
    if path.is_symlink():
        return False
    return path.is_file()


def project_files() -> list[Path]:
    return sorted((p for p in ROOT.rglob("*") if should_include(p)), key=lambda p: p.relative_to(ROOT).as_posix())


def write_project_zip(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for path in project_files():
            rel = path.relative_to(ROOT).as_posix()
            archive.write(path, f"{PROJECT_NAME}/{rel}")


def write_bundle_zip(bundle: Path, output: Path) -> None:
    if not (bundle / "manifest.json").is_file():
        raise FileNotFoundError(f"Brak manifest.json w {bundle}")
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(bundle.rglob("*"), key=lambda p: p.relative_to(bundle).as_posix()):
            if should_include_bundle_path(path, bundle):
                archive.write(path, path.relative_to(bundle).as_posix())


def should_include_bundle_path(path: Path, base: Path) -> bool:
    if not path.is_file() or path.is_symlink() or path.suffix == ".pyc" or path.name in EXCLUDED_FILES:
        return False
    if any(part in EXCLUDED_DIRS for part in path.relative_to(base).parts):
        return False
    return True


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build_release(output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs = [
        output_dir / f"{PROJECT_NAME}.zip",
        output_dir / f"{PROJECT_NAME}-Chromium-Extension.zip",
        output_dir / f"{PROJECT_NAME}-Firefox-Experimental.zip",
    ]
    write_project_zip(outputs[0])
    write_bundle_zip(ROOT / "browser-extension", outputs[1])
    write_bundle_zip(ROOT / "dist" / "firefox", outputs[2])
    sums = output_dir / f"{PROJECT_NAME}-SHA256SUMS.txt"
    sums.write_text("".join(f"{sha256(path)}  {path.name}\n" for path in outputs), encoding="utf-8")
    return outputs + [sums]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT.parent / "release-artifacts", help="folder for release ZIPs and checksums")
    args = parser.parse_args()
    outputs = build_release(args.output.resolve())
    for path in outputs:
        print(f"{path} ({path.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
