from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


OUTPUT = Path("outputs/START-Life-Fit-app-store-submission-form.docx")


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_borders(cell, color="D9D9D9", size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:color"), color)


def set_cell_margins(cell, top=120, start=140, bottom=120, end=140):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def rtl(paragraph, alignment=WD_ALIGN_PARAGRAPH.RIGHT):
    paragraph.alignment = alignment
    p_pr = paragraph._p.get_or_add_pPr()
    bidi = p_pr.find(qn("w:bidi"))
    if bidi is None:
        bidi = OxmlElement("w:bidi")
        p_pr.append(bidi)
    bidi.set(qn("w:val"), "1")
    for run in paragraph.runs:
        r_pr = run._r.get_or_add_rPr()
        run_rtl = r_pr.find(qn("w:rtl"))
        if run_rtl is None:
            run_rtl = OxmlElement("w:rtl")
            r_pr.append(run_rtl)
        run_rtl.set(qn("w:val"), "1")
        run.font.name = "Arial"
        run._element.rPr.rFonts.set(qn("w:cs"), "Arial")


def ltr(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_pr = paragraph._p.get_or_add_pPr()
    bidi = p_pr.find(qn("w:bidi"))
    if bidi is None:
        bidi = OxmlElement("w:bidi")
        p_pr.append(bidi)
    bidi.set(qn("w:val"), "0")
    for run in paragraph.runs:
        r_pr = run._r.get_or_add_rPr()
        run_rtl = r_pr.find(qn("w:rtl"))
        if run_rtl is None:
            run_rtl = OxmlElement("w:rtl")
            r_pr.append(run_rtl)
        run_rtl.set(qn("w:val"), "0")


def add_text(document, text, *, bold_lead=None, space_after=7, keep_with_next=False):
    paragraph = document.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        lead = paragraph.add_run(bold_lead)
        lead.bold = True
        paragraph.add_run(text[len(bold_lead):])
    else:
        paragraph.add_run(text)
    paragraph.paragraph_format.space_after = Pt(space_after)
    paragraph.paragraph_format.line_spacing = 1.18
    paragraph.paragraph_format.keep_with_next = keep_with_next
    rtl(paragraph)
    return paragraph


def add_heading(document, text, level=1):
    paragraph = document.add_paragraph(text, style=f"Heading {level}")
    paragraph.paragraph_format.space_before = Pt(15 if level == 1 else 10)
    paragraph.paragraph_format.space_after = Pt(7)
    paragraph.paragraph_format.keep_with_next = True
    rtl(paragraph)
    return paragraph


def add_check(document, text):
    paragraph = document.add_paragraph()
    paragraph.add_run("☐  ").bold = True
    paragraph.add_run(text)
    paragraph.paragraph_format.left_indent = Cm(0.25)
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.line_spacing = 1.15
    rtl(paragraph)


def add_field_table(document, rows):
    table = document.add_table(rows=0, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    for index, (label, value) in enumerate(rows):
        cells = table.add_row().cells
        cells[0].width = Inches(2.0)
        cells[1].width = Inches(4.7)
        cells[0].text = label
        cells[1].text = value
        for cell in cells:
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_borders(cell)
            set_cell_margins(cell)
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.space_after = Pt(0)
                rtl(paragraph)
        cells[0].paragraphs[0].runs[0].bold = True
        if value.startswith(("http", "+")) or "@" in value:
            ltr(cells[1].paragraphs[0])
        set_cell_shading(cells[0], "EAF4EE")
        if index % 2:
            set_cell_shading(cells[1], "F7F8F7")
        needs_input = label == "להשלמה" or any(
            marker in value for marker in ("להשלמ", "יופק ב", "להזין רק")
        )
        if needs_input:
            for cell in cells:
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.color.rgb = RGBColor(196, 32, 32)
                        run.bold = True
    document.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


document = Document()
section = document.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(0.72)
section.bottom_margin = Inches(0.72)
section.left_margin = Inches(0.8)
section.right_margin = Inches(0.8)

styles = document.styles
styles["Normal"].font.name = "Arial"
styles["Normal"]._element.rPr.rFonts.set(qn("w:cs"), "Arial")
styles["Normal"].font.size = Pt(11)
styles["Normal"].font.color.rgb = RGBColor(0, 0, 0)
for style_name, size in (("Title", 24), ("Heading 1", 16), ("Heading 2", 13)):
    style = styles[style_name]
    style.font.name = "Arial"
    style._element.rPr.rFonts.set(qn("w:cs"), "Arial")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor(0, 0, 0)
    if style_name == "Title":
        p_pr = style._element.get_or_add_pPr()
        border = p_pr.find(qn("w:pBdr"))
        if border is not None:
            p_pr.remove(border)

title = document.add_paragraph("פרטי הגשה ומוכנות ל App Store", style="Title")
title.paragraph_format.space_after = Pt(8)
title_pr = title._p.get_or_add_pPr()
title_border = title_pr.find(qn("w:pBdr"))
if title_border is not None:
    title_pr.remove(title_border)
rtl(title)
subtitle = document.add_paragraph("אפליקציית START LIFE FIT")
subtitle.runs[0].bold = True
subtitle.runs[0].font.size = Pt(14)
subtitle.paragraph_format.space_after = Pt(16)
rtl(subtitle)

add_text(
    document,
    "זהו דף העבודה המרכזי להכנת START LIFE FIT להגשה ל־TestFlight ול־App Store. הפרטים שניתן לאמת מהאפליקציה ומהמסמכים מולאו מראש. חתימת עורך דין אינה נדרשת להגשה ל־Apple. הפרטים שמסומנים להשלמה תלויים בחשבון Apple Developer או בפרטי בעל החשבון ולכן יש למלא אותם לאחר ההרשמה.",
    space_after=12,
)
notice = document.add_paragraph()
notice_run = notice.add_run("טקסט אדום מסמן שדה שעליך למלא או להשלים.")
notice_run.bold = True
notice_run.font.color.rgb = RGBColor(196, 32, 32)
notice.paragraph_format.space_after = Pt(10)
rtl(notice)

add_heading(document, "פרטי האפליקציה")
add_field_table(document, [
    ("שם האפליקציה", "START LIFE FIT"),
    ("פלטפורמה", "iOS"),
    ("מזהה חבילה", "co.il.startcoaching.app"),
    ("גרסה ומספר בנייה", "1.0  |  Build 1"),
    ("גרסת iOS מזערית", "iOS 15.0"),
    ("שפה ראשית", "עברית"),
    ("קטגוריה ראשית", "Health & Fitness"),
    ("אימייל תמיכה", "start.elicohenfitness@gmail.com"),
    ("שם המוכר", "אלי כהן"),
    ("סוג העסק", "עסק עצמאי"),
    ("מספר עוסק", "301658225"),
    ("בעל זכויות יוצרים", "2026 אלי כהן"),
])

document.add_page_break()
add_heading(document, "כתובות ציבוריות")
add_field_table(document, [
    ("מדיניות פרטיות", "https://start.elicohenfitness.co.il/privacy"),
    ("תנאי שימוש", "https://start.elicohenfitness.co.il/terms"),
    ("עמוד תמיכה", "https://start.elicohenfitness.co.il/app-support"),
])

add_heading(document, "מטא דאטה מוכן להעתקה")
add_field_table(document, [
    ("כותרת משנה", "האימונים והתזונה שלך במקום אחד"),
    ("טקסט קידום", "תוכנית אישית, מעקב פשוט ותקשורת ישירה עם המאמן לאורך כל השבוע"),
    ("מילות מפתח", "כושר,אימונים,תזונה,מאמן אישי,מעקב,צעדים,תפריט,בריאות"),
    ("מה חדש", "גרסה ראשונה של START LIFE FIT"),
])
add_text(
    document,
    "תיאור האפליקציה",
    bold_lead="תיאור האפליקציה",
    keep_with_next=True,
)
add_text(
    document,
    "START LIFE FIT היא אפליקציית ליווי אישית למתאמנים של START LIFE FIT. באפליקציה אפשר לצפות בתוכניות אימון ובתפריטי תזונה שהמאמן התאים למשתמש, לתעד ביצוע בזמן אמת, לעקוב אחר משקל ומדידות, לשלוח צ׳ק אין ולשמור על קשר ישיר עם המאמן. האפליקציה כוללת מעקב אופציונלי אחר צעדים מ־Apple Health לאחר קבלת הרשאה. הגישה מיועדת ללקוחות שקיבלו הזמנה, והאפליקציה אינה תחליף לייעוץ רפואי.",
    space_after=12,
)

add_heading(document, "הצהרות פרטיות ל App Store Connect")
for item in [
    "פרטי קשר — שם, אימייל וטלפון אופציונלי — מקושרים למשתמש ומשמשים לניהול החשבון ולתקשורת.",
    "נתוני בריאות וכושר — צעדים, משקל, מדידות, אימונים ויעדי תזונה — מקושרים למשתמש ומשמשים לתפקוד האפליקציה ולליווי אישי.",
    "תוכן משתמש — הודעות, תשובות צ׳ק אין והערות רפואיות שהמשתמש מוסר — משמש לתפקוד האפליקציה ולליווי.",
    "תמונות וסרטונים — תמונות התקדמות, ארוחות וסרטוני טכניקה — מקושרים למשתמש ומשמשים לתפקוד האפליקציה.",
    "מזהים — מזהה חשבון, מזהה מכשיר או הפעלה וטוקן התראות — משמשים לאימות, אבטחה והתראות.",
    "נתוני שימוש ואבחון עשויים להיאסף לצורך אמינות ותמיכה.",
    "המידע אינו משמש לפרסום של צד שלישי או למעקב בין חברות.",
    "נתוני בריאות וכושר אינם נמכרים ואינם משמשים לשיווק.",
    "תיאור ארוחה או תמונה נשלחים ל־OpenAI רק כשהמשתמש מבקש ביוזמתו הערכת תזונה.",
]:
    add_check(document, item)

reviewer_heading = add_heading(document, "מידע לבודק של Apple")
reviewer_heading.paragraph_format.page_break_before = True
add_text(
    document,
    "START LIFE FIT היא אפליקציית ליווי למוזמנים בלבד. חשבון הבדיקה חייב להיות חשבון ייעודי עם נתונים לדוגמה שאינם שייכים לאדם אמיתי. יש להזין את פרטי הכניסה בשדה App Review Information ולא לפרסם את הסיסמה במסמך זה.",
)
add_field_table(document, [
    ("אימייל איש קשר", "start.elicohenfitness@gmail.com"),
    ("טלפון איש קשר", "+972 52-529-0202"),
    ("שם איש קשר", "אלי כהן"),
    ("אימייל חשבון בדיקה", "להשלמה לאחר יצירת חשבון ייעודי"),
    ("סיסמת חשבון בדיקה", "להזין רק ב־App Store Connect"),
    ("Apple Team ID", "להשלמה לאחר ההרשמה"),
    ("Apple ID של האפליקציה", "יופק ב־App Store Connect"),
])

add_heading(document, "הנחיות כניסה לבודק")
for item in [
    "להזין את אימייל חשבון הבדיקה במסך הכניסה.",
    "לבחור באפשרות כניסה לחשבון בדיקה.",
    "להזין את הסיסמה שנמסרה ב־App Store Connect.",
    "לאחר הכניסה אפשר לבדוק תוכניות אימון, תזונה, התקדמות, צ׳ק אין, הודעות, תוכן ומחיקת חשבון.",
]:
    add_check(document, item)

add_heading(document, "מצב מוכנות")
add_field_table(document, [
    ("מוכן", "שם, מזהה חבילה, גרסה, אייקונים והרשאות iOS"),
    ("מוכן", "מדיניות פרטיות, תנאי שימוש, תמיכה ומחיקת חשבון"),
    ("מוכן", "טיוטת מטא דאטה ומיפוי App Privacy"),
    ("להשלמה", "חברות Apple, Team ID ורשומת אפליקציה"),
    ("להשלמה", "פרטי חשבון בדיקה ייעודי"),
    ("להשלמה", "צילומי מסך, דירוג גיל ומדינות הפצה"),
    ("להשלמה", "בדיקת המכשיר הסופית והעלאה ל־TestFlight"),
])

footer = section.footer.paragraphs[0]
footer.text = "START LIFE FIT  |  פרטי הגשה ומוכנות ל App Store  |  15 בספטמבר 2026"
footer.runs[0].font.size = Pt(8)
footer.runs[0].font.color.rgb = RGBColor(90, 95, 90)
rtl(footer, WD_ALIGN_PARAGRAPH.CENTER)

for paragraph in document.paragraphs:
    rtl(paragraph, paragraph.alignment or WD_ALIGN_PARAGRAPH.RIGHT)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
document.save(OUTPUT)
print(OUTPUT.resolve())
