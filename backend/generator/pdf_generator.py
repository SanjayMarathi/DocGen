from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    ListFlowable,
    ListItem,
    Preformatted,
)
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors


def create_pdf(text, filename="Documentation.pdf"):

    # PDF Layout Settings
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=50,
        leftMargin=50,
        topMargin=60,
        bottomMargin=60,
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=20,
    )

    heading2_style = ParagraphStyle(
        "Heading2Style",
        parent=styles["Heading2"],
        fontSize=15,
        textColor=colors.HexColor("#9333EA"),
        spaceBefore=15,
        spaceAfter=10,
    )

    heading3_style = ParagraphStyle(
        "Heading3Style",
        parent=styles["Heading3"],
        fontSize=13,
        textColor=colors.HexColor("#2563EB"),
        spaceBefore=12,
        spaceAfter=8,
    )

    body_style = ParagraphStyle(
        "BodyStyle",
        parent=styles["BodyText"],
        fontSize=11,
        leading=16,
        spaceAfter=6,
    )

    code_style = ParagraphStyle(
        "CodeStyle",
        fontName="Courier",
        fontSize=9.5,
        leading=13,
        backColor=colors.HexColor("#111827"),
        textColor=colors.HexColor("#E5E7EB"),
        leftIndent=12,
        rightIndent=12,
        spaceBefore=10,
        spaceAfter=10,
    )

    story = []

    # Add Title Page Heading
    story.append(Paragraph("AI Generated Project Documentation", title_style))
    story.append(Spacer(1, 12))

    lines = text.split("\n")

    bullet_items = []
    inside_code = False
    code_buffer = []

    for line in lines:

        # Detect Code Block Start/End
        if line.strip().startswith("```"):
            if inside_code:
                # End code block
                story.append(
                    Preformatted("\n".join(code_buffer), code_style)
                )
                code_buffer = []
                inside_code = False
            else:
                inside_code = True
            continue

        if inside_code:
            code_buffer.append(line)
            continue

        # Heading Level 2
        if line.startswith("## "):
            if bullet_items:
                story.append(
                    ListFlowable(
                        bullet_items,
                        bulletType="bullet",
                        leftIndent=20,
                    )
                )
                bullet_items = []

            story.append(Paragraph(line[3:], heading2_style))

        # Heading Level 3
        elif line.startswith("### "):
            if bullet_items:
                story.append(
                    ListFlowable(
                        bullet_items,
                        bulletType="bullet",
                        leftIndent=20,
                    )
                )
                bullet_items = []

            story.append(Paragraph(line[4:], heading3_style))

        # Bullet Points
        elif line.startswith("- "):
            bullet_items.append(
                ListItem(
                    Paragraph(line[2:], body_style),
                    leftIndent=10,
                )
            )

        # Normal Paragraph
        elif line.strip() != "":
            if bullet_items:
                story.append(
                    ListFlowable(
                        bullet_items,
                        bulletType="bullet",
                        leftIndent=20,
                    )
                )
                bullet_items = []

            story.append(Paragraph(line, body_style))

    # Add remaining bullets
    if bullet_items:
        story.append(
            ListFlowable(
                bullet_items,
                bulletType="bullet",
                leftIndent=20,
            )
        )

    doc.build(story)

    return filename
