"""Verify the near-90% PDF against its job fixture without calling Gemini."""

import re
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "output" / "pdf" / "near-90-match-test-resume.pdf"
JOB = ROOT / "tests" / "fixtures" / "full-match-job.md"


def lines_between(text, start, end):
    section = text.split(start, 1)[1].split(end, 1)[0]
    return [line.strip() for line in section.splitlines() if line.strip()]


def mentioned(text, phrase):
    return re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", text, re.IGNORECASE) is not None


def main():
    job_text = JOB.read_text(encoding="utf-8")
    requirements = lines_between(
        job_text, "Requirements (paste these as separate lines):", "## What to check"
    )
    responsibilities = lines_between(
        job_text, "Description (paste these as separate lines):", "Requirements (paste these as separate lines):"
    )
    with pdfplumber.open(PDF) as document:
        assert len(document.pages) == 1, "Expected a one-page resume"
        resume_text = " ".join((page.extract_text() or "") for page in document.pages)
    resume_text = " ".join(resume_text.split())

    covered = [item for item in requirements if mentioned(resume_text, item)]
    missing = [item for item in requirements if item not in covered]
    covered_responsibilities = [item for item in responsibilities if mentioned(resume_text, item)]
    assert missing == ["SQL"], f"Expected SQL alone to be missing, got {missing}"
    assert len(covered_responsibilities) == len(responsibilities), (
        f"Expected every responsibility in the PDF, got {len(covered_responsibilities)}/{len(responsibilities)}"
    )

    total_weight = len(requirements) + 0.5 * len(responsibilities)
    coverage = (len(covered) + 0.5 * len(covered_responsibilities)) / total_weight
    lowest_score = round(100 * coverage)
    highest_score = round(100 * (0.85 * coverage + 0.15))
    assert highest_score < 100, "A missing requirement should prevent a full score"
    print(f"PASS: {len(covered)}/{len(requirements)} skills; {len(covered_responsibilities)}/{len(responsibilities)} responsibilities")
    print(f"Missing requirement: {', '.join(missing)}")
    print(f"Expected full-credit coverage: {coverage:.1%}; possible score with current weights: {lowest_score}-{highest_score}%")
    print("This checks PDF text and score bounds, not Gemini parsing or live embeddings.")


if __name__ == "__main__":
    main()
