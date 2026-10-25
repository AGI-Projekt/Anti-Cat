import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class FilterPreviewContractTests(unittest.TestCase):
    def test_worker_has_read_only_preview_with_byte_limit(self):
        worker = (ROOT / "src/background/service-worker.js").read_text(encoding="utf-8")
        self.assertIn('case "CAT_PREVIEW_FILTER_TEXT"', worker)
        self.assertIn("function previewFilterText(input)", worker)
        self.assertIn('new TextEncoder().encode(input).byteLength', worker)
        self.assertIn("MAX_SOURCE_BYTES", worker)
        self.assertIn("activated: false", worker)
        self.assertIn("persisted: false", worker)

    def test_preview_controls_explain_no_side_effects(self):
        html = (ROOT / "src/kitty-ui/options.html").read_text(encoding="utf-8")
        js = (ROOT / "src/kitty-ui/options.js").read_text(encoding="utf-8")
        for element_id in ("filter-lab", "filter-preview-text", "preview-filter-list", "clear-filter-preview", "filter-preview-result"):
            self.assertIn(f'id="{element_id}"', html)
        self.assertIn('CAT_PREVIEW_FILTER_TEXT', js)
        self.assertIn("textContent", js)
        self.assertIn("Nie zmieniono aktywnych reguł", js)

    def test_regression_fixtures_are_present_and_bounded(self):
        mixed = (ROOT / "tests/fixtures/filter-preview-mixed.txt").read_text(encoding="utf-8")
        unsupported = (ROOT / "tests/fixtures/filter-preview-unsupported.txt").read_text(encoding="utf-8")
        self.assertIn("@@||safe.example.org/allowed^$domain=portal.example.org", mixed)
        self.assertIn("##.ad-slot", mixed)
        self.assertIn("$redirect=empty", unsupported)
        self.assertLess(len(mixed.encode("utf-8")), 262144)

    def test_version_and_preview_limits_are_aligned(self):
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        contracts = json.loads((ROOT / "src/shared/contracts.json").read_text(encoding="utf-8"))
        schema = json.loads((ROOT / "src/storage/schema.json").read_text(encoding="utf-8"))
        self.assertEqual(package["version"], "1.0.0")
        self.assertEqual(contracts["version"], "1.0.0")
        self.assertIn("local_filter_preview", contracts["features"])
        self.assertEqual(schema["limits"]["max_filter_preview_bytes"], 262144)
        for manifest_name in ("chromium.json", "firefox.json"):
            manifest = json.loads((ROOT / "manifest" / manifest_name).read_text(encoding="utf-8"))
            self.assertEqual(manifest["version"], "1.0.0")


if __name__ == "__main__":
    unittest.main()
