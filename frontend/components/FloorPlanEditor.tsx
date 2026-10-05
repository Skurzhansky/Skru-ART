"use client";

import React, { useRef, useState, useMemo } from "react";
import { FloorPlan, Room } from "@/lib/types";

interface FloorPlanEditorProps {
  floorPlan: FloorPlan;
  onChange: (plan: FloorPlan) => void;
}

const SCALE = 60;
const PADDING = 40;

const roomColors: Record<string, string> = {
  living: "#dbeafe",
  kitchen: "#fef3c7",
  bedroom: "#e9d5ff",
  bathroom: "#cffafe",
  office: "#dcfce7",
  hallway: "#f3f4f6",
  room: "#f3f4f6",
};

export default function FloorPlanEditor({ floorPlan, onChange }: FloorPlanEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingRoom, setDraggingRoom] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);

  const bounds = useMemo(() => {
    const xs = floorPlan.rooms.map((r) => r.x + r.width);
    const ys = floorPlan.rooms.map((r) => r.y + r.height);
    return {
      width: Math.max(...xs, 10) * SCALE + PADDING * 2,
      height: Math.max(...ys, 10) * SCALE + PADDING * 2,
    };
  }, [floorPlan]);

  const toSvgX = (x: number) => PADDING + x * SCALE;
  const toSvgY = (y: number) => bounds.height - (PADDING + y * SCALE);

  const handleMouseDown = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    setSelectedRoom(room.id);
    setDraggingRoom(room.id);
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    setDragOffset({
      x: cursorPt.x - toSvgX(room.x),
      y: cursorPt.y - toSvgY(room.y),
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingRoom == null || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const newX = Math.round(((cursorPt.x - dragOffset.x - PADDING) / SCALE) * 2) / 2;
    const newY = Math.round(((bounds.height - cursorPt.y + dragOffset.y - PADDING) / SCALE) * 2) / 2;

    onChange({
      ...floorPlan,
      rooms: floorPlan.rooms.map((r) => (r.id === draggingRoom ? { ...r, x: newX, y: newY } : r)),
    });
  };

  const handleMouseUp = () => {
    setDraggingRoom(null);
  };

  const updateRoom = (id: number, field: keyof Room, value: any) => {
    onChange({
      ...floorPlan,
      rooms: floorPlan.rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  };

  const selected = floorPlan.rooms.find((r) => r.id === selectedRoom);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">2D-планировка</h2>
        <p className="text-sm text-slate-500">Перетаскивайте комнаты. Кликните для редактирования размеров.</p>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow overflow-auto border">
        <svg
          ref={svgRef}
          width={bounds.width}
          height={bounds.height}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair block"
        >
          <defs>
            <pattern id="grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
              <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#e2e8f0" strokeWidth={1} />
            </pattern>
          </defs>
          <rect width={bounds.width} height={bounds.height} fill="url(#grid)" />

          {floorPlan.walls.map((w, i) => (
            <line
              key={`wall-${i}`}
              x1={toSvgX(w.x1)}
              y1={toSvgY(w.y1)}
              x2={toSvgX(w.x2)}
              y2={toSvgY(w.y2)}
              stroke="#334155"
              strokeWidth={Math.max(2, w.thickness * SCALE)}
              strokeLinecap="square"
            />
          ))}

          {floorPlan.rooms.map((room) => (
            <g key={room.id} onMouseDown={(e) => handleMouseDown(e, room)}>
              <rect
                x={toSvgX(room.x)}
                y={toSvgY(room.y) - room.height * SCALE}
                width={room.width * SCALE}
                height={room.height * SCALE}
                fill={roomColors[room.type] || roomColors.room}
                stroke={selectedRoom === room.id ? "#2563eb" : "#64748b"}
                strokeWidth={selectedRoom === room.id ? 3 : 1}
                className="hover:stroke-blue-500"
                style={{ cursor: "move" }}
              />
              <text
                x={toSvgX(room.x) + (room.width * SCALE) / 2}
                y={toSvgY(room.y) - (room.height * SCALE) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-slate-700 pointer-events-none select-none"
              >
                {room.name}
              </text>
              <text
                x={toSvgX(room.x) + (room.width * SCALE) / 2}
                y={toSvgY(room.y) - (room.height * SCALE) / 2 + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-slate-500 pointer-events-none select-none"
              >
                {room.width}×{room.height} м
              </text>
            </g>
          ))}

          {floorPlan.doors.map((d, i) => (
            <rect
              key={`door-${i}`}
              x={toSvgX(d.x)}
              y={d.orientation === "horizontal" ? toSvgY(d.y) - 4 : toSvgY(d.y)}
              width={d.orientation === "horizontal" ? d.width * SCALE : 8}
              height={d.orientation === "horizontal" ? 8 : d.width * SCALE}
              fill="#f59e0b"
              rx={2}
            />
          ))}

          {floorPlan.windows.map((w, i) => (
            <rect
              key={`window-${i}`}
              x={toSvgX(w.x)}
              y={w.orientation === "horizontal" ? toSvgY(w.y) - 3 : toSvgY(w.y)}
              width={w.orientation === "horizontal" ? w.width * SCALE : 6}
              height={w.orientation === "horizontal" ? 6 : w.width * SCALE}
              fill="#38bdf8"
              rx={2}
            />
          ))}
        </svg>
      </div>

      {selected && (
        <div className="mt-3 bg-white p-4 rounded-xl shadow border grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500">Название</label>
            <input
              value={selected.name}
              onChange={(e) => updateRoom(selected.id, "name", e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Ширина (м)</label>
            <input
              type="number"
              step={0.1}
              value={selected.width}
              onChange={(e) => updateRoom(selected.id, "width", parseFloat(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Глубина (м)</label>
            <input
              type="number"
              step={0.1}
              value={selected.height}
              onChange={(e) => updateRoom(selected.id, "height", parseFloat(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Тип</label>
            <select
              value={selected.type}
              onChange={(e) => updateRoom(selected.id, "type", e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="living">Гостиная</option>
              <option value="kitchen">Кухня</option>
              <option value="bedroom">Спальня</option>
              <option value="bathroom">Ванная</option>
              <option value="office">Кабинет</option>
              <option value="hallway">Прихожая</option>
              <option value="room">Другое</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
