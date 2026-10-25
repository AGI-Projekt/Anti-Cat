import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RemoteFilterSourceContractTests(unittest.TestCase):
    def test_manifests_declare_minimum_permissions_and_optional_origin_access(self):
        for profile in ("chromium.json", "firefox.json"):
            manifest = json.loads((ROOT / "manifest" / profile).read_text(encoding="utf-8"))
            self.assertIn("alarms", manifest["permissions"])
            self.assertEqual(manifest["optional_host_permissions"], ["https://*/*"])
            self.assertEqual(manifest["version"], "1.0.0")

    def test_source_fetch_has_transport_and_resource_limits(self):
        worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
        self.assertIn('url.protocol !== "https:"', worker)
        self.assertIn('credentials: "omit"', worker)
        self.assertIn('redirect: "error"', worker)
        self.assertIn("const MAX_SOURCE_BYTES = 256 * 1024;", worker)
        self.assertIn("const FETCH_TIMEOUT_MS = 15000;", worker)
        self.assertIn("TextDecoder(\"utf-8\", { fatal: true })", worker)
        self.assertIn("crypto.subtle.digest(\"SHA-256\"", worker)

    def test_refresh_is_validate_then_commit_and_rollback_keeps_remote_cache(self):
        worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
        self.assertIn("// All sources are fetched and validated before the current rule set changes.", worker)
        self.assertIn("A failure never replaces the prior remote cache or active rules.", worker)
        self.assertIn('case "CAT_ROLLBACK_FILTERS"', worker)
        self.assertIn("remoteFilterCache", worker)
        self.assertIn("FILTER_UPDATE_ALARM", worker)

    def test_settings_expose_source_hash_and_schedule_controls(self):
        html = (ROOT / "src/kitty-ui/options.html").read_text(encoding="utf-8")
        js = (ROOT / "src/kitty-ui/options.js").read_text(encoding="utf-8")
        for element_id in (
            "filter-source-url", "filter-source-sha256", "filter-source-checksum-url",
            "add-filter-source", "filter-auto-update", "filter-update-interval",
            "save-filter-schedule", "update-filter-sources", "filter-source-list"
        ):
            self.assertIn(f'id="{element_id}"', html)
        for message in ("CAT_ADD_FILTER_SOURCE", "CAT_UPDATE_FILTER_SOURCES", "CAT_SET_FILTER_UPDATE_SCHEDULE", "CAT_REMOVE_FILTER_SOURCE"):
            self.assertIn(message, js)
        self.assertIn("chrome.permissions.request", js)

    def test_limits_and_privacy_schema_are_current(self):
        schema = json.loads((ROOT / "src/storage/schema.json").read_text(encoding="utf-8"))
        contracts = json.loads((ROOT / "src/shared/contracts.json").read_text(encoding="utf-8"))
        self.assertEqual(schema["limits"]["max_filter_sources"], 5)
        self.assertEqual(schema["limits"]["max_source_bytes"], 262144)
        self.assertEqual(schema["limits"]["max_active_filter_domains"], 1000)
        self.assertFalse(schema["defaults"]["filterAutoUpdate"])
        self.assertIn("sha256_validation", contracts["features"])
        self.assertFalse(contracts["privacy"]["telemetry_default"])

    def test_abp_subset_parser_options_limits_and_safe_skip_are_present(self):
        worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
        self.assertIn("function parseAdblockNetworkRule", worker)
        self.assertIn("const MAX_ACTIVE_NETWORK_RULES = 500", worker)
        self.assertIn("NETWORK_RULE_BASE", worker)
        self.assertIn("domainType", worker)
        self.assertIn("excludedInitiatorDomains", worker)
        self.assertIn("skippedRules", worker)
        readme = (ROOT / "README_PL.md").read_text(encoding="utf-8")
        self.assertIn("ograniczony podzbiór sieciowych reguł Adblock Plus", readme)
        self.assertIn("Filtry kosmetyczne", readme)


if __name__ == "__main__":
    unittest.main()
