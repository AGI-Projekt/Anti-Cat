import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ReleaseArtifactTests(unittest.TestCase):
    def test_all_bundles_have_complete_manifest_references(self):
        bundles = [ROOT / "browser-extension", ROOT / "dist/chromium", ROOT / "dist/firefox"]
        for bundle in bundles:
            with self.subTest(bundle=bundle.name):
                manifest_path = bundle / "manifest.json"
                self.assertTrue(manifest_path.is_file(), f"missing {manifest_path}")
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                self.assertEqual(manifest["version"], "1.0.0")
                for icon in manifest.get("icons", {}).values():
                    self.assertTrue((bundle / icon).is_file(), f"missing icon {icon}")
                for icon in manifest.get("action", {}).get("default_icon", {}).values():
                    self.assertTrue((bundle / icon).is_file(), f"missing action icon {icon}")
                for key in ("default_popup",):
                    if key in manifest.get("action", {}):
                        self.assertTrue((bundle / manifest["action"][key]).is_file())
                self.assertTrue((bundle / manifest["options_page"]).is_file())
                bg = manifest["background"]
                for script in ([bg["service_worker"]] if "service_worker" in bg else bg.get("scripts", [])):
                    self.assertTrue((bundle / script).is_file(), f"missing background script {script}")
                for content_script in manifest.get("content_scripts", []):
                    for script in content_script.get("js", []):
                        self.assertTrue((bundle / script).is_file(), f"missing content script {script}")
                rules_path = manifest["declarative_net_request"]["rule_resources"][0]["path"]
                rules = json.loads((bundle / rules_path).read_text(encoding="utf-8"))
                ids = [rule["id"] for rule in rules]
                self.assertEqual(len(ids), len(set(ids)))

    def test_built_bundle_contains_preview_and_source_matches(self):
        source_worker = (ROOT / "src/background/service-worker.js").read_bytes()
        source_options = (ROOT / "src/kitty-ui/options.js").read_bytes()
        for bundle in (ROOT / "browser-extension", ROOT / "dist/chromium", ROOT / "dist/firefox"):
            with self.subTest(bundle=bundle.name):
                self.assertEqual((bundle / "service-worker.js").read_bytes(), source_worker)
                self.assertEqual((bundle / "options.js").read_bytes(), source_options)
                html = (bundle / "options.html").read_text(encoding="utf-8")
                self.assertIn('id="filter-preview-text"', html)
                self.assertIn('id="preview-filter-list"', html)

    def test_ui_does_not_insert_preview_contents_as_html(self):
        js = (ROOT / "src/kitty-ui/options.js").read_text(encoding="utf-8")
        self.assertNotIn("innerHTML", js)
        self.assertIn("output.replaceChildren()", js)
        self.assertIn("summary.textContent", js)


if __name__ == "__main__":
    unittest.main()
