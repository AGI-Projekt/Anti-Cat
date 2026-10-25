import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

class ReleaseGateTests(unittest.TestCase):
    def test_release_gate_passes_and_writes_machine_readable_report(self):
        proc = subprocess.run([sys.executable, str(ROOT / "release_gate.py")], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        report = json.loads((ROOT / "dist/RELEASE_GATE_1.0.0.json").read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "PASS")
        self.assertGreaterEqual(report["checks_passed"], 40)
        self.assertEqual(report["errors"], [])

    def test_regression_fixture_has_core_user_journeys(self):
        html = (ROOT / "tests/browser/fixtures/regression-page.html").read_text(encoding="utf-8")
        for marker in ('id="article-copy"', 'id="login-form"', 'id="form-result"', 'class="ad-slot"', '<video', '<audio', '<nav'):
            self.assertIn(marker, html)
        self.assertIn("FORM_OK", html)

    def test_browser_regression_plan_does_not_claim_automatic_browser_pass(self):
        doc = (ROOT / "docs/BROWSER_REGRESSION_1.0.0_PL.md").read_text(encoding="utf-8")
        self.assertIn("Nie oznaczaj testu jako PASS", doc)
        self.assertIn("Chrome/Edge", doc)
        self.assertIn("Firefox", doc)

if __name__ == "__main__": unittest.main()
