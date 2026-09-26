import unittest

from detector import analyze_message, analyze_url


class UrlDetectionTests(unittest.TestCase):
    def test_flags_brand_name_in_path_when_destination_host_is_unrelated(self):
        url = "www.dghjdgf.com/paypal.co.uk/cycgi-bin/webscrcmd=_home-customer&nav=1/loading.php"

        result = analyze_url(url)

        self.assertEqual(result["verdict"], "DANGEROUS")
        self.assertIn("mismatch", result["findings"]["pattern"]["val"].lower())
        self.assertIn("not checked", result["findings"]["age"]["val"].lower())
        self.assertIn("not checked", result["findings"]["redirects"]["val"].lower())

    def test_message_analysis_explains_suspicious_brand_path(self):
        url = "www.dghjdgf.com/paypal.co.uk/cycgi-bin/webscrcmd=_home-customer&nav=1/loading.php"

        result = analyze_message(f"Review this link: {url}")

        self.assertEqual(result["verdict"], "DANGEROUS")
        self.assertTrue(any("mismatch" in reason["title"].lower() for reason in result["reasons"]))

    def test_legitimate_paypal_host_is_not_flagged_as_brand_mismatch(self):
        result = analyze_url("https://www.paypal.com/signin")

        self.assertNotIn("mismatch", result["findings"]["pattern"]["val"].lower())


if __name__ == "__main__":
    unittest.main()
