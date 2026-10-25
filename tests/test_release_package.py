import json
import unittest
from pathlib import Path
from zipfile import ZipFile
import tempfile

import package_release

ROOT = Path(__file__).resolve().parents[1]


class ReleasePackageTests(unittest.TestCase):
    def test_packager_excludes_transient_python_and_build_directories(self):
        selected = [p.relative_to(ROOT).as_posix() for p in package_release.project_files()]
        self.assertTrue(selected)
        self.assertFalse(any("__pycache__" in name for name in selected))
        self.assertFalse(any(name.endswith(".pyc") for name in selected))
        self.assertFalse(any(name.startswith(".git/") or name.startswith("node_modules/") for name in selected))

    def test_project_zip_has_versioned_root_and_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            archive_path = Path(temp) / "project.zip"
            package_release.write_project_zip(archive_path)
            with ZipFile(archive_path) as archive:
                names = archive.namelist()
                prefix = f"{package_release.PROJECT_NAME}/"
                self.assertIn(prefix + "VERSION", names)
                manifest = json.loads(archive.read(prefix + "manifest/chromium.json"))
                self.assertEqual(manifest["version"], "1.0.0")
                self.assertFalse(any("__pycache__" in name for name in names))
                self.assertFalse(any(name.endswith(".pyc") for name in names))

    def test_extension_zips_have_root_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            chromium_path = Path(temp) / "chromium.zip"
            firefox_path = Path(temp) / "firefox.zip"
            package_release.write_bundle_zip(ROOT / "browser-extension", chromium_path)
            package_release.write_bundle_zip(ROOT / "dist/firefox", firefox_path)
            for path in (chromium_path, firefox_path):
                with self.subTest(archive=path.name), ZipFile(path) as archive:
                    self.assertIn("manifest.json", archive.namelist())
                    self.assertEqual(json.loads(archive.read("manifest.json"))["version"], "1.0.0")


if __name__ == "__main__":
    unittest.main()
