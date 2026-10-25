import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ProjectContractTests(unittest.TestCase):
    def test_profiles_have_expected_runtime_shape(self):
        chromium = json.loads((ROOT / "manifest/chromium.json").read_text(encoding="utf-8"))
        firefox = json.loads((ROOT / "manifest/firefox.json").read_text(encoding="utf-8"))
        self.assertEqual(chromium["manifest_version"], 3)
        self.assertIn("service_worker", chromium["background"])
        self.assertIn("scripts", firefox["background"])
        self.assertNotIn("service_worker", firefox["background"])
        for manifest in (chromium, firefox):
            self.assertEqual(manifest["version"], "1.0.0")
            self.assertIn("storage", manifest["permissions"])
            self.assertIn("declarativeNetRequest", manifest["permissions"])
            self.assertEqual(manifest["declarative_net_request"]["rule_resources"][0]["id"], "cat_ads")
            self.assertEqual(manifest["content_scripts"][0]["js"], ["detector.js", "cleaner.js"])

    def test_detector_is_conservative_and_cleaner_is_reversible(self):
        detector = (ROOT / "src/detector/detector.js").read_text(encoding="utf-8")
        cleaner = (ROOT / "src/cleaner/cleaner.js").read_text(encoding="utf-8")
        self.assertIn('verdict: "REVIEW"', detector)
        self.assertIn('category: "sponsored_label"', detector)
        self.assertIn('element.setAttribute(HIDDEN_ATTR, "1")', cleaner)
        self.assertIn('removeAttribute(HIDDEN_ATTR)', cleaner)
        self.assertIn('new MutationObserver((mutations) =>', cleaner)
        self.assertIn('scheduleScan([document])', cleaner)
        # The cleaner must not delete matched page nodes.
        self.assertNotIn("element.remove()", cleaner)
        self.assertNotIn("element.parentElement.remove()", cleaner)

    def test_privacy_contract_has_no_telemetry_and_bounded_log(self):
        schema = json.loads((ROOT / "src/storage/schema.json").read_text(encoding="utf-8"))
        contracts = json.loads((ROOT / "src/shared/contracts.json").read_text(encoding="utf-8"))
        self.assertEqual(schema["limits"]["max_log_events"], 100)
        self.assertFalse(contracts["privacy"]["telemetry_default"])
        self.assertFalse(contracts["privacy"]["full_url_logging_default"])
        worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
        self.assertIn("slice(-MAX_LOG_EVENTS)", worker)
        self.assertIn("redirect: \"error\"", worker)
        self.assertIn("credentials: \"omit\"", worker)
        self.assertIn("MAX_SOURCE_BYTES = 256 * 1024", worker)
        self.assertIn("filter_sources_update_failed", worker)


    def test_built_chromium_bundle_matches_sources(self):
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
        for source, packaged in mapping.items():
            self.assertEqual((ROOT / source).read_bytes(), (ROOT / "browser-extension" / packaged).read_bytes(), packaged)

    def test_settings_export_import_contract_is_present(self):
        html = (ROOT / "src/kitty-ui/options.html").read_text(encoding="utf-8")
        js = (ROOT / "src/kitty-ui/options.js").read_text(encoding="utf-8")
        self.assertIn('id="export-settings"', html)
        self.assertIn('id="import-settings"', html)
        self.assertIn('format: "cat-kitty-settings"', js)
        self.assertIn("file.size > 256 * 1024", js)
        self.assertIn("payload.exceptions.length > 100", js)
        self.assertIn("CAT_SAVE_EXCEPTIONS", js)

    def test_rule_version_and_release_version_are_aligned(self):
        worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
        self.assertIn('RULES_VERSION = "2026.10.25.8"', worker)
        for manifest_name in ("chromium.json", "firefox.json"):
            manifest = json.loads((ROOT / "manifest" / manifest_name).read_text(encoding="utf-8"))
            self.assertEqual(manifest["version"], "1.0.0")

    def test_domain_exceptions_have_hard_limit_and_dnr_priority(self):
        worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
        self.assertIn("MAX_EXCEPTION_SITES = 100", worker)
        self.assertIn("initiatorDomains: [domain]", worker)
        self.assertIn("priority: 1000", worker)

if __name__ == "__main__":
    unittest.main()


class ABPSubsetUiContractTests(unittest.TestCase):
    def test_ui_reports_supported_and_skipped_network_rules(self):
        js = (ROOT / "src/kitty-ui/options.js").read_text(encoding="utf-8")
        self.assertIn("activeFilterRuleCount", js)
        self.assertIn("skippedFilterRuleCount", js)
        self.assertIn("response.remoteRuleCount", js)
