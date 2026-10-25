import json
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class FilterHistoryTests(unittest.TestCase):
    def test_worker_has_bounded_rollback_history(self):
        text=(ROOT/'src/background/service-worker.js').read_text(encoding='utf-8')
        self.assertIn('filterHistory: []', text)
        self.assertIn('.slice(-5)', text)
        self.assertIn('case "CAT_ROLLBACK_FILTERS"', text)
        self.assertIn('filter_list_rollback', text)
    def test_ui_has_import_export_rollback_controls(self):
        html=(ROOT/'src/kitty-ui/options.html').read_text(encoding='utf-8')
        js=(ROOT/'src/kitty-ui/options.js').read_text(encoding='utf-8')
        for key in ('import-filter-list','export-filter-list','rollback-filter-list'):
            self.assertIn(f'id="{key}"',html)
            self.assertIn(key,js)
        self.assertIn('256 * 1024',js)
        self.assertIn('maksymalnie 200 domen',js)
    def test_manifest_and_package_versions(self):
        for name in ('chromium.json','firefox.json'):
            data=json.loads((ROOT/'manifest'/name).read_text(encoding='utf-8'))
            self.assertEqual(data['version'],'1.0.0')
        self.assertEqual(json.loads((ROOT/'package.json').read_text())['version'],'1.0.0')
if __name__=='__main__': unittest.main()
