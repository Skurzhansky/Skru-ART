import os
import json
import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY") or "missing-key")


def chat_with_ai(messages: List[Dict[str, str]], project_context: Optional[Dict[str, Any]] = None) -> str:
    system_prompt = (
        "Ты — опытный архитектор и консультант по проектированию частных домов. "
        "Твоя задача — помогать пользователю спроектировать дом, давая конкретные, "
        "практические рекомендации по планировке, материалам, стилю, инженерии и бюджету. "
        "Отвечай на русском языке, ясно и по делу."
    )

    if project_context:
        context_str = json.dumps(project_context, ensure_ascii=False, indent=2)
        system_prompt += f"\n\nКонтекст текущего проекта:\n{context_str}"

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant", "system"):
            formatted_messages.append({"role": role, "content": content})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=formatted_messages,
            temperature=0.7,
            max_tokens=1500,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return f"Ошибка при обращении к ИИ: {e}"


def generate_floor_plan_from_prompt(
    prompt: str,
    area: Optional[float] = None,
    floors: int = 1,
    budget: Optional[float] = None,
    style: Optional[str] = None,
    rooms: Optional[List[str]] = None,
) -> Dict[str, Any]:
    system_prompt = (
        "Ты — генератор планировок частных домов в JSON. "
        "На основе запроса пользователя сформируй планировку в формате JSON с ключами: "
        "rooms (список комнат с id, name, x, y, width, height, type), "
        "walls (список стен с x1, y1, x2, y2, thickness), "
        "doors (список дверей с x, y, width, orientation, room_id), "
        "windows (список окон с x, y, width, orientation, room_id). "
        "Координаты в метрах. Ориентация: horizontal или vertical. "
        "Отвечай ТОЛЬКО JSON-объектом, без markdown и пояснений."
    )

    user_prompt = f"Запрос: {prompt}. Этажей: {floors}."
    if area:
        user_prompt += f" Площадь: {area} м²."
    if budget:
        user_prompt += f" Бюджет: {budget} руб."
    if style:
        user_prompt += f" Стиль: {style}."
    if rooms:
        user_prompt += f" Нужны комнаты: {', '.join(rooms)}."

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        plan = json.loads(content)
        return _normalize_plan(plan)
    except Exception as e:
        logger.error(f"Error generating floor plan: {e}")
        return _default_plan()


def _normalize_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    rooms = plan.get("rooms", [])
    walls = plan.get("walls", [])
    doors = plan.get("doors", [])
    windows = plan.get("windows", [])

    # Убедимся, что все элементы имеют нужные поля
    for i, room in enumerate(rooms):
        room.setdefault("id", i + 1)
        room.setdefault("name", f"Room {i + 1}")
        room.setdefault("type", "living")
        room.setdefault("x", 0)
        room.setdefault("y", 0)
        room.setdefault("width", 3)
        room.setdefault("height", 3)

    return {
        "rooms": rooms,
        "walls": walls,
        "doors": doors,
        "windows": windows,
    }


def _default_plan() -> Dict[str, Any]:
    return {
        "rooms": [
            {"id": 1, "name": "Гостиная", "type": "living", "x": 0, "y": 0, "width": 5, "height": 5},
            {"id": 2, "name": "Кухня", "type": "kitchen", "x": 5, "y": 0, "width": 3.5, "height": 3.5},
            {"id": 3, "name": "Спальня", "type": "bedroom", "x": 0, "y": 5, "width": 4, "height": 4},
            {"id": 4, "name": "Ванная", "type": "bathroom", "x": 4, "y": 5, "width": 2, "height": 2},
        ],
        "walls": [
            {"x1": 0, "y1": 0, "x2": 8.5, "y2": 0, "thickness": 0.2},
            {"x1": 8.5, "y1": 0, "x2": 8.5, "y2": 9, "thickness": 0.2},
            {"x1": 8.5, "y1": 9, "x2": 0, "y2": 9, "thickness": 0.2},
            {"x1": 0, "y1": 9, "x2": 0, "y2": 0, "thickness": 0.2},
        ],
        "doors": [
            {"x": 2, "y": 0, "width": 0.9, "orientation": "horizontal", "room_id": 1},
        ],
        "windows": [
            {"x": 5, "y": 0, "width": 1.2, "orientation": "horizontal", "room_id": 1},
        ],
    }


def generate_floor_plan_variants(
    prompt: str,
    area: Optional[float] = None,
    floors: int = 1,
    budget: Optional[float] = None,
    style: Optional[str] = None,
    rooms: Optional[List[str]] = None,
    count: int = 3,
) -> List[Dict[str, Any]]:
    """Генерирует несколько вариантов планировок через OpenAI."""
    system_prompt = (
        "Ты — генератор планировок частных домов в JSON. "
        f"На основе запроса пользователя сформируй ровно {count} различных варианта планировки. "
        "Ответ — JSON-объект с ключом \"variants\", содержащим массив из планировок. "
        "Каждая планировка должна содержать keys: rooms (id, name, x, y, width, height, type), "
        "walls (x1, y1, x2, y2, thickness), doors (x, y, width, orientation, room_id), "
        "windows (x, y, width, orientation, room_id). Координаты в метрах. "
        "Отвечай ТОЛЬКО JSON-объектом, без markdown и пояснений."
    )

    user_prompt = f"Запрос: {prompt}. Этажей: {floors}."
    if area:
        user_prompt += f" Площадь: {area} м²."
    if budget:
        user_prompt += f" Бюджет: {budget} руб."
    if style:
        user_prompt += f" Стиль: {style}."
    if rooms:
        user_prompt += f" Нужны комнаты: {', '.join(rooms)}."
    user_prompt += f" Создай {count} разных варианта расположения комнат."

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        variants = data.get("variants", [])
        if not isinstance(variants, list) or len(variants) == 0:
            raise ValueError("No variants returned")
        return [_normalize_plan(plan) for plan in variants]
    except Exception as e:
        logger.error(f"Error generating variants: {e}")
        # Fallback: rotate the default plan to create visually different variants
        base = _default_plan()
        return [base, _rotate_plan(base), _mirror_plan(base)]


def _rotate_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    """Создаёт вариант планировки, отражённый по диагонали."""
    import copy
    rotated = copy.deepcopy(plan)
    max_x = max((r.get("x", 0) + r.get("width", 0) for r in rotated.get("rooms", [])), default=0)
    for room in rotated.get("rooms", []):
        x, y = room.get("x", 0), room.get("y", 0)
        width, height = room.get("width", 0), room.get("height", 0)
        room["x"] = y
        room["y"] = x
        room["width"] = height
        room["height"] = width
    for wall in rotated.get("walls", []):
        x1, y1, x2, y2 = wall["x1"], wall["y1"], wall["x2"], wall["y2"]
        wall["x1"], wall["y1"] = y1, x1
        wall["x2"], wall["y2"] = y2, x2
    return rotated


def _mirror_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    """Создаёт зеркальный вариант планировки относительно вертикальной оси."""
    import copy
    mirrored = copy.deepcopy(plan)
    max_x = max((r.get("x", 0) + r.get("width", 0) for r in mirrored.get("rooms", [])), default=0)
    for room in mirrored.get("rooms", []):
        room["x"] = max_x - room.get("x", 0) - room.get("width", 0)
    for wall in mirrored.get("walls", []):
        wall["x1"] = max_x - wall["x1"]
        wall["x2"] = max_x - wall["x2"]
    return mirrored


def recommend_materials(
    floor_plan: Dict[str, Any],
    parameters: Optional[Dict[str, Any]] = None,
    style: Optional[str] = None,
    budget: Optional[float] = None,
    region_factor: float = 1.0,
) -> Dict[str, Any]:
    """Запрашивает у ИИ рекомендации по материалам на основе планировки и параметров."""
    from floor_plan_generator import compute_plan_area

    area = compute_plan_area(floor_plan)

    system_prompt = (
        "Ты — консультант по строительным материалам. На основе планировки дома, "
        "стиля и бюджета предложи конкретные материалы для основных категорий: "
        "foundation (фундамент), walls (стены), roof (кровля), windows (окна), "
        "doors (двери), flooring (полы), facade (фасад), insulation (утепление). "
        "Ответ — JSON-объект с ключом \"recommendations\", содержащим массив объектов: "
        "{\"category\": string, \"material\": string, \"description\": string, \"estimated_cost_per_unit\": number, "
        "\"unit\": string, \"quantity\": number, \"total_cost\": number, \"notes\": string}. "
        "Также добавь ключи \"summary\" (краткое текстовое резюме) и \"total_estimate\" (общая сумма). "
        "Стоимость в рублях. Отвечай ТОЛЬКО JSON-объектом, без markdown."
    )

    user_prompt = f"Площадь дома: {area:.1f} м²."
    if style:
        user_prompt += f" Стиль: {style}."
    if budget:
        user_prompt += f" Бюджет: {budget:.0f} руб."
    if parameters:
        user_prompt += f" Параметры проекта: {json.dumps(parameters, ensure_ascii=False)}."
    user_prompt += f" Региональный коэффициент: {region_factor}."

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=2500,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return {
            "area": area,
            "style": style,
            "budget": budget,
            "region_factor": region_factor,
            "summary": data.get("summary", ""),
            "total_estimate": data.get("total_estimate", 0),
            "recommendations": data.get("recommendations", []),
            "source": "ai",
        }
    except Exception as e:
        logger.error(f"Error recommending materials: {e}")
        return _default_materials(area, style, budget, region_factor)


def _default_materials(
    area: float,
    style: Optional[str] = None,
    budget: Optional[float] = None,
    region_factor: float = 1.0,
) -> Dict[str, Any]:
    base_rate = 35000 * region_factor
    recommendations = [
        {
            "category": "foundation",
            "material": "Ленточный железобетонный фундамент",
            "description": "Классический фундамент для частного дома.",
            "estimated_cost_per_unit": base_rate,
            "unit": "м²",
            "quantity": area,
            "total_cost": area * base_rate,
            "notes": "Подходит для большинства грунтов.",
        },
        {
            "category": "walls",
            "material": "Керамический кирпич + утеплитель",
            "description": "Прочные стены с хорошей теплоизоляцией.",
            "estimated_cost_per_unit": 18000 * region_factor,
            "unit": "м²",
            "quantity": area * 1.2,
            "total_cost": area * 1.2 * 18000 * region_factor,
            "notes": "Долговечный вариант.",
        },
        {
            "category": "roof",
            "material": "Металлочерепица",
            "description": "Лёгкая и долговечная кровля.",
            "estimated_cost_per_unit": 12000 * region_factor,
            "unit": "м²",
            "quantity": area * 1.1,
            "total_cost": area * 1.1 * 12000 * region_factor,
            "notes": "Уклон кровли учитывается отдельно.",
        },
        {
            "category": "windows",
            "material": "ПВХ двухкамерные окна",
            "description": "Стандартные энергосберегающие окна.",
            "estimated_cost_per_unit": 25000 * region_factor,
            "unit": "шт",
            "quantity": max(4, int(area / 20)),
            "total_cost": max(4, int(area / 20)) * 25000 * region_factor,
            "notes": "Количество зависит от количества комнат.",
        },
        {
            "category": "flooring",
            "material": "Ламинат / керамогранит",
            "description": "Ламинат в жилых комнатах, плитка в мокрых зонах.",
            "estimated_cost_per_unit": 5000 * region_factor,
            "unit": "м²",
            "quantity": area,
            "total_cost": area * 5000 * region_factor,
            "notes": "Цена усреднённая.",
        },
    ]
    total = sum(r["total_cost"] for r in recommendations)
    return {
        "area": area,
        "style": style,
        "budget": budget,
        "region_factor": region_factor,
        "summary": f"Рекомендации по материалам для дома площадью {area:.1f} м² (заглушка, требуется OpenAI API ключ).",
        "total_estimate": total,
        "recommendations": recommendations,
        "source": "fallback",
    }


def assess_energy_efficiency(
    floor_plan: Dict[str, Any],
    parameters: Optional[Dict[str, Any]] = None,
    style: Optional[str] = None,
    climate_zone: Optional[str] = None,
    heating_type: Optional[str] = None,
    region_factor: float = 1.0,
) -> Dict[str, Any]:
    """Оценивает энергоэффективность дома через ИИ или по эмпирической формуле."""
    from floor_plan_generator import compute_plan_area

    area = compute_plan_area(floor_plan)
    perimeter = 0.0
    for wall in floor_plan.get("walls", []):
        dx = wall.get("x2", 0) - wall.get("x1", 0)
        dy = wall.get("y2", 0) - wall.get("y1", 0)
        perimeter += (dx ** 2 + dy ** 2) ** 0.5

    system_prompt = (
        "Ты — эксперт по энергоэффективности частных домов. На основе планировки и параметров "
        "дай оценку энергоэффективности. Ответ — JSON-объект с ключами: "
        "efficiency_class (A+, A, B, C, D), heat_loss_w_per_m2 (оценка теплопотерь Вт/м²), "
        "annual_heating_cost (руб/год), annual_cooling_cost (руб/год), "
        "recommendations (массив строк с рекомендациями по улучшению), "
        "summary (краткое резюме). Учитывай площадь, периметр, климатическую зону и тип отопления. "
        "Отвечай ТОЛЬКО JSON-объектом, без markdown."
    )

    user_prompt = f"Площадь дома: {area:.1f} м². Периметр стен: {perimeter:.1f} м."
    if style:
        user_prompt += f" Стиль: {style}."
    if climate_zone:
        user_prompt += f" Климатическая зона: {climate_zone}."
    if heating_type:
        user_prompt += f" Тип отопления: {heating_type}."
    if parameters:
        user_prompt += f" Параметры: {json.dumps(parameters, ensure_ascii=False)}."
    user_prompt += f" Региональный коэффициент: {region_factor}."

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return {
            "area": area,
            "perimeter": round(perimeter, 2),
            "style": style,
            "climate_zone": climate_zone,
            "heating_type": heating_type,
            "region_factor": region_factor,
            "efficiency_class": data.get("efficiency_class", "C"),
            "heat_loss_w_per_m2": data.get("heat_loss_w_per_m2", 80),
            "annual_heating_cost": data.get("annual_heating_cost", 0),
            "annual_cooling_cost": data.get("annual_cooling_cost", 0),
            "recommendations": data.get("recommendations", []),
            "summary": data.get("summary", ""),
            "source": "ai",
        }
    except Exception as e:
        logger.error(f"Error assessing energy efficiency: {e}")
        return _default_energy_assessment(area, perimeter, style, climate_zone, heating_type, region_factor)


def _default_energy_assessment(
    area: float,
    perimeter: float,
    style: Optional[str] = None,
    climate_zone: Optional[str] = None,
    heating_type: Optional[str] = None,
    region_factor: float = 1.0,
) -> Dict[str, Any]:
    # Эмпирическая оценка теплопотерь: упрощённо считаем по площади и периметру
    base_loss = max(40.0, min(120.0, 40.0 + area * 0.3 + perimeter * 0.2))
    efficiency_class = "B" if base_loss < 60 else "C" if base_loss < 90 else "D"
    heating_cost = round(area * 1800 * region_factor * (0.7 if efficiency_class == "B" else 1.0), 0)
    cooling_cost = round(area * 500 * region_factor, 0)
    recommendations = [
        "Утеплить стены минватой или PIR-плитами 150–200 мм.",
        "Установить двухкамерные ПВХ-окна с энергосберегающим стеклопакетом.",
        "Добавить утепление пола по грунту и потолка/кровли.",
        "Рассмотреть рекуператор для вентиляции.",
        "Выбрать современный котёл с высоким КПД или тепловой насос.",
    ]
    return {
        "area": area,
        "perimeter": round(perimeter, 2),
        "style": style,
        "climate_zone": climate_zone,
        "heating_type": heating_type,
        "region_factor": region_factor,
        "efficiency_class": efficiency_class,
        "heat_loss_w_per_m2": round(base_loss, 1),
        "annual_heating_cost": heating_cost,
        "annual_cooling_cost": cooling_cost,
        "recommendations": recommendations,
        "summary": f"Энергоэффективность дома оценена по эмпирической формуле (заглушка, требуется OpenAI API ключ).",
        "source": "fallback",
    }
