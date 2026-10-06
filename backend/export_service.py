import io
import json
import math
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from fpdf import FPDF

FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")
REGULAR_FONT = os.path.join(FONT_DIR, "DejaVuSans.ttf")
BOLD_FONT = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")


def _new_pdf() -> FPDF:
    pdf = FPDF()
    pdf.add_font("DejaVu", "", REGULAR_FONT, uni=True)
    pdf.add_font("DejaVu", "B", BOLD_FONT, uni=True)
    return pdf


def _draw_floor_plan(pdf: FPDF, floor_plan: Dict[str, Any], max_h_mm: float = 180) -> None:
    """Рисует планировку (комнаты, стены, двери, окна) на текущей странице PDF."""
    rooms = floor_plan.get("rooms", [])
    if not rooms:
        return
    walls = floor_plan.get("walls", [])
    doors = floor_plan.get("doors", [])
    windows = floor_plan.get("windows", [])

    max_w_mm = 180
    model_w = max((r.get("x", 0) + r.get("width", 0) for r in rooms), default=10)
    model_h = max((r.get("y", 0) + r.get("height", 0) for r in rooms), default=10)
    scale = min(15, max_w_mm / model_w, max_h_mm / model_h)

    origin_x = 15
    origin_y = pdf.get_y() + 4

    pdf.set_draw_color(80, 80, 80)
    pdf.set_line_width(0.6)
    for w in walls:
        x1 = origin_x + w.get("x1", 0) * scale
        y1 = origin_y + (model_h - w.get("y1", 0)) * scale
        x2 = origin_x + w.get("x2", 0) * scale
        y2 = origin_y + (model_h - w.get("y2", 0)) * scale
        pdf.line(x1, y1, x2, y2)

    colors = {
        "living": (219, 234, 254),
        "kitchen": (254, 243, 199),
        "bedroom": (233, 213, 255),
        "bathroom": (207, 250, 254),
        "office": (220, 252, 231),
        "hallway": (243, 244, 246),
        "room": (243, 244, 246),
    }
    for room in rooms:
        color = colors.get(room.get("type", "room"), colors["room"])
        pdf.set_fill_color(*color)
        pdf.set_draw_color(100, 116, 139)
        pdf.set_line_width(0.3)
        x = origin_x + room.get("x", 0) * scale
        y = origin_y + (model_h - (room.get("y", 0) + room.get("height", 0))) * scale
        w = room.get("width", 0) * scale
        h = room.get("height", 0) * scale
        pdf.rect(x, y, w, h, style="FD")

        pdf.set_font("DejaVu", "", 8)
        pdf.set_text_color(51, 65, 85)
        pdf.set_xy(x + 1, y + 1)
        pdf.cell(0, 3, room.get("name", ""), align="L")
        pdf.set_xy(x + 1, y + 4)
        pdf.cell(0, 3, f"{room.get('width', 0)}x{room.get('height', 0)} м", align="L")

    pdf.set_fill_color(245, 158, 11)
    for d in doors:
        x = origin_x + d.get("x", 0) * scale
        y = origin_y + (model_h - d.get("y", 0)) * scale
        w = d.get("width", 0.9) * scale
        if d.get("orientation") == "horizontal":
            pdf.rect(x, y - 1.5, w, 3, style="F")
        else:
            pdf.rect(x - 1.5, y - w, 3, w, style="F")

    pdf.set_fill_color(56, 189, 248)
    for win in windows:
        x = origin_x + win.get("x", 0) * scale
        y = origin_y + (model_h - win.get("y", 0)) * scale
        w = win.get("width", 1.2) * scale
        if win.get("orientation") == "horizontal":
            pdf.rect(x, y - 1, w, 2, style="F")
        else:
            pdf.rect(x - 1, y - w, 2, w, style="F")

    pdf.set_y(origin_y + model_h * scale + 6)


def generate_plan_pdf(
    project_title: str,
    project_description: Optional[str],
    floor_plan: Dict[str, Any],
    estimate: Optional[Dict[str, Any]] = None,
    parameters: Optional[Dict[str, Any]] = None,
) -> bytes:
    """Генерирует PDF с планировкой и сметой."""
    pdf = _new_pdf()
    pdf.add_page()

    pdf.set_font("DejaVu", "B", 16)
    pdf.cell(0, 10, "AI House Designer", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.set_font("DejaVu", "", 12)
    pdf.cell(0, 8, project_title, new_x="LMARGIN", new_y="NEXT", align="C")
    if project_description:
        pdf.set_font("DejaVu", "", 10)
        pdf.multi_cell(0, 5, project_description, align="C")
    pdf.ln(6)

    if parameters:
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(0, 6, "Параметры проекта", new_x="LMARGIN", new_y="NEXT", align="L")
        pdf.set_font("DejaVu", "", 9)
        for key, value in parameters.items():
            if value is None:
                continue
            pdf.cell(0, 5, f"{key}: {value}", new_x="LMARGIN", new_y="NEXT", align="L")
        pdf.ln(4)

    rooms = floor_plan.get("rooms", [])

    if rooms:
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(0, 6, "Планировка", new_x="LMARGIN", new_y="NEXT", align="L")
        _draw_floor_plan(pdf, floor_plan)

    if estimate:
        pdf.ln(4)
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(0, 6, "Смета строительства", new_x="LMARGIN", new_y="NEXT", align="L")
        pdf.set_font("DejaVu", "", 9)
        pdf.cell(0, 5, f"Общая площадь: {estimate.get('total_area_sqm', 0)} м²", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 5, f"Итого: {estimate.get('total_cost', 0):,.0f} {estimate.get('currency', 'RUB')}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        pdf.set_draw_color(200, 200, 200)
        pdf.set_line_width(0.2)
        pdf.set_font("DejaVu", "", 8)
        pdf.cell(100, 5, "Статья", border=1)
        pdf.cell(40, 5, "Площадь м²", border=1)
        pdf.cell(40, 5, "Сумма", border=1)
        pdf.ln(5)
        for item in estimate.get("breakdown", []):
            pdf.cell(100, 4, str(item.get("category", "")).replace("_", " ").capitalize(), border=1)
            pdf.cell(40, 4, str(item.get("area", "")), border=1)
            pdf.cell(40, 4, f"{item.get('cost', 0):,.0f}", border=1)
            pdf.ln(4)

    output = io.BytesIO()
    pdf.output(output)
    return output.getvalue()


def generate_plan_svg(floor_plan: Dict[str, Any], scale: int = 60) -> str:
    """Генерирует SVG-строку планировки."""
    rooms = floor_plan.get("rooms", [])
    walls = floor_plan.get("walls", [])
    doors = floor_plan.get("doors", [])
    windows = floor_plan.get("windows", [])

    max_x = max((r.get("x", 0) + r.get("width", 0) for r in rooms), default=10)
    max_y = max((r.get("y", 0) + r.get("height", 0) for r in rooms), default=10)
    width = max_x * scale + 80
    height = max_y * scale + 80
    pad = 40

    colors = {
        "living": "#dbeafe",
        "kitchen": "#fef3c7",
        "bedroom": "#e9d5ff",
        "bathroom": "#cffafe",
        "office": "#dcfce7",
        "hallway": "#f3f4f6",
        "room": "#f3f4f6",
    }

    def tx(x: float) -> float:
        return pad + x * scale

    def ty(y: float) -> float:
        return height - (pad + y * scale)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        f'<defs><pattern id="grid" width="{scale}" height="{scale}" patternUnits="userSpaceOnUse"><path d="M {scale} 0 L 0 0 0 {scale}" fill="none" stroke="#e2e8f0" stroke-width="1"/></pattern></defs>',
        f'<rect width="{width}" height="{height}" fill="url(#grid)"/>',
    ]

    for w in walls:
        parts.append(
            f'<line x1="{tx(w.get("x1", 0))}" y1="{ty(w.get("y1", 0))}" '
            f'x2="{tx(w.get("x2", 0))}" y2="{ty(w.get("y2", 0))}" '
            f'stroke="#334155" stroke-width="{max(2, w.get("thickness", 0.2) * scale)}" stroke-linecap="square"/>'
        )

    for r in rooms:
        x = tx(r.get("x", 0))
        y = ty(r.get("y", 0)) - r.get("height", 0) * scale
        w = r.get("width", 0) * scale
        h = r.get("height", 0) * scale
        color = colors.get(r.get("type", "room"), colors["room"])
        parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" stroke="#64748b" stroke-width="1"/>'
        )
        cx = x + w / 2
        cy = y + h / 2
        parts.append(
            f'<text x="{cx}" y="{cy}" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="sans-serif" font-size="12" fill="#334155">{r.get("name", "")}</text>'
        )
        parts.append(
            f'<text x="{cx}" y="{cy + 14}" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="sans-serif" font-size="10" fill="#64748b">{r.get("width", 0)}x{r.get("height", 0)} м</text>'
        )

    for d in doors:
        x = tx(d.get("x", 0))
        y = ty(d.get("y", 0))
        w = d.get("width", 0.9) * scale
        if d.get("orientation") == "horizontal":
            parts.append(f'<rect x="{x}" y="{y - 4}" width="{w}" height="8" fill="#f59e0b" rx="2"/>')
        else:
            parts.append(f'<rect x="{x - 4}" y="{y - w}" width="8" height="{w}" fill="#f59e0b" rx="2"/>')

    for win in windows:
        x = tx(win.get("x", 0))
        y = ty(win.get("y", 0))
        w = win.get("width", 1.2) * scale
        if win.get("orientation") == "horizontal":
            parts.append(f'<rect x="{x}" y="{y - 3}" width="{w}" height="6" fill="#38bdf8" rx="2"/>')
        else:
            parts.append(f'<rect x="{x - 3}" y="{y - w}" width="6" height="{w}" fill="#38bdf8" rx="2"/>')

    parts.append("</svg>")
    return "".join(parts)


def generate_plan_dxf(floor_plan: Dict[str, Any]) -> str:
    """Генерирует минимальный DXF-файл с планировкой."""
    rooms = floor_plan.get("rooms", [])
    walls = floor_plan.get("walls", [])

    lines = [
        "0", "SECTION",
        "2", "HEADER",
        "9", "$ACADVER",
        "1", "AC1021",
        "0", "ENDSEC",
        "0", "SECTION",
        "2", "ENTITIES",
    ]

    def add_line(x1, y1, x2, y2, layer="0"):
        lines.extend([
            "0", "LINE",
            "8", layer,
            "10", str(x1),
            "20", str(y1),
            "30", "0.0",
            "11", str(x2),
            "21", str(y2),
            "31", "0.0",
        ])

    def add_rect(x, y, w, h, layer="0"):
        add_line(x, y, x + w, y, layer)
        add_line(x + w, y, x + w, y + h, layer)
        add_line(x + w, y + h, x, y + h, layer)
        add_line(x, y + h, x, y, layer)

    for w in walls:
        add_line(w.get("x1", 0), w.get("y1", 0), w.get("x2", 0), w.get("y2", 0), "WALLS")

    for r in rooms:
        add_rect(r.get("x", 0), r.get("y", 0), r.get("width", 0), r.get("height", 0), "ROOMS")
        cx = r.get("x", 0) + r.get("width", 0) / 2
        cy = r.get("y", 0) + r.get("height", 0) / 2
        lines.extend([
            "0", "TEXT",
            "8", "ROOM_LABELS",
            "10", str(cx),
            "20", str(cy),
            "30", "0.0",
            "40", "0.35",
            "1", str(r.get("name", "")),
            "72", "1",
            "73", "1",
        ])

    lines.extend([
        "0", "ENDSEC",
        "0", "EOF",
    ])
    return "\n".join(lines)


def generate_project_report(
    project_title: str,
    project_description: Optional[str],
    floor_plan: Dict[str, Any],
    estimate: Optional[Dict[str, Any]] = None,
    parameters: Optional[Dict[str, Any]] = None,
) -> str:
    """Генерирует текстовый отчёт с техническими характеристиками."""
    rooms = floor_plan.get("rooms", [])
    total_area = sum(r.get("width", 0) * r.get("height", 0) for r in rooms)
    perimeter = 0.0
    for wall in floor_plan.get("walls", []):
        dx = wall.get("x2", 0) - wall.get("x1", 0)
        dy = wall.get("y2", 0) - wall.get("y1", 0)
        perimeter += math.sqrt(dx * dx + dy * dy)

    lines = [
        f"Проект: {project_title}",
        f"Описание: {project_description or '—'}",
        "",
        "Технические характеристики:",
        f"  Общая площадь: {total_area:.2f} м²",
        f"  Количество комнат: {len(rooms)}",
        f"  Периметр наружных стен: {perimeter:.2f} м",
        f"  Число дверей: {len(floor_plan.get('doors', []))}",
        f"  Число окон: {len(floor_plan.get('windows', []))}",
        "",
    ]

    if parameters:
        lines.append("Параметры проекта:")
        for key, value in parameters.items():
            if value is None:
                continue
            lines.append(f"  {key}: {value}")
        lines.append("")

    if estimate:
        lines.extend([
            "Смета строительства:",
            f"  Общая стоимость: {estimate.get('total_cost', 0):,.0f} {estimate.get('currency', 'RUB')}",
            f"  Региональный коэффициент: {estimate.get('region_factor', 1.0)}",
            "",
        ])

    lines.append("Состав комнат:")
    for r in rooms:
        lines.append(
            f"  {r.get('name', 'Комната')} ({r.get('type', 'room')}): {r.get('width', 0)}x{r.get('height', 0)} м"
        )

    return "\n".join(lines)


def generate_executive_docs(
    project_title: str,
    project_description: Optional[str],
    floor_plan: Dict[str, Any],
    estimate: Optional[Dict[str, Any]] = None,
    parameters: Optional[Dict[str, Any]] = None,
) -> bytes:
    """Формирует комплект исполнительной документации (PDF, несколько разделов).

    Разделы по составу ИД для частного дома:
      1. Титульный лист;
      2. Ведомость исполнительной документации;
      3. Общие данные и технические характеристики;
      4. Исполнительная схема планировки;
      5. Ведомость материалов и конструкций (по смете);
      6. Акт освидетельствования скрытых работ (бланк);
      7. Журнал производства работ (бланк).
    """
    pdf = _new_pdf()
    today = datetime.now().strftime("%d.%m.%Y")
    rooms = floor_plan.get("rooms", [])
    total_area = sum(r.get("width", 0) * r.get("height", 0) for r in rooms)
    perimeter = 0.0
    for wall in floor_plan.get("walls", []):
        dx = wall.get("x2", 0) - wall.get("x1", 0)
        dy = wall.get("y2", 0) - wall.get("y1", 0)
        perimeter += math.sqrt(dx * dx + dy * dy)

    def heading(text: str) -> None:
        pdf.set_font("DejaVu", "B", 13)
        pdf.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT", align="L")
        pdf.set_draw_color(150, 150, 150)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(4)

    def field_line(label: str, value: str = "") -> None:
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(60, 6, label, new_x="RIGHT")
        pdf.set_font("DejaVu", "", 10)
        pdf.cell(0, 6, value if value else "_______________________________", new_x="LMARGIN", new_y="NEXT")

    def signature_block() -> None:
        pdf.ln(6)
        pdf.set_font("DejaVu", "", 9)
        for role in ("Представитель застройщика", "Представитель подрядчика", "Представитель технадзора"):
            pdf.cell(70, 6, role, border=0)
            pdf.cell(60, 6, "_______________", border=0)
            pdf.cell(0, 6, "«___» __________ 20___ г.", new_x="LMARGIN", new_y="NEXT")

    # --- 1. Титульный лист ---
    pdf.add_page()
    pdf.set_font("DejaVu", "B", 20)
    pdf.ln(50)
    pdf.cell(0, 12, "ИСПОЛНИТЕЛЬНАЯ ДОКУМЕНТАЦИЯ", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("DejaVu", "", 12)
    pdf.cell(0, 8, "на объект строительства", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(10)
    pdf.set_font("DejaVu", "B", 14)
    pdf.multi_cell(0, 8, f"«{project_title}»", align="C", new_x="LMARGIN", new_y="NEXT")
    if project_description:
        pdf.set_font("DejaVu", "", 10)
        pdf.multi_cell(0, 6, project_description, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(30)
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(0, 6, f"Дата формирования: {today}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 6, "Сформировано: AI House Designer", new_x="LMARGIN", new_y="NEXT", align="C")

    # --- 2. Ведомость ИД ---
    pdf.add_page()
    heading("Ведомость исполнительной документации")
    pdf.set_font("DejaVu", "", 9)
    pdf.set_draw_color(120, 120, 120)
    pdf.set_line_width(0.3)
    pdf.cell(10, 7, "№", border=1)
    pdf.cell(140, 7, "Наименование документа", border=1)
    pdf.cell(40, 7, "Листы", border=1, new_x="LMARGIN", new_y="NEXT")
    toc = [
        "Титульный лист",
        "Ведомость исполнительной документации",
        "Общие данные и технические характеристики",
        "Исполнительная схема планировки",
        "Ведомость материалов и конструкций",
        "Акт освидетельствования скрытых работ",
        "Журнал производства работ",
    ]
    for i, name in enumerate(toc, 1):
        pdf.cell(10, 6, str(i), border=1)
        pdf.cell(140, 6, name, border=1)
        pdf.cell(40, 6, "1", border=1, new_x="LMARGIN", new_y="NEXT")

    # --- 3. Общие данные ---
    pdf.add_page()
    heading("Общие данные и технические характеристики")
    field_line("Наименование объекта:", project_title)
    field_line("Описание:", project_description or "")
    field_line("Дата формирования:", today)
    pdf.ln(4)
    pdf.set_font("DejaVu", "B", 10)
    pdf.cell(0, 6, "Технические характеристики:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("DejaVu", "", 9)
    for line in (
        f"Общая площадь застройки: {total_area:.2f} м²",
        f"Количество помещений: {len(rooms)}",
        f"Периметр наружных стен: {perimeter:.2f} м",
        f"Двери: {len(floor_plan.get('doors', []))} шт.",
        f"Окна: {len(floor_plan.get('windows', []))} шт.",
    ):
        pdf.cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")
    if parameters:
        pdf.ln(3)
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(0, 6, "Исходные параметры проекта:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("DejaVu", "", 9)
        for key, value in parameters.items():
            if value is None:
                continue
            pdf.cell(0, 5, f"{key}: {value}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font("DejaVu", "B", 10)
    pdf.cell(0, 6, "Состав помещений:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("DejaVu", "", 9)
    pdf.cell(80, 6, "Помещение", border=1)
    pdf.cell(40, 6, "Тип", border=1)
    pdf.cell(35, 6, "Размеры, м", border=1)
    pdf.cell(35, 6, "Площадь, м²", border=1, new_x="LMARGIN", new_y="NEXT")
    for r in rooms:
        pdf.cell(80, 5, str(r.get("name", "Комната")), border=1)
        pdf.cell(40, 5, str(r.get("type", "room")), border=1)
        pdf.cell(35, 5, f"{r.get('width', 0)} x {r.get('height', 0)}", border=1)
        pdf.cell(35, 5, f"{r.get('width', 0) * r.get('height', 0):.2f}", border=1, new_x="LMARGIN", new_y="NEXT")

    # --- 4. Исполнительная схема ---
    pdf.add_page()
    heading("Исполнительная схема планировки")
    pdf.set_font("DejaVu", "", 9)
    pdf.multi_cell(0, 5, "Схема выполнена по проектным размерам. Масштаб условный; контрольные размеры указаны в ведомости помещений.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    _draw_floor_plan(pdf, floor_plan, max_h_mm=210)

    # --- 5. Ведомость материалов ---
    pdf.add_page()
    heading("Ведомость материалов и конструкций")
    pdf.set_font("DejaVu", "", 9)
    if estimate and estimate.get("breakdown"):
        pdf.cell(90, 6, "Наименование (статья)", border=1)
        pdf.cell(35, 6, "Количество", border=1)
        pdf.cell(30, 6, "Ед. изм.", border=1)
        pdf.cell(35, 6, "Стоимость", border=1, new_x="LMARGIN", new_y="NEXT")
        for item in estimate["breakdown"]:
            pdf.cell(90, 5, str(item.get("category", "")).replace("_", " ").capitalize(), border=1)
            pdf.cell(35, 5, str(item.get("area", "")), border=1)
            pdf.cell(30, 5, "м²", border=1)
            pdf.cell(35, 5, f"{item.get('cost', 0):,.0f}", border=1, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("DejaVu", "B", 9)
        pdf.cell(90, 6, "Итого", border=1)
        pdf.cell(70, 6, "", border=1)
        pdf.cell(30, 6, f"{estimate.get('total_cost', 0):,.0f} {estimate.get('currency', 'RUB')}", border=1, new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.multi_cell(0, 5, "Смета не сформирована. Ведомость заполняется по фактически применённым материалам.", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)
        pdf.cell(90, 6, "Наименование материала", border=1)
        pdf.cell(35, 6, "Количество", border=1)
        pdf.cell(30, 6, "Ед. изм.", border=1)
        pdf.cell(35, 6, "Примечание", border=1, new_x="LMARGIN", new_y="NEXT")
        for _ in range(12):
            pdf.cell(90, 6, "", border=1)
            pdf.cell(35, 6, "", border=1)
            pdf.cell(30, 6, "", border=1)
            pdf.cell(35, 6, "", border=1, new_x="LMARGIN", new_y="NEXT")

    # --- 6. Акт скрытых работ ---
    pdf.add_page()
    heading("Акт освидетельствования скрытых работ")
    pdf.set_font("DejaVu", "", 9)
    pdf.multi_cell(0, 5, "Бланк для заполнения на объекте. Освидетельствованию подлежат работы, закрываемые последующими конструкциями (гидроизоляция, армирование, утепление, инженерные сети).", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    field_line("Объект:", project_title)
    field_line("Место выполнения работ:")
    field_line("Наименование скрытых работ:")
    field_line("Дата начала работ:")
    field_line("Дата окончания работ:")
    field_line("Проектная документация:")
    field_line("Материалы (паспорта, сертификаты):")
    pdf.ln(4)
    pdf.set_font("DejaVu", "", 9)
    pdf.multi_cell(0, 5, "Работы выполнены в соответствии с проектной документацией, СП и техническими регламентами. Предъявляются к освидетельствованию.", new_x="LMARGIN", new_y="NEXT")
    signature_block()

    # --- 7. Журнал работ ---
    pdf.add_page()
    heading("Журнал производства работ")
    pdf.set_font("DejaVu", "", 9)
    pdf.cell(25, 6, "Дата", border=1)
    pdf.cell(85, 6, "Наименование работ и место выполнения", border=1)
    pdf.cell(40, 6, "Исполнитель", border=1)
    pdf.cell(40, 6, "Отметка технадзора", border=1, new_x="LMARGIN", new_y="NEXT")
    for _ in range(28):
        pdf.cell(25, 6, "", border=1)
        pdf.cell(85, 6, "", border=1)
        pdf.cell(40, 6, "", border=1)
        pdf.cell(40, 6, "", border=1, new_x="LMARGIN", new_y="NEXT")

    output = io.BytesIO()
    pdf.output(output)
    return output.getvalue()
