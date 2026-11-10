"""Check every generated PDF contains exactly its intended job skills."""

import re
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "output" / "pdf" / "decile-tests"
SKILLS = [
    "JavaScript", "React", "Node.js", "AWS", "SQL", "Python", "Docker",
    "Kubernetes", "TypeScript", "Git",
]


def mentioned(text, phrase):
    return re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", text, re.IGNORECASE) is not None


def main():
    for count in range(11):
        percent = count * 10
        path = PDF_DIR / f"match-{percent:03d}.pdf"
        with pdfplumber.open(path) as document:
            assert len(document.pages) == 1, f"{path.name}: expected one page"
            text = " ".join((page.extract_text() or "") for page in document.pages)
        text = " ".join(text.split())
        found = [skill for skill in SKILLS if mentioned(text, skill)]
        assert found == SKILLS[:count], f"{path.name}: found {found}, expected {SKILLS[:count]}"
        assert mentioned(text, "Patient care"), f"{path.name}: missing baseline evidence"
        print(f"{percent:3d}%: PASS ({len(found)}/10 target skills)")


if __name__ == "__main__":
    main()
