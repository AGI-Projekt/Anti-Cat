#!/usr/bin/env python3
"""CAT 1.0.0 release gate: static, manifest, bundle, privacy and version checks.

This gate does not claim that end-to-end browser tests have been run. Those results
must be recorded manually in docs/BROWSER_REGRESSION_1.0.0_PL.md.
"""
from __future__ import annotations
import ast
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPECTED = "1.0.0"
ERRORS: list[str] = []
CHECKS: list[str] = []


def check(condition: bool, ok: str, fail: str) -> None:
    (CHECKS if condition else ERRORS).append(ok if condition else fail)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        ERRORS.append(f"{path.relative_to(ROOT)}: niepoprawny JSON ({exc})")
        return {}


def validate_bundle(bundle: Path, label: str) -> None:
    mp = bundle / "manifest.json"
    check(mp.is_file(), f"{label}: manifest istnieje", f"{label}: brak manifest.json")
    if not mp.is_file():
        return
    manifest = load_json(mp)
    check(manifest.get("manifest_version") == 3, f"{label}: Manifest V3", f"{label}: oczekiwano Manifest V3")
    check(manifest.get("version") == EXPECTED, f"{label}: wersja {EXPECTED}", f"{label}: wersja {manifest.get('version')!r}, oczekiwano {EXPECTED}")
    for icon in manifest.get("icons", {}).values():
        check((bundle / icon).is_file(), f"{label}: ikona {icon}", f"{label}: brak ikony {icon}")
    for icon in manifest.get("action", {}).get("default_icon", {}).values():
        check((bundle / icon).is_file(), f"{label}: ikona akcji {icon}", f"{label}: brak ikony akcji {icon}")
    popup = manifest.get("action", {}).get("default_popup")
    if popup:
        check((bundle / popup).is_file(), f"{label}: popup {popup}", f"{label}: brak popupu {popup}")
    options = manifest.get("options_page")
    check(bool(options) and (bundle / options).is_file(), f"{label}: strona opcji istnieje", f"{label}: brak strony opcji")
    bg = manifest.get("background", {})
    scripts = [bg["service_worker"]] if bg.get("service_worker") else bg.get("scripts", [])
    check(bool(scripts), f"{label}: skrypty tła zadeklarowane", f"{label}: brak skryptu tła")
    for script in scripts:
        check((bundle / script).is_file(), f"{label}: skrypt tła {script}", f"{label}: brak skryptu tła {script}")
    for item in manifest.get("content_scripts", []):
        for script in item.get("js", []):
            check((bundle / script).is_file(), f"{label}: content script {script}", f"{label}: brak content script {script}")
    permissions = set(manifest.get("permissions", []))
    allowed = {"storage", "declarativeNetRequest", "activeTab", "alarms"}
    check(permissions <= allowed, f"{label}: brak nieoczekiwanych uprawnień", f"{label}: nieoczekiwane uprawnienia: {sorted(permissions - allowed)}")
    host = manifest.get("host_permissions", [])
    check(not host, f"{label}: brak stałych host_permissions", f"{label}: stałe host_permissions: {host}")
    optional = manifest.get("optional_host_permissions", [])
    check(all(x == "https://*/*" for x in optional), f"{label}: hosty zewnętrzne wyłącznie jako opcjonalne HTTPS", f"{label}: sprawdź optional_host_permissions: {optional}")
    resources = manifest.get("declarative_net_request", {}).get("rule_resources", [])
    check(bool(resources), f"{label}: zasób reguł DNR zadeklarowany", f"{label}: brak zasobu DNR")
    for resource in resources:
        resource_path = bundle / resource.get("path", "")
        check(resource_path.is_file(), f"{label}: plik reguł {resource.get('id')}", f"{label}: brak pliku reguł {resource_path.name}")
        if resource_path.is_file():
            rules = load_json(resource_path)
            check(isinstance(rules, list), f"{label}: reguły mają typ listy", f"{label}: reguły nie są listą")
            ids = [r.get("id") for r in rules if isinstance(r, dict)]
            check(len(ids) == len(set(ids)), f"{label}: unikalne ID reguł", f"{label}: powielone ID reguł")
            check(all(isinstance(i, int) and i > 0 for i in ids), f"{label}: dodatnie całkowite ID reguł", f"{label}: nieprawidłowe ID reguł")


def main() -> int:
    version_file = ROOT / "VERSION"
    check(version_file.is_file() and version_file.read_text(encoding="utf-8").strip() == EXPECTED,
          "VERSION wskazuje 1.0.0", "VERSION jest nieobecny lub niezgodny")
    package = load_json(ROOT / "package.json")
    contracts = load_json(ROOT / "src/shared/contracts.json")
    schema = load_json(ROOT / "src/storage/schema.json")
    check(package.get("version") == EXPECTED, "package.json ma wersję 1.0.0", "package.json ma niezgodną wersję")
    check(contracts.get("version") == EXPECTED, "kontrakty mają wersję 1.0.0", "kontrakty mają niezgodną wersję")
    app_source = (ROOT / "cat_app.py").read_text(encoding="utf-8")
    check(f'APP_VERSION = "{EXPECTED}"' in app_source, "panel desktopowy ma wersję 1.0.0", "wersja panelu desktopowego jest niezgodna")
    installer_source = (ROOT / "installer/CatKittyEdition.iss").read_text(encoding="utf-8")
    check(f'#define MyAppVersion "{EXPECTED}"' in installer_source, "konfiguracja instalatora ma wersję 1.0.0", "wersja instalatora jest niezgodna")
    popup_html = (ROOT / "src/kitty-ui/popup.html").read_text(encoding="utf-8")
    options_html = (ROOT / "src/kitty-ui/options.html").read_text(encoding="utf-8")
    check(EXPECTED in popup_html and EXPECTED in options_html, "interfejs pokazuje wersję 1.0.0", "wersja w interfejsie nie jest zgodna")
    check(contracts.get("release", {}).get("channel") == "stable", "kontrakt oznacza kanał stable", "brak stable release metadata")
    check("release_readiness_gate" in contracts.get("features", []), "kontrakt opisuje Release Gate", "brak release_readiness_gate w kontrakcie")
    check(schema.get("limits", {}).get("max_filter_preview_bytes") == 262144, "limit podglądu wynosi 256 KiB", "limit podglądu niezgodny")
    for profile in ("chromium", "firefox"):
        manifest = load_json(ROOT / f"manifest/{profile}.json")
        check(manifest.get("version") == EXPECTED, f"manifest źródłowy {profile} ma wersję 1.0.0", f"manifest źródłowy {profile} ma niezgodną wersję")
    for bundle, label in ((ROOT / "browser-extension", "Chromium dev bundle"), (ROOT / "dist/chromium", "Chromium release bundle"), (ROOT / "dist/firefox", "Firefox experimental bundle")):
        validate_bundle(bundle, label)

    mapping = {
        "src/background/service-worker.js": "service-worker.js",
        "src/detector/detector.js": "detector.js",
        "src/cleaner/cleaner.js": "cleaner.js",
        "src/blocker/rules.json": "rules.json",
        "src/kitty-ui/popup.html": "popup.html",
        "src/kitty-ui/popup.js": "popup.js",
        "src/kitty-ui/options.html": "options.html",
        "src/kitty-ui/options.js": "options.js",
    }
    for source, output in mapping.items():
        source_path = ROOT / source
        bundle_path = ROOT / "browser-extension" / output
        check(source_path.is_file() and bundle_path.is_file() and source_path.read_bytes() == bundle_path.read_bytes(),
              f"źródło zgodne z Chromium: {output}", f"rozbieżność źródła i Chromium: {output}")
        for profile in ("chromium", "firefox"):
            built = ROOT / "dist" / profile / output
            check(source_path.is_file() and built.is_file() and source_path.read_bytes() == built.read_bytes(),
                  f"źródło zgodne z {profile}: {output}", f"rozbieżność źródła i {profile}: {output}")

    worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
    options_js = (ROOT / "src/kitty-ui/options.js").read_text(encoding="utf-8")
    cleaner = (ROOT / "src/cleaner/cleaner.js").read_text(encoding="utf-8")
    detector = (ROOT / "src/detector/detector.js").read_text(encoding="utf-8")
    check('credentials: "omit"' in worker, "pobieranie źródeł pomija credentials", "brak credentials: omit")
    check('redirect: "error"' in worker, "przekierowania źródeł są odrzucane", "brak redirect: error")
    check("innerHTML" not in options_js and "innerHTML" not in (ROOT / "src/kitty-ui/popup.js").read_text(encoding="utf-8"),
          "UI nie używa innerHTML", "wykryto innerHTML w UI")
    check("element.remove()" not in cleaner and "parentElement.remove()" not in cleaner,
          "Cleaner nie usuwa węzłów strony", "Cleaner może usuwać węzły strony")
    check('verdict: "REVIEW"' in detector, "detektor zachowuje werdykt REVIEW", "brak ostrożnej ścieżki REVIEW")
    check("telemetry_default" in contracts.get("privacy", {}) and contracts["privacy"].get("telemetry_default") is False,
          "telemetria domyślnie wyłączona", "telemetria nie jest jawnie wyłączona w kontrakcie")
    check(contracts.get("privacy", {}).get("full_url_logging_default") is False,
          "pełne URL domyślnie nie są logowane", "kontrakt nie wyłącza logowania pełnych URL")
    browser_doc = ROOT / "docs/BROWSER_REGRESSION_1.0.0_PL.md"
    check(browser_doc.is_file(), "checklista ręcznych testów 1.0.0 istnieje", "brak checklisty ręcznych testów 1.0.0")
    if browser_doc.is_file():
        browser_text = browser_doc.read_text(encoding="utf-8")
        check("Nie oznaczaj testu jako PASS" in browser_text, "checklista zakazuje fałszywego PASS", "checklista nie wyjaśnia kryterium PASS")
        check("NOT RUN" in browser_text and "Firefox" in browser_text and "Chrome/Edge" in browser_text,
              "checklista oddziela testy przeglądarek i stan NOT RUN", "niepełna macierz testów przeglądarek")
    workflow = ROOT / ".github/workflows/ci.yml"
    check(workflow.is_file(), "workflow CI istnieje", "brak workflow CI")
    if workflow.is_file():
        workflow_text = workflow.read_text(encoding="utf-8")
        check("ubuntu-latest" in workflow_text and "windows-latest" in workflow_text,
              "CI obejmuje Windows i Linux", "CI nie obejmuje Windows i Linux")

    # Runtime test runs may create transient bytecode in a working tree; the release packager
    # must exclude it. Check the ignore policy and packager contract here.
    ignore_text = (ROOT / ".gitignore").read_text(encoding="utf-8") if (ROOT / ".gitignore").is_file() else ""
    packager_text = (ROOT / "package_release.py").read_text(encoding="utf-8") if (ROOT / "package_release.py").is_file() else ""
    check("__pycache__/" in ignore_text and "*.pyc" in ignore_text, "cache Python jest ignorowany", "brak reguł ignorowania cache Python")
    check("__pycache__" in packager_text and ".pyc" in packager_text, "pakowacz wyklucza cache Python", "pakowacz nie wyklucza cache Python")

    report = {
        "version": EXPECTED,
        "channel": "stable",
        "status": "PASS" if not ERRORS else "FAIL",
        "checks_passed": len(CHECKS),
        "errors": ERRORS,
        "checks": CHECKS,
        "browser_e2e": "NOT RUN - manual verification required",
    }
    out = ROOT / "dist/RELEASE_GATE_1.0.0.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"CAT Release Gate {EXPECTED}: {report['status']} ({len(CHECKS)} checks, {len(ERRORS)} errors)")
    print(f"Browser E2E: {report['browser_e2e']}")
    for error in ERRORS:
        print("ERROR:", error)
    print(f"Report: {out.relative_to(ROOT)}")
    return 0 if not ERRORS else 1


if __name__ == "__main__":
    raise SystemExit(main())
