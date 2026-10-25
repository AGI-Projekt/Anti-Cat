import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ExtensionConfigTests(unittest.TestCase):
    def test_manifest_v3_and_paths(self):
        manifest = json.loads((ROOT / "browser-extension" / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["manifest_version"], 3)
        self.assertEqual(manifest["declarative_net_request"]["rule_resources"][0]["path"], "rules.json")
        for icon in manifest["icons"].values():
            self.assertTrue((ROOT / "browser-extension" / icon).is_file(), icon)

    def test_rules_have_unique_ids_and_valid_basic_shape(self):
        rules = json.loads((ROOT / "browser-extension" / "rules.json").read_text(encoding="utf-8"))
        ids = [rule["id"] for rule in rules]
        self.assertTrue(rules)
        self.assertEqual(len(ids), len(set(ids)))
        for rule in rules:
            self.assertIsInstance(rule["id"], int)
            self.assertEqual(rule["action"]["type"], "block")
            self.assertTrue(rule["condition"]["urlFilter"])
            self.assertIn("resourceTypes", rule["condition"])

if __name__ == "__main__":
    unittest.main()
