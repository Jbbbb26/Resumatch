"""Create a synthetic near-90% resume for tests/fixtures/full-match-job.md."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "near-90-match-test-resume.pdf"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="TestName", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=20, leading=24, textColor=colors.HexColor("#17324d"), spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="TestNote", parent=styles["Normal"], alignment=TA_CENTER,
    fontSize=8, leading=11, textColor=colors.HexColor("#65758b"), spaceAfter=16,
))
styles.add(ParagraphStyle(
    name="TestHeading", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=11, leading=14, textColor=colors.HexColor("#17324d"),
    spaceBefore=11, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="TestText", parent=styles["Normal"], fontName="Helvetica",
    fontSize=10, leading=15, textColor=colors.HexColor("#1f2937"), spaceAfter=4,
))


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=(8.5 * inch, 11 * inch),
        leftMargin=0.8 * inch, rightMargin=0.8 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
    )
    elements = [
        Paragraph("Jordan Match Test", styles["TestName"]),
        Paragraph("SYNTHETIC RESUME FOR RESUMATCH TESTING - NOT A REAL PERSON", styles["TestNote"]),
        Paragraph("Professional summary", styles["TestHeading"]),
        Paragraph(
            "Senior Software Engineer with six years of experience leading software architecture "
            "for scalable web applications and APIs, designing reliable systems, guiding "
            "engineering teams, reviewing technical decisions, and building AWS cloud services.",
            styles["TestText"],
        ),
        Paragraph("Skills", styles["TestHeading"]),
        Paragraph(
            "JavaScript, React, Node.js, AWS, System design, Software architecture",
            styles["TestText"],
        ),
        Paragraph("Work experience", styles["TestHeading"]),
        Paragraph("<b>Senior Software Engineer</b> at Fictional Example Labs | 2020 - 2026", styles["TestText"]),
    ]
    for duty in [
        "Lead software architecture for scalable web applications and APIs.",
        "Design reliable systems, guide engineering teams, and review technical decisions.",
        "Build and maintain cloud services on AWS.",
        "Built React and Node.js applications with JavaScript.",
    ]:
        elements.append(Paragraph(f"- {duty}", styles["TestText"]))
    elements += [
        Spacer(1, 6),
        Paragraph("Education", styles["TestHeading"]),
        Paragraph("Bachelor of Science in Computer Science", styles["TestText"]),
    ]
    doc.build(elements)
    print(OUTPUT)


if __name__ == "__main__":
    main()
