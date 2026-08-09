import subprocess
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BUILD_COMMON = PROJECT_ROOT / "source" / "pdf" / "build-common.sh"


class TypstPostprocessTests(unittest.TestCase):
    def test_existing_pandoc_image_alt_is_normalised_without_duplication(self) -> None:
        source = """#figure(image(\".assets/wardline/diagram-0.svg\", width: 82.0%, alt: \"Pandoc-native alt.\"),
  caption: [
Canonical caption.
  ]
)
"""

        with tempfile.TemporaryDirectory() as temp_dir:
            typst_path = Path(temp_dir) / "fixture.typ"
            typst_path.write_text(source, encoding="utf-8")

            subprocess.run(
                [
                    "bash",
                    "-c",
                    'source "$1"; postprocess_tables "$2" "{}"',
                    "bash",
                    str(BUILD_COMMON),
                    str(typst_path),
                ],
                check=True,
                cwd=PROJECT_ROOT,
            )

            processed = typst_path.read_text(encoding="utf-8")

        self.assertEqual(processed.count("alt:"), 1)
        self.assertIn('alt: "Canonical caption."', processed)
        self.assertIn(
            '#figure(image(".assets/wardline/diagram-0.svg", width: 82.0%, '
            'alt: "Canonical caption."),',
            processed,
        )


if __name__ == "__main__":
    unittest.main()
