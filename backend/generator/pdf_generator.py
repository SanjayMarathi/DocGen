from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    ListFlowable,
    ListItem,
    Table,
    TableStyle,
)
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import re


def code_block(text):
    """Create a clean wrapped code block"""

    code_style = ParagraphStyle(
        "Code",
        fontName="Courier",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1F2937"),
    )

    code_para = Paragraph(text.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style)

    table = Table([[code_para]], colWidths=[450])
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F4F6")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    return table

def clean_markdown(text):
    # bold **text**
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)

    # italic *text*
    text = re.sub(r"\*(.*?)\*", r"<i>\1</i>", text)

    # inline code `text`
    text = re.sub(r"`(.*?)`", r"<font name='Courier'>\1</font>", text)

    # remove leftover markdown symbols
    text = text.replace("###", "")
    text = text.replace("##", "")

    return text



def create_pdf(text, filename="Documentation.pdf"):

    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=60,
        leftMargin=60,
        topMargin=70,
        bottomMargin=70,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "title",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#111827"),
        spaceAfter=20,
    )

    h2 = ParagraphStyle(
        "h2",
        parent=styles["Heading2"],
        fontSize=15,
        textColor=colors.HexColor("#374151"),
        spaceBefore=16,
        spaceAfter=8,
    )

    h3 = ParagraphStyle(
        "h3",
        parent=styles["Heading3"],
        fontSize=13,
        textColor=colors.HexColor("#4B5563"),
        spaceBefore=14,
        spaceAfter=6,
    )

    body = ParagraphStyle(
        "body",
        parent=styles["BodyText"],
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#111827"),
        spaceAfter=6,
    )

    story = []

    story.append(Paragraph("AI Generated Documentation", title_style))
    story.append(Spacer(1, 10))

    lines = text.split("\n")

    bullet_items = []
    inside_code = False
    code_buffer = []

    for line in lines:

        # CODE BLOCK
        if line.strip().startswith("```"):
            if inside_code:
                story.append(code_block("\n".join(code_buffer)))
                story.append(Spacer(1, 12))
                code_buffer = []
                inside_code = False
            else:
                inside_code = True
            continue

        if inside_code:
            code_buffer.append(line)
            continue

        # HEADING 2
        if line.startswith("## "):
            if bullet_items:
                story.append(ListFlowable(bullet_items, bulletType="bullet", leftIndent=20))
                bullet_items = []
            story.append(Paragraph(line[3:], h2))

        # HEADING 3
        elif line.startswith("### "):
            if bullet_items:
                story.append(ListFlowable(bullet_items, bulletType="bullet", leftIndent=20))
                bullet_items = []
            story.append(Paragraph(line[4:], h3))

        # BULLETS
        elif line.startswith("- "):
            bullet_items.append(ListItem(Paragraph(line[2:], body)))

        # NORMAL TEXT
        elif line.strip():
            if bullet_items:
                story.append(ListFlowable(bullet_items, bulletType="bullet", leftIndent=20))
                bullet_items = []
            story.append(Paragraph(line, body))

    if bullet_items:
        story.append(ListFlowable(bullet_items, bulletType="bullet", leftIndent=20))

    doc.build(story)
    return filename
