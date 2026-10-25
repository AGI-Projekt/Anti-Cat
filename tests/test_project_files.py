import json
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class ProjectFilesTests(unittest.TestCase):
    def test_manifests_are_mv3(self):
        for name in ("chromium", "firefox"):
            data = json.loads((ROOT / "manifest" / f"{name}.json").read_text(encoding="utf-8"))
            self.assertEqual(data["manifest_version"], 3)
            self.assertEqual(data["version"], "1.0.0")
            self.assertIn("storage", data["permissions"])
    def test_rules_have_valid_ids(self):
        rules = json.loads((ROOT / "src/blocker/rules.json").read_text(encoding="utf-8"))
        ids = [r["id"] for r in rules]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(isinstance(i, int) and i > 0 for i in ids))
    def test_release_version_matches(self):
        self.assertEqual((ROOT / "VERSION").read_text().strip(), "1.0.0")
if __name__ == "__main__": unittest.main()
