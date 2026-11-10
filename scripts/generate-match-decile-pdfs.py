"""Generate 0-100% synthetic resume PDFs for the ten-skill decile job."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "decile-tests"
SKILLS = [
    "JavaScript", "React", "Node.js", "AWS", "SQL", "Python", "Docker",
    "Kubernetes", "TypeScript", "Git",
]

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


def make_pdf(count):
    percent = count * 10
    path = OUTPUT / f"match-{percent:03d}.pdf"
    doc = SimpleDocTemplate(
        str(path), pagesize=(8.5 * inch, 11 * inch),
        leftMargin=0.8 * inch, rightMargin=0.8 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
    )
    skill_list = ["Patient care", *SKILLS[:count]]
    elements = [
        Paragraph("Alex Match Test", styles["TestName"]),
        Paragraph("SYNTHETIC RESUME FOR RESUMATCH TESTING - NOT A REAL PERSON", styles["TestNote"]),
        Paragraph("Professional summary", styles["TestHeading"]),
        Paragraph("Community volunteer with experience coordinating local events and assisting residents.", styles["TestText"]),
        Paragraph("Skills", styles["TestHeading"]),
        Paragraph(", ".join(skill_list), styles["TestText"]),
        Paragraph("Work experience", styles["TestHeading"]),
        Paragraph("<b>Community Volunteer</b> at Fictional Community Center | 2022 - 2026", styles["TestText"]),
        Paragraph("- Organized schedules and assisted visitors.", styles["TestText"]),
        Paragraph("- Prepared outreach materials for local events.", styles["TestText"]),
        Spacer(1, 6),
        Paragraph("Education", styles["TestHeading"]),
        Paragraph("Bachelor of Arts in General Studies", styles["TestText"]),
    ]
    doc.build(elements)
    return path


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for count in range(11):
        print(make_pdf(count))


if __name__ == "__main__":
    main()
