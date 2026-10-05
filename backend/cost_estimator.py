from typing import Dict, Any, List


COST_PER_SQM = {
    "foundation": 12000,
    "walls": 18000,
    "roof": 10000,
    "windows": 12000,
    "doors": 8000,
    "flooring": 3500,
    "utilities": 5000,
    "finishing": 7000,
}


def estimate_costs(floor_plan: Dict[str, Any], region_factor: float = 1.0) -> Dict[str, Any]:
    """Примерный расчет сметы на основе площади дома."""
    rooms = floor_plan.get("rooms", [])
    total_area = sum(r.get("width", 0) * r.get("height", 0) for r in rooms)

    breakdown: List[Dict[str, Any]] = []
    total = 0.0
    for category, rate in COST_PER_SQM.items():
        cost = total_area * rate * region_factor
        breakdown.append({
            "category": category,
            "rate_per_sqm": rate,
            "area": round(total_area, 2),
            "cost": round(cost, 2),
        })
        total += cost

    # Дополнительно за комнаты (санузлы и кухня дороже)
    for room in rooms:
        area = room.get("width", 0) * room.get("height", 0)
        room_type = room.get("type", "room")
        if room_type == "bathroom":
            extra = area * 15000 * region_factor
            breakdown.append({
                "category": f"bathroom_extra_{room.get('name', '')}",
                "rate_per_sqm": 15000,
                "area": round(area, 2),
                "cost": round(extra, 2),
            })
            total += extra
        elif room_type == "kitchen":
            extra = area * 8000 * region_factor
            breakdown.append({
                "category": f"kitchen_extra_{room.get('name', '')}",
                "rate_per_sqm": 8000,
                "area": round(area, 2),
                "cost": round(extra, 2),
            })
            total += extra

    return {
        "total_area_sqm": round(total_area, 2),
        "region_factor": region_factor,
        "total_cost": round(total, 2),
        "currency": "RUB",
        "breakdown": breakdown,
    }
