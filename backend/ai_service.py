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
