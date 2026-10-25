import unittest
from cat_app import classify_url

class ClassifyUrlTests(unittest.TestCase):
    def test_ad_domain_is_block(self):
        verdict, _, _ = classify_url("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")
        self.assertEqual(verdict, "BLOCK")

    def test_normal_host_is_allow(self):
        verdict, _, _ = classify_url("https://example.com/article")
        self.assertEqual(verdict, "ALLOW")

    def test_invalid_address_is_review(self):
        verdict, _, _ = classify_url("not a valid host !!!")
        self.assertEqual(verdict, "REVIEW")

    def test_localhost_without_scheme_is_valid(self):
        verdict, _, _ = classify_url("localhost:8080")
        self.assertEqual(verdict, "ALLOW")

    def test_host_with_spaces_is_invalid(self):
        verdict, _, _ = classify_url("not a valid host !!!")
        self.assertEqual(verdict, "REVIEW")

if __name__ == "__main__":
    unittest.main()
