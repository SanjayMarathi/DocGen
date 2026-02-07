from io import BytesIO
from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml
import re

def add_code_block(doc, text):
    """Creates a 1x1 Table with Grey Background for Code"""
    table = doc.add_table(rows=1, cols=1)
    cell = table.cell(0, 0)
    shading_elm = parse_xml(r'<w:shd {} w:fill="F3F4F6"/>'.format(nsdecls('w')))
    cell._tc.get_or_add_tcPr().append(shading_elm)
    
    p = cell.paragraphs[0]
    run = p.add_run(text)
    run.font.name = 'Courier New'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(31, 41, 55)

def create_docx(text_content):
    buffer = BytesIO()
    doc = Document()
    
    style = doc.styles['Normal']
    style.font.name = 'Calibri'
    style.font.size = Pt(11)

    lines = text_content.split('\n')
    inside_code = False
    code_buffer = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("```"):
            if inside_code:
                if code_buffer: add_code_block(doc, "\n".join(code_buffer))
                code_buffer = []
                inside_code = False
            else:
                inside_code = True
            continue

        if inside_code:
            code_buffer.append(line)
            continue

        if line.startswith("# "): doc.add_heading(line[2:], 1)
        elif line.startswith("## "): doc.add_heading(line[3:], 2)
        elif line.startswith("### "): doc.add_heading(line[4:], 3)
        elif line.startswith("- "): doc.add_paragraph(line[2:], style='List Bullet')
        elif stripped: doc.add_paragraph(line)

    doc.save(buffer)
    buffer.seek(0)
    return buffer