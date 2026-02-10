from io import BytesIO
from reportlab.platypus import *
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib import colors
import re


# ---------- INLINE FORMAT ----------
def md_inline(text):

    text = re.sub(r'\[(.*?)\]\((.*?)\)', r"<link href='\2'><u>\1</u></link>", text)

    text = re.sub(
        r'`(.*?)`',
        r"<font face='Courier' backColor='#EEF2F7'>\1</font>",
        text
    )

    types = ["long long","size_t","double","float","char","bool","long","int"]
    for t in types:
        text = re.sub(
            rf'\b{re.escape(t)}\b',
            rf"<font face='Courier' color='#0A58CA'><b>{t}</b></font>",
            text
        )

    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)

    return text


# ---------- CODE WRAP FIX ----------
def wrap_code_lines(code, max_chars=85):
    wrapped = []
    for line in code.split("\n"):

        indent = len(line) - len(line.lstrip(" "))
        prefix = " " * indent
        text = line.lstrip()

        while len(text) > max_chars:
            part = text[:max_chars]
            wrapped.append(prefix + part)
            text = text[max_chars:]

        wrapped.append(prefix + text)

    return "\n".join(wrapped)


# ---------- CODE BLOCK ----------
def code_block(code):

    code = wrap_code_lines(code, 85)

    inner = Preformatted(code, ParagraphStyle(
        "code_inner",
        fontName="Courier",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1F2937")
    ))

    box = Table([[inner]], colWidths=[450])
    box.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#F7F7F8")),
        ("BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E5E7EB")),
        ("LEFTPADDING",(0,0),(-1,-1),10),
        ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",(0,0),(-1,-1),8),
        ("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))

    return box


# ---------- PDF ----------
def create_pdf(text):

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=60,leftMargin=60,
        topMargin=70,bottomMargin=70
    )

    styles = getSampleStyleSheet()

    TITLE = ParagraphStyle(
        "TITLE",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#0B3D91"),
        spaceBefore=18,
        spaceAfter=8
    )

    H2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#1F7A8C"),
        spaceBefore=16,
        spaceAfter=6
    )

    H3 = ParagraphStyle(
        "H3",
        parent=styles["Heading3"],
        fontSize=14,
        textColor=colors.HexColor("#8A5A44"),
        spaceBefore=14,
        spaceAfter=4
    )

    BODY = ParagraphStyle(
        "BODY",
        parent=styles["BodyText"],
        fontSize=11,
        leading=16.5,
        alignment=TA_JUSTIFY,
        spaceAfter=6
    )

    story=[]
    lines=text.split("\n")

    # remove LLM endings
    lines = [l for l in lines if l.strip().lower() not in [
        "end of documentation",
        "end of document",
        "documentation ends here",
        "end."
    ]]

    bullets=[]
    table=[]
    code=[]
    in_code=False

    for line in lines:
        stripped=line.rstrip()

        if stripped.strip()=="---":
            continue

        # code
        if stripped.strip().startswith("```"):
            if in_code:
                story.append(code_block("\n".join(code)))
                story.append(Spacer(1,8))
                code=[]
                in_code=False
            else:
                in_code=True
            continue

        if in_code:
            code.append(line)
            continue

        # table
        if "|" in stripped and stripped.count("|")>=2:
            table.append(stripped)
            continue
        else:
            if table:
                data=[]
                for row in table:
                    cols=[md_inline(c.strip()) for c in row.strip("|").split("|")]
                    if all(set(c)<=set("-:") for c in cols):
                        continue
                    data.append([Paragraph(c,BODY) for c in cols])

                if data:
                    tbl=Table(data, repeatRows=1)
                    tbl.setStyle(TableStyle([
                        ("GRID",(0,0),(-1,-1),0.4,colors.grey),
                        ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#F1F3F5")),
                        ("LEFTPADDING",(0,0),(-1,-1),6),
                        ("RIGHTPADDING",(0,0),(-1,-1),6),
                        ("TOPPADDING",(0,0),(-1,-1),4),
                        ("BOTTOMPADDING",(0,0),(-1,-1),4),
                    ]))
                    story.append(tbl)
                    story.append(Spacer(1,8))
                table=[]

        # headings
        if stripped.startswith("# "):
            story.append(Paragraph(md_inline(stripped[2:]), TITLE))
            continue

        if stripped.startswith("## "):
            story.append(Paragraph(md_inline(stripped[3:]), H2))
            continue

        if stripped.startswith("### "):
            story.append(Paragraph(md_inline(stripped[4:]), H3))
            continue

        # bullets
        if stripped.startswith("- "):
            bullets.append(ListItem(Paragraph(md_inline(stripped[2:]), BODY)))
            continue
        else:
            if bullets:
                story.append(ListFlowable(bullets, bulletType="bullet", spaceBefore=2, spaceAfter=6))
                bullets=[]

        # paragraph
        if stripped.strip():
            story.append(Paragraph(md_inline(stripped), BODY))

    if bullets:
        story.append(ListFlowable(bullets, bulletType="bullet", spaceBefore=2, spaceAfter=6))

    doc.build(story)
    buffer.seek(0)
    return buffer
