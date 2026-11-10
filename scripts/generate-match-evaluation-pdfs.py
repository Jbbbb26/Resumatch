"""Generate synthetic resumes for a repeatable ResuMatch evaluation."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(
    name="ResumeName", parent=STYLES["Title"], fontName="Helvetica-Bold",
    fontSize=20, leading=24, textColor=colors.HexColor("#17324d"), spaceAfter=5,
))
STYLES.add(ParagraphStyle(
    name="ResumeNote", parent=STYLES["Normal"], alignment=TA_CENTER,
    fontSize=8, leading=11, textColor=colors.HexColor("#65758b"), spaceAfter=18,
))
STYLES.add(ParagraphStyle(
    name="ResumeHeading", parent=STYLES["Heading2"], fontName="Helvetica-Bold",
    fontSize=11, leading=14, textColor=colors.HexColor("#17324d"),
    spaceBefore=12, spaceAfter=5,
))
STYLES.add(ParagraphStyle(
    name="ResumeText", parent=STYLES["Normal"], fontName="Helvetica",
    fontSize=10, leading=15, textColor=colors.HexColor("#1f2937"), spaceAfter=4,
))

RESUMES = [
    {
        "file": "match-test-strong.pdf",
        "name": "Alex Test Candidate",
        "summary": "Senior software engineer and software architect with six years of experience designing scalable web applications and APIs.",
        "skills": ["JavaScript", "React", "Node.js", "AWS", "SQL", "System design", "Software architecture"],
        "experience": [
            ("Senior Software Engineer", "2020 - 2026", [
                "Designed software architecture for high-traffic applications and REST APIs.",
                "Built React front ends and Node.js services using JavaScript and SQL databases.",
                "Deployed scalable systems on AWS and mentored four engineers.",
            ]),
        ],
        "education": "Bachelor of Science in Computer Science",
    },
    {
        "file": "match-test-partial.pdf",
        "name": "Morgan Test Candidate",
        "summary": "IT support analyst with three years of experience maintaining cloud infrastructure and reporting systems.",
        "skills": ["Python", "AWS", "SQL", "Technical support"],
        "experience": [
            ("IT Support Analyst", "2023 - 2026", [
                "Maintained AWS accounts and SQL reports for internal teams.",
                "Wrote Python scripts to automate system monitoring and support tasks.",
                "Resolved user incidents and documented operational procedures.",
            ]),
        ],
        "education": "Bachelor of Science in Information Technology",
    },
    {
        "file": "match-test-unrelated.pdf",
        "name": "Taylor Test Candidate",
        "summary": "Registered nurse with four years of clinical experience in patient care and hospital operations.",
        "skills": ["Patient care", "Triage", "Medication administration", "Vital signs"],
        "experience": [
            ("Staff Nurse", "2022 - 2026", [
                "Assessed patients, monitored vital signs, and administered medication.",
                "Coordinated nursing care with physicians and clinical staff.",
                "Maintained accurate patient records and followed hospital safety protocols.",
            ]),
        ],
        "education": "Bachelor of Science in Nursing",
    },
]


def render_resume(resume):
    path = OUTPUT / resume["file"]
    document = SimpleDocTemplate(
        str(path), pagesize=(8.5 * inch, 11 * inch),
        leftMargin=0.8 * inch, rightMargin=0.8 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
    )
    elements = [
        Paragraph(resume["name"], STYLES["ResumeName"]),
        Paragraph("SYNTHETIC RESUME FOR RESUMATCH TESTING - NOT A REAL PERSON", STYLES["ResumeNote"]),
        Paragraph("Professional summary", STYLES["ResumeHeading"]),
        Paragraph(resume["summary"], STYLES["ResumeText"]),
        Paragraph("Skills", STYLES["ResumeHeading"]),
        Paragraph(", ".join(resume["skills"]), STYLES["ResumeText"]),
        Paragraph("Experience", STYLES["ResumeHeading"]),
    ]
    for title, dates, responsibilities in resume["experience"]:
        elements.append(Paragraph(f"<b>{title}</b> | {dates}", STYLES["ResumeText"]))
        for responsibility in responsibilities:
            elements.append(Paragraph(f"- {responsibility}", STYLES["ResumeText"]))
    elements += [
        Spacer(1, 6),
        Paragraph("Education", STYLES["ResumeHeading"]),
        Paragraph(resume["education"], STYLES["ResumeText"]),
    ]
    document.build(elements)
    return path


if __name__ == "__main__":
    for resume in RESUMES:
        print(render_resume(resume))
