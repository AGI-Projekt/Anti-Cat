import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class CustomFilterContractTests(unittest.TestCase):
    def test_custom_filter_limits_and_atomic_replace_are_declared(self):
        worker = (ROOT / 'src/background/service-worker.js').read_text(encoding='utf-8')
        self.assertIn('const CUSTOM_RULE_BASE = 11000;', worker)
        self.assertIn('const MAX_CUSTOM_DOMAINS = 200;', worker)
        self.assertIn('case "CAT_SAVE_CUSTOM_FILTERS"', worker)
        self.assertIn('requestDomains: [domain]', worker)
        self.assertIn('await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldIds, addRules: newRules });', worker)

    def test_options_exposes_safe_manual_list_controls(self):
        html = (ROOT / 'src/kitty-ui/options.html').read_text(encoding='utf-8')
        js = (ROOT / 'src/kitty-ui/options.js').read_text(encoding='utf-8')
        self.assertIn('id="custom-domains"', html)
        self.assertIn('id="save-custom-filters"', html)
        self.assertIn('id="clear-custom-filters"', html)
        self.assertIn('maksymalnie 200', js)
        self.assertIn('CAT_SAVE_CUSTOM_FILTERS', js)

    def test_manifest_versions_match_release(self):
        for name in ('chromium.json', 'firefox.json'):
            manifest = json.loads((ROOT / 'manifest' / name).read_text(encoding='utf-8'))
            self.assertEqual(manifest['version'], '1.0.0')

if __name__ == '__main__':
    unittest.main()
