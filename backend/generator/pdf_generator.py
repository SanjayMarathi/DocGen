from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, Table, TableStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import re

def code_block(text):
    code_style = ParagraphStyle("Code", fontName="Courier", fontSize=9, leading=12, textColor=colors.HexColor("#1F2937"))
    formatted = text.replace(" ", "&nbsp;").replace("\n", "<br/>")
    code_para = Paragraph(formatted, code_style)
    table = Table([[code_para]], colWidths=[450])
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F4F6")), ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return table

def clean_markdown(text):
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.*?)\*", r"<i>\1</i>", text)
    text = re.sub(r"`(.*?)`", r"<font face='Courier' color='#dc2626'>\1</font>", text)
    return text

def create_pdf(text):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=60, leftMargin=60, topMargin=70, bottomMargin=70)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Heading1"], fontSize=20, textColor=colors.HexColor("#111827"), spaceAfter=20)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=15, textColor=colors.HexColor("#374151"), spaceBefore=16, spaceAfter=8)
    h3 = ParagraphStyle("h3", parent=styles["Heading3"], fontSize=13, textColor=colors.HexColor("#4B5563"), spaceBefore=14, spaceAfter=6)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=11, leading=16, textColor=colors.HexColor("#111827"), spaceAfter=6)

    story = [Paragraph("Documentation", title_style), Spacer(1, 10)]
    if not text: text = "No content."
    lines = text.split("\n")
    bullet_items = []
    inside_code = False
    code_buffer = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            if inside_code:
                if code_buffer: story.append(code_block("\n".join(code_buffer))); story.append(Spacer(1, 12))
                code_buffer = []; inside_code = False
            else:
                if bullet_items: story.append(ListFlowable(bullet_items, bulletType="bullet", leftIndent=20)); bullet_items = []
                inside_code = True
            continue
        if inside_code: code_buffer.append(line); continue
        if not stripped.startswith("- ") and bullet_items: story.append(ListFlowable(bullet_items, bulletType="bullet", leftIndent=20)); bullet_items = []
        if line.startswith("## "): story.append(Paragraph(clean_markdown(line[3:]), h2))
        elif line.startswith("### "): story.append(Paragraph(clean_markdown(line[4:]), h3))
        elif line.startswith("- "): bullet_items.append(ListItem(Paragraph(clean_markdown(line[2:]), body)))
        elif stripped: story.append(Paragraph(clean_markdown(line), body))

    if bullet_items: story.append(ListFlowable(bullet_items, bulletType="bullet", leftIndent=20))
    try: doc.build(story)
    except: doc.build([Paragraph("Error", body)])
    buffer.seek(0)
    return buffer