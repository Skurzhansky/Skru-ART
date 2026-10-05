"use client";

import React, { useRef, useState, useMemo } from "react";
import { FloorPlan, Room } from "@/lib/types";
import { Plus, Trash2, Grid3X3 } from "lucide-react";

interface FloorPlanEditorProps {
  floorPlan: FloorPlan;
  onChange: (plan: FloorPlan) => void;
}

const SCALE = 60;
const PADDING = 40;
const SNAP = 0.5;

const roomColors: Record<string, string> = {
  living: "#dbeafe",
  kitchen: "#fef3c7",
  bedroom: "#e9d5ff",
  bathroom: "#cffafe",
  office: "#dcfce7",
  hallway: "#f3f4f6",
  room: "#f3f4f6",
};

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

function findNextId(rooms: Room[]) {
  return rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) + 1 : 1;
}

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

  const handleCanvasClick = () => {
    setSelectedRoom(null);
  };

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

    const rawX = (cursorPt.x - dragOffset.x - PADDING) / SCALE;
    const rawY = (bounds.height - cursorPt.y + dragOffset.y - PADDING) / SCALE;

    const newX = Math.max(0, snap(rawX, SNAP));
    const newY = Math.max(0, snap(rawY, SNAP));

    onChange({
      ...floorPlan,
      rooms: floorPlan.rooms.map((r) => (r.id === draggingRoom ? { ...r, x: newX, y: newY } : r)),
    });
  };

  const handleMouseUp = () => {
    setDraggingRoom(null);
  };

  const updateRoom = (id: number, field: keyof Room, value: any) => {
    let cleanValue = value;
    if (field === "width" || field === "height") {
      cleanValue = Math.max(0.5, snap(parseFloat(value) || 1, SNAP));
    }
    onChange({
      ...floorPlan,
      rooms: floorPlan.rooms.map((r) => (r.id === id ? { ...r, [field]: cleanValue } : r)),
    });
  };

  const addRoom = () => {
    const id = findNextId(floorPlan.rooms);
    const newRoom: Room = {
      id,
      name: `Комната ${id}`,
      type: "room",
      x: 0,
      y: 0,
      width: 3,
      height: 3,
    };

    // Try to place the new room next to existing ones without overlap
    const placed = tryPlaceRoom(floorPlan.rooms, newRoom);
    onChange({
      ...floorPlan,
      rooms: [...floorPlan.rooms, placed],
    });
    setSelectedRoom(placed.id);
  };

  const deleteRoom = (id: number) => {
    onChange({
      ...floorPlan,
      rooms: floorPlan.rooms.filter((r) => r.id !== id),
    });
    if (selectedRoom === id) setSelectedRoom(null);
  };

  const selected = floorPlan.rooms.find((r) => r.id === selectedRoom);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">2D-планировка</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-2">
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>Привязка {SNAP} м</span>
          </div>
          {selected && (
            <button
              onClick={() => deleteRoom(selected.id)}
              className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm border border-red-200 transition"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </button>
          )}
          <button
            onClick={addRoom}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition"
          >
            <Plus className="h-4 w-4" />
            Добавить комнату
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow overflow-auto border">
        <svg
          ref={svgRef}
          width={bounds.width}
          height={bounds.height}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
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
                className="hover:stroke-blue-500 transition-colors"
                style={{ cursor: "move" }}
              />
              <text
                x={toSvgX(room.x) + (room.width * SCALE) / 2}
                y={toSvgY(room.y) - (room.height * SCALE) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-slate-700 pointer-events-none select-none font-medium"
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
              step={SNAP}
              min={0.5}
              value={selected.width}
              onChange={(e) => updateRoom(selected.id, "width", e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Глубина (м)</label>
            <input
              type="number"
              step={SNAP}
              min={0.5}
              value={selected.height}
              onChange={(e) => updateRoom(selected.id, "height", e.target.value)}
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

function tryPlaceRoom(existingRooms: Room[], newRoom: Room): Room {
  const candidates: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];

  existingRooms.forEach((room) => {
    candidates.push({ x: room.x + room.width + 0.2, y: room.y });
    candidates.push({ x: room.x, y: room.y + room.height + 0.2 });
  });

  for (const pos of candidates) {
    const candidate = { ...newRoom, x: snap(pos.x, SNAP), y: snap(pos.y, SNAP) };
    if (!existingRooms.some((r) => rectanglesOverlap(r, candidate))) {
      return candidate;
    }
  }

  // Fallback: place far to the right
  const maxX = existingRooms.reduce((max, r) => Math.max(max, r.x + r.width), 0);
  return { ...newRoom, x: snap(maxX + 0.5, SNAP), y: 0 };
}

function rectanglesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
