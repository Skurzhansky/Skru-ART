import math
from typing import List, Dict, Any, Optional


def generate_rectangular_plan(
    width: float = 10,
    depth: float = 10,
    rooms: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Генерирует базовую прямоугольную планировку по заданным размерам."""
    rooms = rooms or ["Гостиная", "Кухня", "Спальня", "Ванная"]
    plan_rooms: List[Dict[str, Any]] = []

    cols = math.ceil(math.sqrt(len(rooms)))
    cell_w = width / cols
    cell_h = depth / math.ceil(len(rooms) / cols)

    room_types = {
        "гостиная": "living",
        "кухня": "kitchen",
        "спальня": "bedroom",
        "ванная": "bathroom",
        "туалет": "bathroom",
        "кабинет": "office",
        "прихожая": "hallway",
    }

    for i, name in enumerate(rooms):
        col = i % cols
        row = i // cols
        room_type = room_types.get(name.lower(), "room")
        plan_rooms.append({
            "id": i + 1,
            "name": name,
            "type": room_type,
            "x": round(col * cell_w, 2),
            "y": round(row * cell_h, 2),
            "width": round(cell_w, 2),
            "height": round(cell_h, 2),
        })

    walls = [
        {"x1": 0, "y1": 0, "x2": width, "y2": 0, "thickness": 0.2},
        {"x1": width, "y1": 0, "x2": width, "y2": depth, "thickness": 0.2},
        {"x1": width, "y1": depth, "x2": 0, "y2": depth, "thickness": 0.2},
        {"x1": 0, "y1": depth, "x2": 0, "y2": 0, "thickness": 0.2},
    ]

    for i in range(1, cols):
        x = i * cell_w
        walls.append({"x1": x, "y1": 0, "x2": x, "y2": depth, "thickness": 0.1})

    for i in range(1, math.ceil(len(rooms) / cols)):
        y = i * cell_h
        walls.append({"x1": 0, "y1": y, "x2": width, "y2": y, "thickness": 0.1})

    doors = [{"x": width / 2, "y": 0, "width": 0.9, "orientation": "horizontal", "room_id": 1}]
    windows = [{"x": width * 0.75, "y": 0, "width": 1.2, "orientation": "horizontal", "room_id": 1}]

    return {
        "rooms": plan_rooms,
        "walls": walls,
        "doors": doors,
        "windows": windows,
    }


def compute_plan_area(floor_plan: Dict[str, Any]) -> float:
    """Считает общую площадь комнат по планировке."""
    return sum(room.get("width", 0) * room.get("height", 0) for room in floor_plan.get("rooms", []))
