#!/usr/bin/env python3
"""Generate the built-in SS Office template gallery.

The templates are ordinary Office files, not a proprietary format. Keeping the
generator in the repo makes the gallery reproducible and lets designers review
the source instead of reverse-engineering binary fixtures.

Design rules shared by every template:
  * midnight-navy / violet / cyan brand palette
  * generous margins and visible page structure
  * heading styles use keep-with-next + keep-lines so a new topic never starts
    alone at the bottom of a page (the Docs paginator already honours this)
  * body text uses widow/orphan control
  * print areas, headers and footers are configured for A4/Letter output

Run:  python apps/shell/scripts/generate-templates.py
"""
from __future__ import annotations

import os
import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor, Emu
from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from pptx import Presentation
from pptx.dml.color import RGBColor as PptxRGB
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Emu as PptxEmu, Inches as PptxInches, Pt as PptxPt
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "resources" / "templates"

# ── shared palette ────────────────────────────────────────────────────────────
NAVY = "0B1020"
NAVY_2 = "151B33"
VIOLET = "8B5CF6"
VIOLET_DARK = "6D3BE8"
CYAN = "22D3EE"
INK = "1B2237"
MUTED = "667085"
LINE = "DDE3F0"
PAPER = "F7F8FC"
WHITE = "FFFFFF"
MINT = "34D399"
AMBER = "F59E0B"
BLUSH = "FB7185"

BRAND_FONT = "Calibri"
DISPLAY_FONT = "Georgia"


def rgb(hex_value: str) -> RGBColor:
    return RGBColor.from_string(hex_value)


# ── low-level OOXML helpers ───────────────────────────────────────────────────
def _set_cell_shading(cell, hex_fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), hex_fill)


def _set_cell_border(cell, **kwargs) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        if edge not in kwargs:
            continue
        edge_data = kwargs.get(edge)
        tag = "w:{}".format(edge)
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        for key in ["sz", "val", "color", "space"]:
            if key in edge_data:
                element.set(qn("w:{}".format(key)), str(edge_data[key]))


def _set_cell_margins(cell, top=100, start=120, bottom=100, end=120) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn("w:" + m))
        if node is None:
            node = OxmlElement("w:" + m)
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def _set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def _set_row_height(row, inches: float) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tr_height = OxmlElement("w:trHeight")
    tr_height.set(qn("w:val"), str(int(inches * 1440)))
    tr_height.set(qn("w:hRule"), "atLeast")
    tr_pr.append(tr_height)


def _add_field(paragraph, instruction: str, placeholder: str = "1") -> None:
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_sep)
    run._r.append(text)
    run._r.append(fld_end)


def _add_page_borders(section) -> None:
    sect_pr = section._sectPr
    pg_borders = sect_pr.find(qn("w:pgBorders"))
    if pg_borders is None:
        pg_borders = OxmlElement("w:pgBorders")
        sect_pr.append(pg_borders)
    pg_borders.set(qn("w:offsetFrom"), "page")
    for edge, size, color, space in (
        ("top", 14, VIOLET, 24),
        ("left", 4, LINE, 18),
        ("bottom", 8, NAVY, 24),
        ("right", 4, LINE, 18),
    ):
        node = OxmlElement("w:" + edge)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), str(size))
        node.set(qn("w:space"), str(space))
        node.set(qn("w:color"), color)
        pg_borders.append(node)


def _shade_paragraph(paragraph, hex_fill: str) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    p_pr.append(shd)


def _paragraph_border(paragraph, edge: str = "bottom", color: str = VIOLET, size: int = 8) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = p_pr.find(qn("w:pBdr"))
    if p_bdr is None:
        p_bdr = OxmlElement("w:pBdr")
        p_pr.append(p_bdr)
    node = OxmlElement("w:" + edge)
    node.set(qn("w:val"), "single")
    node.set(qn("w:sz"), str(size))
    node.set(qn("w:space"), "6")
    node.set(qn("w:color"), color)
    p_bdr.append(node)


def _style_run(run, size: float | None = None, color: str | None = None, bold=None, italic=None, font=None):
    if font:
        run.font.name = font
        run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    if size is not None:
        run.font.size = Pt(size)
    if color:
        run.font.color.rgb = rgb(color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


# ── docx building blocks ──────────────────────────────────────────────────────
def docx_base(title: str, subtitle: str, kicker: str, footer_label: str) -> Document:
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.85)
    section.right_margin = Inches(0.85)
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)

    _add_page_borders(section)

    # Normal: readable, generous line spacing, widow control.
    normal = doc.styles["Normal"]
    normal.font.name = BRAND_FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = rgb(INK)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.18
    normal.paragraph_format.widow_control = True

    # Heading styles already carry keepNext in the engine blank; make it explicit
    # here as well so the generated package stays correct in Word/LibreOffice.
    heading_tokens = [
        ("Heading 1", 20, NAVY, 18, 8),
        ("Heading 2", 14, VIOLET_DARK, 14, 5),
        ("Heading 3", 11.5, INK, 10, 3),
    ]
    for name, size, color, before, after in heading_tokens:
        style = doc.styles[name]
        style.font.name = BRAND_FONT
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = rgb(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.keep_together = True
        style.paragraph_format.widow_control = True

    # Header: quiet brand line with a violet rule.
    header = section.header
    hp = header.paragraphs[0]
    hp.text = ""
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = hp.add_run("SS OFFICE  /  ")
    _style_run(r, 8, MUTED, True)
    r = hp.add_run(title.upper())
    _style_run(r, 8, VIOLET_DARK, True)
    _paragraph_border(hp, "bottom", LINE, 6)

    # Footer: document label on the left, page number on the right.
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.text = ""
    tab_stops = fp.paragraph_format.tab_stops
    tab_stops.add_tab_stop(Inches(6.55), 2)  # right tab
    r = fp.add_run(footer_label + "\t")
    _style_run(r, 8, MUTED)
    r = fp.add_run("Page ")
    _style_run(r, 8, MUTED)
    _add_field(fp, "PAGE")
    r = fp.add_run(" of ")
    _style_run(r, 8, MUTED)
    _add_field(fp, "NUMPAGES")
    _paragraph_border(fp, "top", LINE, 4)

    # Cover block: a navy panel with the title in white, followed by the
    # subtitle and a small metadata line. It gives the template a designed
    # first impression without relying on images.
    cover = doc.add_table(rows=1, cols=1)
    cover.alignment = WD_TABLE_ALIGNMENT.CENTER
    cover.autofit = False
    cover.columns[0].width = Inches(6.55)
    cell = cover.cell(0, 0)
    cell.width = Inches(6.55)
    _set_cell_shading(cell, NAVY)
    _set_cell_margins(cell, top=420, bottom=420, start=360, end=360)
    _set_cell_border(
        cell,
        top={"val": "single", "sz": 4, "color": NAVY},
        bottom={"val": "single", "sz": 4, "color": NAVY},
        left={"val": "single", "sz": 4, "color": NAVY},
        right={"val": "single", "sz": 4, "color": NAVY},
    )
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(kicker.upper())
    _style_run(r, 8, CYAN, True)
    p = cell.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    r = p.add_run(title)
    _style_run(r, 29, WHITE, True, font=DISPLAY_FONT)
    p = cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(subtitle)
    _style_run(r, 11, "C7D2FE")

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(4)
    meta = doc.add_paragraph()
    meta.paragraph_format.space_after = Pt(14)
    r = meta.add_run("PREPARED WITH SS OFFICE   •   EDIT EVERY SECTION   •   SAVE AS DOCX OR PDF")
    _style_run(r, 8, MUTED, True)
    return doc


def docx_heading(doc: Document, text: str, level: int = 1) -> None:
    p = doc.add_paragraph(text, style=f"Heading {level}")
    p.paragraph_format.keep_with_next = True
    if level == 1:
        _paragraph_border(p, "bottom", VIOLET, 10)
    elif level == 2:
        _paragraph_border(p, "bottom", LINE, 6)


def docx_body(doc: Document, text: str, *, bold_lead: str | None = None) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.widow_control = True
    if bold_lead and text.startswith(bold_lead):
        r = p.add_run(bold_lead)
        _style_run(r, bold=True, color=NAVY)
        _style_run(p.add_run(text[len(bold_lead):]))
    else:
        _style_run(p.add_run(text))


def docx_bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.widow_control = True
        r = p.add_run(item)
        _style_run(r, 10.5, INK)


def docx_callout(doc: Document, label: str, text: str, fill: str = "F2EDFF", edge: str = VIOLET) -> None:
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(6.55)
    cell = table.cell(0, 0)
    cell.width = Inches(6.55)
    _set_cell_shading(cell, fill)
    _set_cell_margins(cell, top=170, bottom=170, start=220, end=220)
    _set_cell_border(
        cell,
        left={"val": "single", "sz": 22, "color": edge},
        top={"val": "single", "sz": 2, "color": fill},
        bottom={"val": "single", "sz": 2, "color": fill},
        right={"val": "single", "sz": 2, "color": fill},
    )
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(label.upper())
    _style_run(r, 8, edge, True)
    p = cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    _style_run(p.add_run(text), 10, INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def docx_table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[float] | None = None) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    if widths:
        for i, width in enumerate(widths):
            table.columns[i].width = Inches(width)
    hdr = table.rows[0]
    _set_repeat_table_header(hdr)
    _set_row_height(hdr, 0.34)
    for i, header in enumerate(headers):
        cell = hdr.cells[i]
        cell.width = Inches(widths[i]) if widths else cell.width
        _set_cell_shading(cell, NAVY)
        _set_cell_margins(cell, top=100, bottom=100, start=100, end=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        _style_run(p.add_run(header.upper()), 8.5, WHITE, True)
    for ri, row in enumerate(rows):
        tr = table.add_row()
        _set_row_height(tr, 0.32)
        for ci, value in enumerate(row):
            cell = tr.cells[ci]
            if widths:
                cell.width = Inches(widths[ci])
            _set_cell_margins(cell, top=90, bottom=90, start=100, end=100)
            _set_cell_border(
                cell,
                top={"val": "single", "sz": 2, "color": LINE},
                bottom={"val": "single", "sz": 2, "color": LINE},
                left={"val": "single", "sz": 2, "color": LINE},
                right={"val": "single", "sz": 2, "color": LINE},
            )
            if ri % 2 == 1:
                _set_cell_shading(cell, "F7F8FC")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            _style_run(p.add_run(str(value)), 9.5, INK, bold=(ci == 0))
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


# ── DOCX templates ───────────────────────────────────────────────────────────
def build_project_proposal() -> None:
    doc = docx_base(
        "Project Proposal",
        "A clear plan for the work, the people and the outcome.",
        "Proposal / 2026",
        "Project Proposal",
    )
    docx_heading(doc, "At a glance", 1)
    docx_table(
        doc,
        ["Client", "Project lead", "Timeline", "Budget"],
        [
            ["Northstar Labs", "Avery Chen", "8 weeks · Jan–Mar", "$48,000"],
            ["Sponsor: Jordan Lee", "Design: Priya Shah", "Kickoff: 12 Jan", "Payment: milestone"],
        ],
        [1.55, 1.85, 1.55, 1.6],
    )
    docx_heading(doc, "Executive summary", 2)
    docx_body(
        doc,
        "Northstar Labs is launching a customer education hub to shorten onboarding and make product expertise available on demand. This proposal covers a focused eight-week engagement: discovery, content architecture, a production-ready site and a measurement plan.",
    )
    docx_callout(
        doc,
        "Outcome we are buying",
        "A launch-ready learning hub that takes a new customer from sign-up to first value in under 15 minutes, with a clear baseline for measuring adoption.",
    )
    docx_heading(doc, "Objectives", 2)
    docx_bullets(
        doc,
        [
            "Reduce time-to-first-value for new accounts by at least 30%.",
            "Publish 12 core learning paths with consistent structure and search.",
            "Instrument every path so the team can see completion and drop-off.",
            "Leave the team with an editorial system they can run without us.",
        ],
    )
    docx_heading(doc, "Scope", 2)
    docx_table(
        doc,
        ["In scope", "Out of scope"],
        [
            ["Discovery interviews and content audit", "Paid media and campaign production"],
            ["Information architecture and templates", "Translations beyond English"],
            ["12 learning paths, 40–60 articles", "Ongoing community management"],
            ["Analytics events and handover workshop", "Custom LMS procurement"],
        ],
        [3.25, 3.3],
    )
    docx_heading(doc, "Timeline", 2)
    docx_table(
        doc,
        ["Week", "Workstream", "Milestone"],
        [
            ["1", "Discovery", "Interview notes and content inventory"],
            ["2–3", "Architecture", "Approved sitemap and page templates"],
            ["4–6", "Production", "First six paths in review"],
            ["7", "Measurement", "Events live in staging"],
            ["8", "Launch", "Handover, QA and go-live"],
        ],
        [0.8, 3.1, 2.65],
    )
    docx_heading(doc, "Budget", 2)
    docx_table(
        doc,
        ["Workstream", "Days", "Investment"],
        [
            ["Discovery and strategy", "6", "$7,200"],
            ["Content architecture", "5", "$6,000"],
            ["Content production", "18", "$21,600"],
            ["Design and build", "9", "$10,800"],
            ["Measurement and handover", "2", "$2,400"],
            ["Total", "40", "$48,000"],
        ],
        [3.35, 1.0, 2.2],
    )
    docx_heading(doc, "Next steps", 2)
    docx_bullets(
        doc,
        [
            "Confirm the sponsor and subject-matter experts for discovery.",
            "Approve the timeline and milestone payment schedule.",
            "Book the kickoff workshop and share existing content.",
        ],
    )
    doc.save(OUT / "Project Proposal.docx")


def build_meeting_notes() -> None:
    doc = docx_base(
        "Meeting Notes",
        "Decisions, owners and the next conversation.",
        "Team / Weekly",
        "Meeting Notes",
    )
    docx_heading(doc, "Meeting details", 1)
    docx_table(
        doc,
        ["Date", "Time", "Location", "Chair"],
        [["21 October 2026", "10:00–10:45", "Studio B / video", "Avery Chen"]],
        [1.65, 1.55, 1.75, 1.6],
    )
    docx_heading(doc, "Attendees", 2)
    docx_body(doc, "Avery Chen, Priya Shah, Jordan Lee, Sam Rivera, Mei Tan")
    docx_heading(doc, "Agenda", 2)
    docx_bullets(
        doc,
        [
            "Launch readiness: open risks and owners.",
            "Customer onboarding pilot: what the first ten accounts taught us.",
            "Next sprint: capacity and sequencing.",
        ],
    )
    docx_heading(doc, "Discussion", 2)
    docx_body(
        doc,
        "The pilot reached 10 accounts this week. Activation is strongest when the welcome checklist arrives before the first login; the team agreed to move it into the sign-up confirmation. Support volume is stable, but two questions keep recurring: workspace permissions and data export.",
    )
    docx_body(
        doc,
        "Capacity is tight in the final week of the sprint. Design can support one launch asset and the permissions help article; the remaining requests move to the following sprint.",
    )
    docx_heading(doc, "Decisions", 2)
    docx_table(
        doc,
        ["Decision", "Owner", "Date"],
        [
            ["Move welcome checklist before first login", "Priya", "24 Oct"],
            ["Publish permissions help article", "Mei", "28 Oct"],
            ["Defer campaign landing page to next sprint", "Avery", "21 Oct"],
        ],
        [3.75, 1.6, 1.2],
    )
    docx_heading(doc, "Action items", 2)
    docx_table(
        doc,
        ["Action", "Owner", "Due", "Status"],
        [
            ["Update sign-up confirmation copy", "Priya", "24 Oct", "In progress"],
            ["Draft permissions help article", "Mei", "28 Oct", "Not started"],
            ["Share pilot activation dashboard", "Sam", "23 Oct", "Done"],
            ["Confirm next sprint capacity", "Avery", "26 Oct", "In progress"],
        ],
        [3.25, 1.15, 1.0, 1.15],
    )
    docx_callout(
        doc,
        "Next meeting",
        "Thursday 29 October, 10:00. Bring the updated activation dashboard and a first draft of the permissions article.",
    )
    doc.save(OUT / "Meeting Notes.docx")


def build_business_report() -> None:
    doc = docx_base(
        "Business Report",
        "Performance, insight and the decisions that follow.",
        "Quarterly review / Q3 2026",
        "Business Report",
    )
    docx_heading(doc, "Executive summary", 1)
    docx_body(
        doc,
        "Revenue grew 18% quarter over quarter, led by mid-market expansion. Retention held at 94%, while gross margin improved by 2.1 points after the support workflow changes. The next constraint is pipeline coverage in the enterprise segment.",
    )
    docx_callout(
        doc,
        "The headline",
        "Growth is healthy and efficient. The remaining risk is concentration: three enterprise deals represent 41% of the forecast.",
    )
    docx_heading(doc, "Key metrics", 2)
    docx_table(
        doc,
        ["Metric", "Q3", "Q2", "Change"],
        [
            ["Revenue", "$4.82M", "$4.08M", "+18.1%"],
            ["Gross margin", "78.4%", "76.3%", "+2.1 pts"],
            ["Net retention", "94%", "93%", "+1 pt"],
            ["New logos", "37", "31", "+6"],
            ["Pipeline coverage", "2.6×", "3.1×", "−0.5×"],
        ],
        [2.55, 1.35, 1.35, 1.3],
    )
    docx_heading(doc, "What worked", 2)
    docx_bullets(
        doc,
        [
            "The mid-market playbook shortened the sales cycle by nine days.",
            "Support automation resolved 32% of tier-one tickets without a human handoff.",
            "The new onboarding checklist lifted week-one activation by six points.",
        ],
    )
    docx_heading(doc, "What needs attention", 2)
    docx_bullets(
        doc,
        [
            "Enterprise pipeline is thinner than plan and concentrated in three accounts.",
            "Two product areas still depend on a single subject-matter expert.",
            "Expansion revenue is strong, but the handoff from support to success is manual.",
        ],
    )
    docx_heading(doc, "Recommendations", 2)
    docx_table(
        doc,
        ["Recommendation", "Owner", "Impact"],
        [
            ["Add two enterprise-qualified pipeline sources", "Revenue", "High"],
            ["Document the top five support playbooks", "Customer", "Medium"],
            ["Automate support-to-success handoff", "Operations", "High"],
        ],
        [3.55, 1.35, 1.65],
    )
    docx_heading(doc, "Appendix: method", 2)
    docx_body(
        doc,
        "Figures are unaudited management accounts through 30 September 2026. Retention is net revenue retention on a trailing-twelve-month basis. Pipeline coverage compares qualified pipeline to the next-quarter target.",
    )
    doc.save(OUT / "Business Report.docx")


# ── XLSX helpers and templates ───────────────────────────────────────────────
THIN = Side(style="thin", color=LINE)
MEDIUM = Side(style="medium", color=NAVY)
GRID = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def _sheet_title(ws, title: str, subtitle: str, columns: int) -> None:
    ws.sheet_view.showGridLines = False
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=columns)
    c = ws.cell(row=1, column=1, value=title)
    c.font = Font(name=BRAND_FONT, size=22, bold=True, color=WHITE)
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(vertical="center", indent=1)
    ws.row_dimensions[1].height = 46
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=columns)
    c = ws.cell(row=2, column=2 - 1, value=None)
    c = ws.cell(row=2, column=1, value=subtitle)
    c.font = Font(name=BRAND_FONT, size=10, italic=True, color=MUTED)
    c.fill = PatternFill("solid", fgColor=PAPER)
    c.alignment = Alignment(vertical="center", indent=1)
    ws.row_dimensions[2].height = 28


def _header_row(ws, row: int, values: list[str]) -> None:
    for i, value in enumerate(values, 1):
        c = ws.cell(row=row, column=i, value=value)
        c.font = Font(name=BRAND_FONT, size=10, bold=True, color=WHITE)
        c.fill = PatternFill("solid", fgColor=VIOLET_DARK)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = Border(bottom=MEDIUM)
    ws.row_dimensions[row].height = 28


def _body_cell(ws, row: int, col: int, value, fmt: str | None = None, bold=False, align="left"):
    c = ws.cell(row=row, column=col, value=value)
    c.font = Font(name=BRAND_FONT, size=10, bold=bold, color=INK)
    c.alignment = Alignment(horizontal=align, vertical="center", wrap_text=True)
    c.border = GRID
    if fmt:
        c.number_format = fmt
    if row % 2 == 0:
        c.fill = PatternFill("solid", fgColor="F8F9FD")
    ws.row_dimensions[row].height = 24
    return c


def _print_setup(ws, title: str, columns: int, orientation: str = "landscape") -> None:
    ws.page_setup.orientation = orientation
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True
    ws.page_margins.left = 0.45
    ws.page_margins.right = 0.45
    ws.page_margins.top = 0.65
    ws.page_margins.bottom = 0.6
    ws.oddHeader.center.text = f"&BSS OFFICE&\"Calibri,Bold\"  /  {title}"
    ws.oddHeader.center.size = 9
    ws.oddHeader.center.color = "667085"
    ws.oddFooter.left.text = "Built with SS Office"
    ws.oddFooter.left.size = 8
    ws.oddFooter.left.color = "667085"
    ws.oddFooter.right.text = "Page &P of &N"
    ws.oddFooter.right.size = 8
    ws.oddFooter.right.color = "667085"


def build_budget_planner() -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Budget"
    _sheet_title(ws, "Budget Planner", "Plan the month, track actuals, keep the variance visible.", 7)
    ws["A3"] = "Month"
    ws["B3"] = "October 2026"
    ws["A3"].font = Font(name=BRAND_FONT, size=10, bold=True, color=MUTED)
    ws["B3"].font = Font(name=BRAND_FONT, size=10, bold=True, color=NAVY)
    ws["D3"] = "Currency"
    ws["E3"] = "USD"
    ws["D3"].font = Font(name=BRAND_FONT, size=10, bold=True, color=MUTED)
    ws["E3"].font = Font(name=BRAND_FONT, size=10, bold=True, color=NAVY)

    headers = ["Category", "Planned", "Actual", "Variance", "Variance %", "Share of plan", "Notes"]
    _header_row(ws, 5, headers)
    categories = [
        ("Housing", 1800, 1800, "Rent"),
        ("Utilities", 220, 245, "Power, water, internet"),
        ("Groceries", 520, 486, "Weekly shop"),
        ("Transport", 260, 238, "Transit and fuel"),
        ("Dining", 180, 214, "Coffee and meals"),
        ("Health", 150, 120, "Gym and pharmacy"),
        ("Entertainment", 120, 96, "Streaming and events"),
        ("Savings", 600, 600, "Transfer on payday"),
    ]
    for r, (name, planned, actual, note) in enumerate(categories, 6):
        _body_cell(ws, r, 1, name, bold=True)
        _body_cell(ws, r, 2, planned, '"$"#,##0', align="right")
        _body_cell(ws, r, 3, actual, '"$"#,##0', align="right")
        _body_cell(ws, r, 4, f"=C{r}-B{r}", '"$"#,##0;[Red]-"$"#,##0', align="right")
        _body_cell(ws, r, 5, f"=IF(B{r}=0,0,D{r}/B{r})", "0.0%;[Red]-0.0%", align="right")
        _body_cell(ws, r, 6, f"=IF($B$16=0,0,B{r}/$B$16)", "0.0%", align="right")
        _body_cell(ws, r, 7, note)
    _body_cell(ws, 16, 1, "TOTAL", bold=True)
    for col in range(2, 5):
        _body_cell(ws, 16, col, f"=SUM({get_column_letter(col)}6:{get_column_letter(col)}15)", '"$"#,##0;[Red]-"$"#,##0', bold=True, align="right")
    _body_cell(ws, 16, 5, "=IF(B16=0,0,D16/B16)", "0.0%;[Red]-0.0%", bold=True, align="right")
    _body_cell(ws, 16, 6, "=SUM(F6:F15)", "0.0%", bold=True, align="right")
    _body_cell(ws, 16, 7, "")

    # A compact health card below the table.
    ws.merge_cells("A18:C18")
    ws["A18"] = "MONTHLY HEALTH"
    ws["A18"].font = Font(name=BRAND_FONT, size=9, bold=True, color=VIOLET_DARK)
    ws["A19"] = "Remaining"
    ws["B19"] = "=B16-C16"
    ws["B19"].number_format = '"$"#,##0;[Red]-"$"#,##0'
    ws["A20"] = "Over budget?"
    ws["B20"] = '=IF(C16>B16,"Yes — review dining and utilities","No — keep going")'
    ws["A19"].font = ws["A20"].font = Font(name=BRAND_FONT, size=10, color=INK)
    ws["B19"].font = ws["B20"].font = Font(name=BRAND_FONT, size=10, bold=True, color=NAVY)

    for i, width in enumerate([22, 13, 13, 13, 13, 14, 32], 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.freeze_panes = "A6"
    ws.auto_filter.ref = "A5:G15"
    ws.conditional_formatting.add(
        "D6:D15",
        CellIsRule(operator="lessThan", formula=["0"], font=Font(color="B42318"), fill=PatternFill("solid", fgColor="FEE4E2")),
    )
    ws.conditional_formatting.add(
        "E6:E15",
        ColorScaleRule(start_type="num", start_value=-0.2, start_color="FEE4E2", mid_type="num", mid_value=0, mid_color="FFFFFF", end_type="num", end_value=0.2, end_color="D1FADF"),
    )
    _print_setup(ws, "Budget Planner", 7, "portrait")
    ws.print_area = "A1:G20"

    guide = wb.create_sheet("Guide")
    _sheet_title(guide, "How to use this planner", "Three minutes now saves a month of guesswork.", 4)
    guide["A4"] = "1"
    guide["B4"] = "Set the month and currency at the top of the Budget sheet."
    guide["A5"] = "2"
    guide["B5"] = "Replace the sample categories and planned amounts with your own."
    guide["A6"] = "3"
    guide["B6"] = "Enter actuals as the month goes. Variance and share update automatically."
    guide["A7"] = "4"
    guide["B7"] = "Review anything red: it is over plan and worth a conscious decision."
    for r in range(4, 8):
        guide.cell(row=r, column=1).font = Font(name=BRAND_FONT, size=16, bold=True, color=VIOLET_DARK)
        guide.cell(row=r, column=2).font = Font(name=BRAND_FONT, size=11, color=INK)
        guide.cell(row=r, column=2).alignment = Alignment(wrap_text=True, vertical="center")
        guide.row_dimensions[r].height = 38
    guide.column_dimensions["A"].width = 5
    guide.column_dimensions["B"].width = 68
    _print_setup(guide, "Budget Planner · Guide", 2, "portrait")
    wb.save(OUT / "Budget Planner.xlsx")


def build_project_tracker() -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Tracker"
    _sheet_title(ws, "Project Tracker", "One view of what is moving, what is blocked and who owns the next step.", 9)
    headers = ["Task", "Owner", "Status", "Priority", "Start", "Due", "% done", "Days left", "Notes"]
    _header_row(ws, 4, headers)
    tasks = [
        ("Finalise launch brief", "Avery", "Done", "High", "2026-10-01", "2026-10-06", 1, "Approved by sponsor"),
        ("Homepage copy", "Priya", "In progress", "High", "2026-10-05", "2026-10-18", 0.7, "Awaiting legal review"),
        ("Pricing page build", "Sam", "In progress", "Medium", "2026-10-08", "2026-10-22", 0.45, "Desktop done"),
        ("Customer quotes", "Mei", "Blocked", "Medium", "2026-10-09", "2026-10-20", 0.2, "Waiting on approvals"),
        ("Press kit", "Jordan", "Not started", "Low", "2026-10-15", "2026-10-27", 0, "Assets ready"),
        ("Analytics QA", "Avery", "In progress", "High", "2026-10-12", "2026-10-24", 0.6, "Events in staging"),
        ("Launch rehearsal", "Team", "Not started", "High", "2026-10-26", "2026-10-29", 0, "Book the room"),
    ]
    for r, row in enumerate(tasks, 5):
        _body_cell(ws, r, 1, row[0], bold=True)
        _body_cell(ws, r, 2, row[1])
        _body_cell(ws, r, 3, row[2], align="center")
        _body_cell(ws, r, 4, row[3], align="center")
        _body_cell(ws, r, 5, row[4], "yyyy-mm-dd")
        _body_cell(ws, r, 6, row[5], "yyyy-mm-dd")
        _body_cell(ws, r, 7, row[6], "0%", align="center")
        _body_cell(ws, r, 8, f'=IF(F{r}="","",F{r}-TODAY())', "0", align="center")
        _body_cell(ws, r, 9, row[7])
    # Summary cards.
    ws["A14"] = "OPEN TASKS"
    ws["B14"] = '=COUNTIF(C5:C11,"<>Done")'
    ws["D14"] = "BLOCKED"
    ws["E14"] = '=COUNTIF(C5:C11,"Blocked")'
    ws["G14"] = "AVG. COMPLETE"
    ws["H14"] = "=AVERAGE(G5:G11)"
    ws["H14"].number_format = "0%"
    for cell in ("A14", "D14", "G14"):
        ws[cell].font = Font(name=BRAND_FONT, size=8, bold=True, color=MUTED)
    for cell in ("B14", "E14", "H14"):
        ws[cell].font = Font(name=BRAND_FONT, size=18, bold=True, color=VIOLET_DARK)
    for c in range(1, 10):
        ws.cell(row=14, column=c).fill = PatternFill("solid", fgColor=PAPER)
        ws.cell(row=14, column=c).alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[14].height = 40

    for i, width in enumerate([30, 12, 13, 10, 12, 12, 9, 9, 28], 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.freeze_panes = "A5"
    ws.auto_filter.ref = "A4:I11"
    _print_setup(ws, "Project Tracker", 9, "landscape")
    ws.print_area = "A1:I14"

    status_colors = {
        "Done": ("D1FADF", "067647"),
        "In progress": ("EAF0FD", "175CD3"),
        "Blocked": ("FEE4E2", "B42318"),
        "Not started": ("F2F4F7", "475467"),
    }
    for status, (fill, font) in status_colors.items():
        ws.conditional_formatting.add(
            f"C5:C11",
            FormulaRule(formula=[f'C5="{status}"'], fill=PatternFill("solid", fgColor=fill), font=Font(color=font, bold=True)),
        )
    dv = DataValidation(type="list", formula1='"Not started,In progress,Blocked,Done"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add("C5:C11")
    dv2 = DataValidation(type="list", formula1='"Low,Medium,High"', allow_blank=True)
    ws.add_data_validation(dv2)
    dv2.add("D5:D11")
    wb.save(OUT / "Project Tracker.xlsx")


def build_sales_pipeline() -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Pipeline"
    _sheet_title(ws, "Sales Pipeline", "A weighted forecast when you need it, a clear next step when you do not.", 10)
    headers = ["Company", "Contact", "Stage", "Owner", "Value", "Probability", "Weighted", "Close date", "Source", "Next step"]
    _header_row(ws, 4, headers)
    deals = [
        ("Northwind", "Dana Ortiz", "Proposal", "Avery", 48000, 0.55, "2026-11-14", "Partner", "Send security appendix"),
        ("Lumen Health", "Ravi Shah", "Discovery", "Sam", 72000, 0.25, "2026-12-05", "Inbound", "Book clinical workshop"),
        ("Atlas Freight", "Nora Kim", "Negotiation", "Avery", 96000, 0.8, "2026-10-31", "Outbound", "Confirm legal redlines"),
        ("Cedar & Co", "Miles Green", "Qualified", "Mei", 24000, 0.15, "2026-12-19", "Referral", "Map success criteria"),
        ("Orbit Labs", "Sofia Ruiz", "Proposal", "Sam", 36000, 0.5, "2026-11-21", "Event", "Follow up on pilot scope"),
        ("Harbor Bank", "Kenji Sato", "Negotiation", "Avery", 120000, 0.7, "2026-11-07", "Partner", "Finalise procurement path"),
        ("Fable Studio", "Iris Bell", "Qualified", "Mei", 18000, 0.2, "2027-01-09", "Inbound", "Send team plan"),
    ]
    for r, row in enumerate(deals, 5):
        _body_cell(ws, r, 1, row[0], bold=True)
        _body_cell(ws, r, 2, row[1])
        _body_cell(ws, r, 3, row[2], align="center")
        _body_cell(ws, r, 4, row[3])
        _body_cell(ws, r, 5, row[4], '"$"#,##0', align="right")
        _body_cell(ws, r, 6, row[5], "0%", align="center")
        _body_cell(ws, r, 7, f"=E{r}*F{r}", '"$"#,##0', align="right")
        _body_cell(ws, r, 8, row[6], "yyyy-mm-dd")
        _body_cell(ws, r, 9, row[7])
        _body_cell(ws, r, 10, row[8])
    ws["A14"] = "PIPELINE"
    ws["B14"] = "=SUM(E5:E11)"
    ws["D14"] = "WEIGHTED"
    ws["E14"] = "=SUM(G5:G11)"
    ws["G14"] = "DEALS"
    ws["H14"] = "=COUNTA(A5:A11)"
    for cell in ("A14", "D14", "G14"):
        ws[cell].font = Font(name=BRAND_FONT, size=8, bold=True, color=MUTED)
    for cell in ("B14", "E14", "H14"):
        ws[cell].font = Font(name=BRAND_FONT, size=18, bold=True, color=VIOLET_DARK)
    for c in range(1, 11):
        ws.cell(row=14, column=c).fill = PatternFill("solid", fgColor=PAPER)
        ws.cell(row=14, column=c).alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[14].height = 40

    for i, width in enumerate([22, 18, 15, 10, 13, 12, 14, 13, 12, 30], 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.freeze_panes = "A5"
    ws.auto_filter.ref = "A4:J11"
    _print_setup(ws, "Sales Pipeline", 10, "landscape")
    ws.print_area = "A1:J14"

    stage_colors = {
        "Qualified": ("F2F4F7", "475467"),
        "Discovery": ("EAF0FD", "175CD3"),
        "Proposal": ("F2EDFF", "6D3BE8"),
        "Negotiation": ("FEF0C7", "B54708"),
        "Won": ("D1FADF", "067647"),
    }
    for status, (fill, font) in stage_colors.items():
        ws.conditional_formatting.add(
            "C5:C11",
            FormulaRule(formula=[f'C5="{status}"'], fill=PatternFill("solid", fgColor=fill), font=Font(color=font, bold=True)),
        )
    dv = DataValidation(type="list", formula1='"Qualified,Discovery,Proposal,Negotiation,Won,Lost"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add("C5:C11")
    ws.conditional_formatting.add(
        "F5:F11",
        ColorScaleRule(start_type="num", start_value=0, start_color="FEE4E2", mid_type="num", mid_value=0.5, mid_color="FEF0C7", end_type="num", end_value=1, end_color="D1FADF"),
    )
    wb.save(OUT / "Sales Pipeline.xlsx")


# ── PPTX helpers and templates ───────────────────────────────────────────────
SLIDE_W = PptxInches(13.333)
SLIDE_H = PptxInches(7.5)


def _pptx_color(hex_value: str) -> PptxRGB:
    return PptxRGB.from_string(hex_value)


def _pptx_bg(slide, hex_value: str = NAVY) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = _pptx_color(hex_value)


def _pptx_rect(slide, x, y, w, h, fill, line=None, shape=MSO_SHAPE.RECTANGLE, radius=None):
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        shape_obj = slide.shapes.add_shape(shape, x, y, w, h)
        shape_obj.adjustments[0] = radius
    else:
        shape_obj = slide.shapes.add_shape(shape, x, y, w, h)
    shape_obj.fill.solid()
    shape_obj.fill.fore_color.rgb = _pptx_color(fill)
    if line:
        shape_obj.line.color.rgb = _pptx_color(line)
        shape_obj.line.width = PptxPt(1)
    else:
        shape_obj.line.fill.background()
    shape_obj.shadow.inherit = False
    return shape_obj


def _pptx_text(slide, text, x, y, w, h, size=18, color=WHITE, bold=False, font=BRAND_FONT,
               align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, italic=False, spacing=None):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    if spacing is not None:
        p.space_after = PptxPt(spacing)
    r = p.add_run()
    r.text = text
    r.font.name = font
    r.font.size = PptxPt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.color.rgb = _pptx_color(color)
    return box


def _pptx_bullets(slide, items, x, y, w, h, size=15, color="D7DDF0", bullet_color=CYAN):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = PptxPt(10)
        r = p.add_run()
        r.text = "•  "
        r.font.name = BRAND_FONT
        r.font.size = PptxPt(size)
        r.font.color.rgb = _pptx_color(bullet_color)
        r.font.bold = True
        r2 = p.add_run()
        r2.text = item
        r2.font.name = BRAND_FONT
        r2.font.size = PptxPt(size)
        r2.font.color.rgb = _pptx_color(color)
    return box


def _pptx_chrome(slide, section: str, page: int) -> None:
    _pptx_rect(slide, 0, 0, SLIDE_W, PptxInches(0.09), VIOLET)
    _pptx_text(slide, "SS OFFICE", PptxInches(0.72), PptxInches(0.42), PptxInches(2.4), PptxInches(0.3), 10, "8C93A8", True)
    _pptx_text(slide, section.upper(), PptxInches(0.72), PptxInches(0.64), PptxInches(5.0), PptxInches(0.3), 8.5, CYAN, True)
    _pptx_text(slide, f"{page:02d}", PptxInches(12.15), PptxInches(7.0), PptxInches(0.5), PptxInches(0.25), 9, "8C93A8", True, align=PP_ALIGN.RIGHT)


def _pptx_title_slide(prs, kicker, title, subtitle):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _pptx_bg(slide, NAVY)
    _pptx_rect(slide, 0, 0, PptxInches(0.16), SLIDE_H, VIOLET)
    _pptx_rect(slide, PptxInches(0.9), PptxInches(1.15), PptxInches(0.72), PptxInches(0.08), CYAN)
    _pptx_text(slide, kicker.upper(), PptxInches(0.9), PptxInches(1.42), PptxInches(8.5), PptxInches(0.35), 11, CYAN, True)
    _pptx_text(slide, title, PptxInches(0.9), PptxInches(1.92), PptxInches(10.8), PptxInches(2.5), 48, WHITE, True, font=DISPLAY_FONT)
    _pptx_text(slide, subtitle, PptxInches(0.92), PptxInches(4.55), PptxInches(9.2), PptxInches(0.8), 18, "C7D2FE")
    _pptx_text(slide, "SS OFFICE  /  TEMPLATE LIBRARY", PptxInches(0.92), PptxInches(6.62), PptxInches(5.2), PptxInches(0.3), 9, "8C93A8", True)
    _pptx_text(slide, "2026", PptxInches(12.0), PptxInches(6.62), PptxInches(0.6), PptxInches(0.3), 9, "8C93A8", True, align=PP_ALIGN.RIGHT)
    return slide


def _pptx_content_slide(prs, eyebrow, title, page):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _pptx_bg(slide, NAVY)
    _pptx_chrome(slide, eyebrow, page)
    _pptx_text(slide, title, PptxInches(0.72), PptxInches(1.18), PptxInches(11.7), PptxInches(1.1), 31, WHITE, True, font=DISPLAY_FONT)
    return slide


def _pptx_card(slide, x, y, w, h, number, heading, body, accent=VIOLET):
    _pptx_rect(slide, x, y, w, h, NAVY_2, "27304D", MSO_SHAPE.ROUNDED_RECTANGLE, 0.08)
    _pptx_rect(slide, x, y, PptxInches(0.06), h, accent)
    _pptx_text(slide, number, x + PptxInches(0.3), y + PptxInches(0.28), PptxInches(0.6), PptxInches(0.3), 11, accent, True)
    _pptx_text(slide, heading, x + PptxInches(0.3), y + PptxInches(0.67), w - PptxInches(0.6), PptxInches(0.4), 17, WHITE, True)
    _pptx_text(slide, body, x + PptxInches(0.3), y + PptxInches(1.12), w - PptxInches(0.6), h - PptxInches(1.35), 11.5, "AEB8D0")


def build_startup_pitch() -> None:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    _pptx_title_slide(prs, "Seed round / 2026", "The operating system for modern teams.", "Northstar turns scattered work into one calm, AI-native workspace.")
    s = _pptx_content_slide(prs, "The problem", "Teams do not need more tabs. They need one place where work moves.", 2)
    _pptx_card(s, PptxInches(0.72), PptxInches(2.65), PptxInches(3.75), PptxInches(2.55), "01", "Fragmented", "Five tools, three inboxes and a weekly meeting just to find the latest version.")
    _pptx_card(s, PptxInches(4.79), PptxInches(2.65), PptxInches(3.75), PptxInches(2.55), "02", "Slow", "Context switching costs each person nearly an hour a day.")
    _pptx_card(s, PptxInches(8.86), PptxInches(2.65), PptxInches(3.75), PptxInches(2.55), "03", "Opaque", "Leaders cannot see where work is stuck until the deadline is already close.")
    _pptx_text(s, "The cost is not software. It is momentum.", PptxInches(0.72), PptxInches(5.75), PptxInches(10.5), PptxInches(0.4), 15, CYAN, True, italic=True)
    s = _pptx_content_slide(prs, "The solution", "One workspace. Every format. AI that knows the context.", 3)
    _pptx_rect(s, PptxInches(0.72), PptxInches(2.5), PptxInches(5.6), PptxInches(3.55), NAVY_2, "27304D", MSO_SHAPE.ROUNDED_RECTANGLE, 0.06)
    _pptx_text(s, "SS Office workspace", PptxInches(1.05), PptxInches(2.82), PptxInches(4.8), PptxInches(0.4), 19, WHITE, True)
    _pptx_bullets(s, ["Docs, sheets, slides, PDF and the web in one window", "AI drafting and review inside the file, not beside it", "Local-first files with cloud when you want it"], PptxInches(1.05), PptxInches(3.4), PptxInches(4.8), PptxInches(2.2), 13)
    _pptx_rect(s, PptxInches(6.65), PptxInches(2.5), PptxInches(5.97), PptxInches(3.55), "111B36", "27304D", MSO_SHAPE.ROUNDED_RECTANGLE, 0.06)
    _pptx_text(s, "What changes for a team", PptxInches(6.98), PptxInches(2.82), PptxInches(5.2), PptxInches(0.4), 19, WHITE, True)
    _pptx_bullets(s, ["A draft starts from a template, not a blank page", "The assistant can edit the actual document", "Every decision keeps its source and owner"], PptxInches(6.98), PptxInches(3.4), PptxInches(5.2), PptxInches(2.2), 13, bullet_color=VIOLET)
    s = _pptx_content_slide(prs, "Market", "A large, durable shift from suites to AI-native workspaces.", 4)
    _pptx_text(s, "$84B", PptxInches(0.72), PptxInches(2.55), PptxInches(4.2), PptxInches(1.1), 48, CYAN, True, font=DISPLAY_FONT)
    _pptx_text(s, "productivity software market by 2029", PptxInches(0.75), PptxInches(3.72), PptxInches(4.0), PptxInches(0.6), 13, "AEB8D0")
    _pptx_text(s, "18%", PptxInches(5.25), PptxInches(2.55), PptxInches(3.0), PptxInches(1.1), 48, VIOLET, True, font=DISPLAY_FONT)
    _pptx_text(s, "annual growth in AI-assisted knowledge work", PptxInches(5.28), PptxInches(3.72), PptxInches(3.4), PptxInches(0.6), 13, "AEB8D0")
    _pptx_text(s, "3×", PptxInches(9.6), PptxInches(2.55), PptxInches(2.4), PptxInches(1.1), 48, MINT, True, font=DISPLAY_FONT)
    _pptx_text(s, "faster first draft with in-file AI", PptxInches(9.63), PptxInches(3.72), PptxInches(2.9), PptxInches(0.6), 13, "AEB8D0")
    _pptx_text(s, "Our beachhead: 20–200 person teams that live in documents and decks.", PptxInches(0.72), PptxInches(5.55), PptxInches(11.4), PptxInches(0.5), 15, WHITE, True)
    s = _pptx_content_slide(prs, "Traction", "The first cohort is already moving faster.", 5)
    stats = [("1,240", "weekly active teams"), ("38%", "week-four retention"), ("4.8/5", "average customer rating"), ("112%", "net revenue retention")]
    for i, (value, label) in enumerate(stats):
        x = PptxInches(0.72 + i * 3.03)
        _pptx_rect(s, x, PptxInches(2.7), PptxInches(2.72), PptxInches(2.3), NAVY_2, "27304D", MSO_SHAPE.ROUNDED_RECTANGLE, 0.06)
        _pptx_text(s, value, x + PptxInches(0.28), PptxInches(3.02), PptxInches(2.1), PptxInches(0.8), 31, CYAN, True, font=DISPLAY_FONT)
        _pptx_text(s, label, x + PptxInches(0.28), PptxInches(4.0), PptxInches(2.1), PptxInches(0.5), 11.5, "AEB8D0")
    _pptx_text(s, "Fastest-growing segments: product, design and professional services.", PptxInches(0.72), PptxInches(5.7), PptxInches(11.3), PptxInches(0.5), 14, WHITE)
    s = _pptx_content_slide(prs, "The ask", "Raising $6M to make SS Office the default workspace for 10,000 teams.", 6)
    _pptx_text(s, "$6M", PptxInches(0.72), PptxInches(2.35), PptxInches(4.2), PptxInches(1.1), 52, CYAN, True, font=DISPLAY_FONT)
    _pptx_text(s, "18-month runway", PptxInches(0.75), PptxInches(3.55), PptxInches(3.2), PptxInches(0.4), 13, "AEB8D0")
    _pptx_bullets(s, ["45% product and AI engineering", "30% go-to-market and partnerships", "25% trust, security and operations"], PptxInches(5.1), PptxInches(2.32), PptxInches(5.0), PptxInches(2.1), 15)
    _pptx_rect(s, PptxInches(10.25), PptxInches(2.45), PptxInches(2.3), PptxInches(1.55), VIOLET, None, MSO_SHAPE.ROUNDED_RECTANGLE, 0.08)
    _pptx_text(s, "Let's build\nthe calm default.", PptxInches(10.52), PptxInches(2.7), PptxInches(1.85), PptxInches(1.05), 14, WHITE, True)
    _pptx_text(s, "hello@plotxyz.ai", PptxInches(10.52), PptxInches(5.2), PptxInches(2.3), PptxInches(0.4), 11, CYAN, True)
    prs.save(OUT / "Startup Pitch.pptx")


def build_quarterly_review() -> None:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    _pptx_title_slide(prs, "Quarterly review / Q3 2026", "Momentum, focus and the next constraint.", "A clear look at what moved, what did not and what we do next.")
    s = _pptx_content_slide(prs, "Executive summary", "A strong quarter with one clear bottleneck.", 2)
    _pptx_card(s, PptxInches(0.72), PptxInches(2.55), PptxInches(3.75), PptxInches(2.75), "01", "Growth", "Revenue up 18% quarter over quarter, led by mid-market expansion.")
    _pptx_card(s, PptxInches(4.79), PptxInches(2.55), PptxInches(3.75), PptxInches(2.75), "02", "Efficiency", "Gross margin improved 2.1 points after support automation.")
    _pptx_card(s, PptxInches(8.86), PptxInches(2.55), PptxInches(3.75), PptxInches(2.75), "03", "Constraint", "Enterprise pipeline coverage is 2.6× against a 3.1× target.", accent=AMBER)
    s = _pptx_content_slide(prs, "Performance", "The numbers behind the headline.", 3)
    rows = [("Revenue", "$4.82M", "+18.1%"), ("Gross margin", "78.4%", "+2.1 pts"), ("Net retention", "94%", "+1 pt"), ("New logos", "37", "+6"), ("Pipeline coverage", "2.6×", "−0.5×")]
    for i, (label, value, delta) in enumerate(rows):
        y = PptxInches(2.5 + i * 0.78)
        _pptx_text(s, label, PptxInches(0.9), y, PptxInches(3.2), PptxInches(0.4), 13, "AEB8D0")
        _pptx_text(s, value, PptxInches(4.4), y, PptxInches(1.8), PptxInches(0.4), 16, WHITE, True)
        _pptx_text(s, delta, PptxInches(6.4), y, PptxInches(1.8), PptxInches(0.4), 13, MINT if not delta.startswith("−") else BLUSH, True)
        _pptx_rect(s, PptxInches(8.2), y + PptxInches(0.1), PptxInches(3.9), PptxInches(0.04), "27304D")
        _pptx_rect(s, PptxInches(8.2), y + PptxInches(0.1), PptxInches(3.9 * (0.5 + i * 0.08)), PptxInches(0.04), VIOLET)
    s = _pptx_content_slide(prs, "Highlights", "Three things that worked.", 4)
    _pptx_card(s, PptxInches(0.72), PptxInches(2.55), PptxInches(5.78), PptxInches(1.65), "01", "Mid-market playbook", "Nine days off the sales cycle and a repeatable first-call narrative.", MINT)
    _pptx_card(s, PptxInches(6.83), PptxInches(2.55), PptxInches(5.78), PptxInches(1.65), "02", "Support automation", "32% of tier-one tickets resolved without a human handoff.", CYAN)
    _pptx_card(s, PptxInches(0.72), PptxInches(4.55), PptxInches(5.78), PptxInches(1.65), "03", "Onboarding checklist", "Week-one activation up six points after moving the checklist earlier.", VIOLET)
    s = _pptx_content_slide(prs, "Focus", "What we are doing next quarter.", 5)
    _pptx_bullets(s, ["Add two enterprise-qualified pipeline sources.", "Automate the support-to-success handoff.", "Document the top five support playbooks.", "Keep the mid-market playbook and measure the lift."], PptxInches(0.85), PptxInches(2.55), PptxInches(10.9), PptxInches(2.8), 17)
    _pptx_text(s, "The goal is not more activity. It is fewer, better-sourced conversations.", PptxInches(0.85), PptxInches(5.65), PptxInches(10.5), PptxInches(0.5), 14, CYAN, True, italic=True)
    prs.save(OUT / "Quarterly Review.pptx")


def build_product_launch() -> None:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    _pptx_title_slide(prs, "Product launch / 2026", "Meet the workspace that keeps the whole team in flow.", "A coordinated launch plan for the next chapter of SS Office.")
    s = _pptx_content_slide(prs, "Opportunity", "The launch moment is a category shift, not a feature drop.", 2)
    _pptx_text(s, "Teams are ready to replace five disconnected tools with one calm workspace.", PptxInches(0.72), PptxInches(2.35), PptxInches(11.6), PptxInches(1.15), 27, WHITE, True, font=DISPLAY_FONT)
    for i, (label, value) in enumerate([("Awareness", "Reach 250k knowledge workers"), ("Activation", "10k teams start a first file"), ("Expansion", "25% upgrade within 90 days")]):
        x = PptxInches(0.72 + i * 4.02)
        _pptx_rect(s, x, PptxInches(4.35), PptxInches(3.7), PptxInches(1.35), NAVY_2, "27304D", MSO_SHAPE.ROUNDED_RECTANGLE, 0.06)
        _pptx_text(s, label.upper(), x + PptxInches(0.24), PptxInches(4.58), PptxInches(3.2), PptxInches(0.25), 8, CYAN, True)
        _pptx_text(s, value, x + PptxInches(0.24), PptxInches(4.92), PptxInches(3.2), PptxInches(0.45), 14, WHITE, True)
    s = _pptx_content_slide(prs, "The product", "Everything a team needs, in one window.", 3)
    _pptx_bullets(s, ["Docs, sheets, slides, PDF and the web: no format left behind.", "In-file AI that can draft, review and edit the actual work.", "A template gallery for the moments that matter.", "Local-first files with cloud collaboration when you want it."], PptxInches(0.85), PptxInches(2.4), PptxInches(7.1), PptxInches(3.4), 16)
    _pptx_rect(s, PptxInches(8.35), PptxInches(2.35), PptxInches(4.25), PptxInches(3.65), "111B36", "27304D", MSO_SHAPE.ROUNDED_RECTANGLE, 0.06)
    _pptx_text(s, "One calm surface", PptxInches(8.7), PptxInches(2.7), PptxInches(3.6), PptxInches(0.4), 18, WHITE, True)
    _pptx_text(s, "A midnight canvas, violet accents and just enough structure to keep the work moving.", PptxInches(8.7), PptxInches(3.25), PptxInches(3.5), PptxInches(1.25), 13, "AEB8D0")
    s = _pptx_content_slide(prs, "Go-to-market", "A launch that compounds after week one.", 4)
    _pptx_card(s, PptxInches(0.72), PptxInches(2.5), PptxInches(3.75), PptxInches(2.35), "01", "Community", "Founder-led demos and a template challenge for operators.")
    _pptx_card(s, PptxInches(4.79), PptxInches(2.5), PptxInches(3.75), PptxInches(2.35), "02", "Partners", "Co-marketing with five agencies and fractional teams.")
    _pptx_card(s, PptxInches(8.86), PptxInches(2.5), PptxInches(3.75), PptxInches(2.35), "03", "Product", "A free template library that becomes the top of the funnel.")
    _pptx_text(s, "Every touchpoint ends in a file the customer can keep.", PptxInches(0.72), PptxInches(5.55), PptxInches(10.8), PptxInches(0.4), 14, CYAN, True, italic=True)
    s = _pptx_content_slide(prs, "Timeline", "Six weeks from prep to compounding growth.", 5)
    steps = [("Week 1", "Prep", "Assets, docs, partner kit"), ("Week 2", "Tease", "Community preview"), ("Week 3", "Launch", "Product Hunt, press, demo"), ("Week 4–6", "Compound", "Templates, referrals, webinars")]
    for i, (week, name, detail) in enumerate(steps):
        x = PptxInches(0.72 + i * 3.03)
        _pptx_text(s, week.upper(), x, PptxInches(2.65), PptxInches(2.6), PptxInches(0.3), 9, CYAN, True)
        _pptx_text(s, name, x, PptxInches(3.05), PptxInches(2.6), PptxInches(0.5), 19, WHITE, True)
        _pptx_text(s, detail, x, PptxInches(3.62), PptxInches(2.6), PptxInches(0.8), 12, "AEB8D0")
        _pptx_rect(s, x, PptxInches(4.55), PptxInches(2.55), PptxInches(0.04), "27304D")
        _pptx_rect(s, x, PptxInches(4.55), PptxInches(2.55 * ((i + 1) / 4)), PptxInches(0.04), VIOLET)
    _pptx_text(s, "Launch is not the finish line. The library is.", PptxInches(0.72), PptxInches(5.45), PptxInches(10.8), PptxInches(0.5), 14, WHITE, True)
    prs.save(OUT / "Product Launch.pptx")


# ── text templates ───────────────────────────────────────────────────────────
def build_markdown_templates() -> None:
    (OUT / "Product Spec.md").write_text(
        """# Product Specification — Workspace 2.0

**Status:** Draft for review  
**Owner:** Product  
**Last updated:** 21 October 2026

> [!NOTE]
> This template uses the SS Office Markdown conventions. Keep the summary short; the details belong under the sections below.

## 1. Summary

Workspace 2.0 gives a team one calm place to start, draft and finish work. It brings templates, recent files and in-file AI into a single surface while keeping every file local-first.

## 2. Problem

Teams switch between a documents tool, a spreadsheet, a deck editor and an AI chat window. The context never travels with the work, so the first ten minutes of every task are spent finding the right place to begin.

## 3. Goals

- Make the first useful action obvious from the home screen.
- Let AI work on the actual document, not a copy in a chat window.
- Give every common task a credible starting point.
- Keep files portable and useful outside SS Office.

### Non-goals

- Replacing a full project-management suite.
- Real-time multiplayer in the first release.
- A public template marketplace.

## 4. User stories

| As a… | I want… | So that… |
| --- | --- | --- |
| New user | to start from a template | I do not face a blank page |
| Returning user | to see my recent files | I can resume in one click |
| Team lead | to ask AI about my starred files | answers include sources I can open |
| Designer | to adjust a template in the editor | the result still feels like my work |

## 5. Requirements

### Must have

1. A template gallery grouped by document type.
2. Templates open as editable copies, never as read-only samples.
3. AI actions appear inside Docs, Sheets, Slides, Markdown and HTML.
4. The app remembers the last save folder per format.

### Should have

1. A command palette for creating and opening files.
2. Recently used templates on the home screen.
3. A clear empty state for every editor.

## 6. Success metrics

- **Activation:** 60% of new users open a template in their first session.
- **Time to first save:** under 4 minutes.
- **Repeat use:** 35% of activated users return within 7 days.
- **AI trust:** 70% of AI-assisted files keep at least one AI edit.

## 7. Launch plan

| Phase | Date | Exit criteria |
| --- | --- | --- |
| Internal beta | 28 Oct | All templates open and save |
| Design QA | 4 Nov | No truncation at 720px width |
| Public beta | 11 Nov | Activation baseline recorded |
| General availability | 25 Nov | Support playbook published |

## 8. Open questions

- Should templates carry a “sample content” banner until first save?
- Which three templates deserve a home-screen shortcut?
- How do we measure trust without adding friction?
""",
        encoding="utf-8",
    )
    (OUT / "Knowledge Base Article.md").write_text(
        """# How to run a calm weekly review

A weekly review is a small ritual with a large payoff: it closes open loops, surfaces the one thing that matters next and keeps the team from confusing activity with progress.

## Before the meeting

1. Open the team tracker and mark every task that moved.
2. Add a one-line note to anything blocked.
3. Bring one decision, not a status update.

## The 25-minute agenda

| Minutes | Segment | Output |
| --- | --- | --- |
| 0–5 | Wins and signals | Shared context |
| 5–12 | The one metric | A trend, not a number |
| 12–20 | Decisions | Owner and deadline |
| 20–25 | Next week | Three priorities, no more |

> [!TIP]
> If a topic needs more than five minutes, it is a workshop, not a review. Put it in the parking lot and give it a real owner.

## A good decision note

- **Decision:** What we chose.
- **Why:** The evidence and the trade-off.
- **Owner:** One name.
- **Check-in:** The date we will know it worked.

## After the meeting

Send the note within an hour. Keep it in the project folder, not in a chat thread. The next review starts by reading it, not by reconstructing it.

## Related

- [Project Tracker template](../templates)
- [Meeting Notes template](../templates)
- [Weekly review checklist](#)
""",
        encoding="utf-8",
    )


def build_html_template() -> None:
    (OUT / "Landing Page.html").write_text(
        """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lumen — A calmer way to launch</title>
<style>
  :root {
    --ink: #0b1020;
    --ink-2: #151b33;
    --paper: #f7f8fc;
    --muted: #667085;
    --line: #dde3f0;
    --violet: #8b5cf6;
    --cyan: #22d3ee;
    --white: #fff;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: var(--ink);
    background: var(--paper);
    line-height: 1.55;
  }
  a { color: inherit; }
  .wrap { width: min(1160px, calc(100% - 48px)); margin: 0 auto; }
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 26px 0; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: .08em; }
  .mark { width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg, var(--violet), var(--cyan)); }
  .nav nav { display: flex; gap: 26px; font-size: 14px; color: #475467; }
  .nav a { text-decoration: none; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 12px 20px; border-radius: 11px; text-decoration: none;
    font-weight: 700; font-size: 14px; border: 1px solid transparent;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn-dark { background: var(--ink); color: var(--white); }
  .btn-light { background: var(--white); color: var(--ink); border-color: var(--line); }
  .hero { position: relative; overflow: hidden; padding: 76px 0 104px; }
  .hero::before {
    content: ""; position: absolute; width: 640px; height: 640px; right: -180px; top: -260px;
    background: radial-gradient(circle, rgba(139,92,246,.26), rgba(34,211,238,.06) 48%, transparent 70%);
    filter: blur(8px); border-radius: 50%;
  }
  .eyebrow { display: inline-flex; gap: 8px; align-items: center; padding: 7px 12px; border: 1px solid #d9d0ff; background: #f4f0ff; color: #6d3be8; border-radius: 99px; font-size: 12px; font-weight: 700; letter-spacing: .04em; }
  h1 { max-width: 760px; margin: 24px 0 18px; font-size: clamp(42px, 6vw, 76px); line-height: 1.02; letter-spacing: -.045em; }
  .lede { max-width: 600px; font-size: 19px; color: #475467; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
  .proof { display: flex; flex-wrap: wrap; gap: 26px; margin-top: 48px; color: #667085; font-size: 13px; }
  .proof strong { color: var(--ink); }
  .features { padding: 24px 0 76px; }
  .section-head { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 26px; }
  .section-head h2 { margin: 0; font-size: 34px; letter-spacing: -.03em; }
  .section-head p { max-width: 440px; margin: 0; color: #667085; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { padding: 26px; background: var(--white); border: 1px solid var(--line); border-radius: 18px; }
  .card .num { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: #f2edff; color: #6d3be8; font-size: 12px; font-weight: 800; }
  .card h3 { margin: 18px 0 8px; font-size: 19px; }
  .card p { margin: 0; color: #667085; font-size: 14px; }
  .quote { margin: 0 0 76px; padding: 36px; background: var(--ink); color: var(--white); border-radius: 22px; display: grid; grid-template-columns: 1.2fr .8fr; gap: 40px; align-items: center; }
  .quote blockquote { margin: 0; font-family: Georgia, serif; font-size: 28px; line-height: 1.3; letter-spacing: -.02em; }
  .quote p { color: #aeb8d0; font-size: 13px; }
  .quote .stat { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .quote .stat strong { display: block; font-family: Georgia, serif; font-size: 38px; color: var(--cyan); }
  .quote .stat span { font-size: 12px; color: #aeb8d0; }
  .cta { padding: 58px 36px; text-align: center; background: linear-gradient(135deg, #f2edff, #e6fbff); border-radius: 24px; margin-bottom: 76px; }
  .cta h2 { margin: 0 0 10px; font-size: 36px; letter-spacing: -.03em; }
  .cta p { margin: 0 auto 24px; max-width: 520px; color: #475467; }
  footer { border-top: 1px solid var(--line); padding: 30px 0 46px; color: #667085; font-size: 13px; display: flex; justify-content: space-between; gap: 20px; }
  @media (max-width: 820px) {
    .nav nav { display: none; }
    .grid, .quote { grid-template-columns: 1fr; }
    .quote .stat { grid-template-columns: 1fr 1fr; }
    footer { flex-direction: column; }
    .hero { padding-top: 46px; }
  }
  @media print {
    body { background: #fff; }
    .nav, .actions, .proof, .cta, footer { display: none; }
    .hero { padding: 24px 0; }
    .card { break-inside: avoid; }
    h1, h2, h3 { break-after: avoid-page; page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    @page { margin: 18mm; }
  }
</style>
</head>
<body>
<header class="wrap nav">
  <a class="brand" href="#"><span class="mark" aria-hidden="true"></span> LUMEN</a>
  <nav>
    <a href="#product">Product</a>
    <a href="#how">How it works</a>
    <a href="#pricing">Pricing</a>
  </nav>
  <a class="btn btn-dark" href="#pricing">Start free</a>
</header>

<main>
  <section class="hero wrap">
    <span class="eyebrow">NEW · WORKSPACE 2.0</span>
    <h1>A calmer way to launch the work that matters.</h1>
    <p class="lede">Lumen brings the brief, the design and the conversation into one workspace — so the team spends less time finding the work and more time moving it.</p>
    <div class="actions">
      <a class="btn btn-dark" href="#pricing">Start free</a>
      <a class="btn btn-light" href="#product">See how it works</a>
    </div>
    <div class="proof">
      <span><strong>1,240</strong> teams in flow</span>
      <span><strong>4.8/5</strong> average rating</span>
      <span><strong>No card</strong> for the first 14 days</span>
    </div>
  </section>

  <section class="features wrap" id="product">
    <div class="section-head">
      <div>
        <span class="eyebrow">BUILT FOR MOMENTUM</span>
        <h2>One surface. Less ceremony.</h2>
      </div>
      <p>Every feature exists to remove a handoff, a tab or a meeting. Nothing is here just to look busy.</p>
    </div>
    <div class="grid">
      <article class="card"><span class="num">01</span><h3>Briefs that build themselves</h3><p>Start from a proven structure and let the assistant fill the first draft. You keep the judgment.</p></article>
      <article class="card"><span class="num">02</span><h3>Decisions stay attached</h3><p>The note, the owner and the source live with the file, not in a separate thread.</p></article>
      <article class="card"><span class="num">03</span><h3>Launch without the scramble</h3><p>Templates, checklists and a shared calendar turn launch week into a repeatable motion.</p></article>
    </div>
  </section>

  <section class="quote wrap">
    <div>
      <blockquote>“We replaced three tools and a weekly status meeting. The work is calmer — and it ships faster.”</blockquote>
      <p>Maya Chen · Head of Product, Northstar</p>
    </div>
    <div class="stat">
      <div><strong>38%</strong><span>faster first draft</span></div>
      <div><strong>2.4×</strong><span>more launches per quarter</span></div>
    </div>
  </section>

  <section class="cta wrap" id="pricing">
    <h2>Start with the work you already have.</h2>
    <p>Free for individuals. Simple pricing for teams. Bring your files and keep them portable.</p>
    <a class="btn btn-dark" href="#">Create your workspace</a>
  </section>
</main>

<footer class="wrap">
  <span>© 2026 Lumen Studio. Built with SS Office.</span>
  <span>Privacy · Terms · hello@lumen.example</span>
</footer>
</body>
</html>
""",
        encoding="utf-8",
    )


def build_pdf_template() -> None:
    path = OUT / "Project One-Pager.pdf"
    doc = BaseDocTemplate(
        str(path),
        pagesize=LETTER,
        leftMargin=0.72 * inch,
        rightMargin=0.72 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="Project One-Pager",
        author="SS Office",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal", showBoundary=0)

    def decorate(canvas, _doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#0B1020"))
        canvas.rect(0, LETTER[1] - 2.05 * inch, LETTER[0], 2.05 * inch, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#8B5CF6"))
        canvas.rect(0, LETTER[1] - 2.12 * inch, LETTER[0], 0.07 * inch, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#22D3EE"))
        canvas.rect(0.72 * inch, LETTER[1] - 1.35 * inch, 0.55 * inch, 0.045 * inch, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#667085"))
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(0.72 * inch, 0.38 * inch, "SS OFFICE  /  PROJECT ONE-PAGER")
        canvas.drawRightString(LETTER[0] - 0.72 * inch, 0.38 * inch, "PAGE 1 OF 1")
        canvas.setStrokeColor(colors.HexColor("#DDE3F0"))
        canvas.line(0.72 * inch, 0.52 * inch, LETTER[0] - 0.72 * inch, 0.52 * inch)
        canvas.restoreState()

    doc.addPageTemplates([PageTemplate(id="one", frames=[frame], onPage=decorate)])
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27, leading=31, textColor=colors.HexColor("#FFFFFF"), alignment=0, spaceAfter=8)
    kicker = ParagraphStyle("kicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#22D3EE"), spaceAfter=8)
    subtitle = ParagraphStyle("subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=10.5, leading=15, textColor=colors.HexColor("#C7D2FE"))
    h2 = ParagraphStyle("h2", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#0B1020"), spaceBefore=12, spaceAfter=5)
    body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica", fontSize=9.4, leading=13.5, textColor=colors.HexColor("#1B2237"), spaceAfter=4)
    small = ParagraphStyle("small", parent=body, fontSize=8.2, leading=11, textColor=colors.HexColor("#667085"))

    story = [
        Spacer(1, 0.44 * inch),
        Paragraph("NORTHSTAR LABS  /  PROJECT BRIEF", kicker),
        Paragraph("Customer education hub", h1),
        Paragraph("A focused eight-week engagement to make product expertise available on demand.", subtitle),
        Spacer(1, 2.35 * inch),
    ]
    meta = Table(
        [
            [Paragraph("<b>CLIENT</b><br/>Northstar Labs", small), Paragraph("<b>LEAD</b><br/>Avery Chen", small), Paragraph("<b>TIMELINE</b><br/>8 weeks · Jan–Mar", small), Paragraph("<b>BUDGET</b><br/>$48,000", small)],
        ],
        colWidths=[1.75 * inch, 1.55 * inch, 1.55 * inch, 1.55 * inch],
    )
    meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7F8FC")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#DDE3F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDE3F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story += [meta, Paragraph("THE OUTCOME", h2), Paragraph("A launch-ready learning hub that takes a new customer from sign-up to first value in under 15 minutes, with a clear baseline for measuring adoption.", body)]
    story += [Paragraph("WHAT WE WILL DO", h2)]
    for item in [
        "Run discovery interviews and audit the existing content.",
        "Design the information architecture and reusable page templates.",
        "Produce 12 core learning paths (40–60 articles) with consistent structure.",
        "Instrument every path and hand over an editorial system the team can run.",
    ]:
        story.append(Paragraph(f"<font color='#8B5CF6'>•</font>  {item}", body))
    story += [Paragraph("THE PLAN", h2)]
    plan = Table(
        [
            ["WEEK", "MILESTONE"],
            ["1", "Discovery notes and content inventory"],
            ["2–3", "Approved sitemap and page templates"],
            ["4–6", "First six learning paths in review"],
            ["7", "Analytics live in staging"],
            ["8", "Handover, QA and go-live"],
        ],
        colWidths=[0.8 * inch, 5.6 * inch],
    )
    plan.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1020")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#1B2237")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F8FC")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#DDE3F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [plan, Spacer(1, 0.2 * inch), Paragraph("NEXT STEP", h2), Paragraph("Approve the timeline and book the kickoff workshop. We will confirm the sponsor and subject-matter experts within two business days.", body)]
    doc.build(story)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # Remove stale generated files so a renamed template cannot linger.
    for old in OUT.glob("*"):
        if old.is_file():
            old.unlink()
    build_project_proposal()
    build_meeting_notes()
    build_business_report()
    build_budget_planner()
    build_project_tracker()
    build_sales_pipeline()
    build_startup_pitch()
    build_quarterly_review()
    build_product_launch()
    build_markdown_templates()
    build_html_template()
    build_pdf_template()
    for path in sorted(OUT.iterdir()):
        print(f"{path.name:32} {path.stat().st_size:>9,} bytes")


if __name__ == "__main__":
    main()
