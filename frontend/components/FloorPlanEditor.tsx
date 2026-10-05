"use client";

import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { FloorPlan, Room } from "@/lib/types";
import { Plus, Trash2, Grid3X3, Undo2, Redo2, ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface FloorPlanEditorProps {
  floorPlan: FloorPlan;
  onChange: (plan: FloorPlan) => void;
}

const SCALE = 60;
const PADDING = 40;
const SNAP = 0.5;
const MAX_HISTORY = 50;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

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

function plansEqual(a: FloorPlan, b: FloorPlan) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function FloorPlanEditor({ floorPlan, onChange }: FloorPlanEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<FloorPlan[]>([floorPlan]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draggingRoom, setDraggingRoom] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPlan, setDragStartPlan] = useState<FloorPlan | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [view, setView] = useState({ scale: 1, panX: 0, panY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  const currentPlan = history[historyIndex];

  useEffect(() => {
    if (!plansEqual(floorPlan, currentPlan)) {
      const next = history.slice(0, historyIndex + 1);
      const trimmed = next.length >= MAX_HISTORY ? next.slice(next.length - MAX_HISTORY + 1) : next;
      setHistory([...trimmed, floorPlan]);
      setHistoryIndex(trimmed.length);
    }
  }, [floorPlan]);

  useEffect(() => {
    // Fit view to content when component mounts
    fitView();
  }, []);

  const bounds = useMemo(() => {
    const xs = currentPlan.rooms.map((r) => r.x + r.width);
    const ys = currentPlan.rooms.map((r) => r.y + r.height);
    return {
      width: Math.max(...xs, 10) * SCALE + PADDING * 2,
      height: Math.max(...ys, 10) * SCALE + PADDING * 2,
    };
  }, [currentPlan]);

  const toSvgX = (x: number) => PADDING + x * SCALE;
  const toSvgY = (y: number) => bounds.height - (PADDING + y * SCALE);

  const commit = useCallback(
    (plan: FloorPlan) => {
      if (plansEqual(plan, currentPlan)) return;
      const next = history.slice(0, historyIndex + 1);
      const trimmed = next.length >= MAX_HISTORY ? next.slice(next.length - MAX_HISTORY + 1) : next;
      setHistory([...trimmed, plan]);
      setHistoryIndex(trimmed.length);
      onChange(plan);
    },
    [history, historyIndex, currentPlan, onChange]
  );

  const replaceCurrent = useCallback(
    (plan: FloorPlan) => {
      const newHistory = [...history];
      newHistory[historyIndex] = plan;
      setHistory(newHistory);
      onChange(plan);
    },
    [history, historyIndex, onChange]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      onChange(history[nextIndex]);
      setSelectedRoom(null);
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onChange(history[nextIndex]);
      setSelectedRoom(null);
    }
  }, [history, historyIndex, onChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const screenToContent = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - view.panX) / view.scale,
        y: (clientY - rect.top - view.panY) / view.scale,
      };
    },
    [view]
  );

  const fitView = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = rect.width / bounds.width;
    const scaleY = rect.height / bounds.height;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(scaleX, scaleY) * 0.9));
    const panX = (rect.width - bounds.width * scale) / 2;
    const panY = (rect.height - bounds.height * scale) / 2;
    setView({ scale, panX, panY });
  }, [bounds]);

  const zoomBy = useCallback(
    (factor: number, centerX?: number, centerY?: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = centerX ?? rect.width / 2;
      const cy = centerY ?? rect.height / 2;
      const contentX = (cx - view.panX) / view.scale;
      const contentY = (cy - view.panY) / view.scale;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale * factor));
      setView({
        scale: newScale,
        panX: cx - contentX * newScale,
        panY: cy - contentY * newScale,
      });
    },
    [view]
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (draggingRoom != null) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, panX: view.panX, panY: view.panY });
    setSelectedRoom(null);
  };

  const handleMouseDown = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    setSelectedRoom(room.id);
    setDraggingRoom(room.id);
    setDragStartPlan(currentPlan);
    const content = screenToContent(e.clientX, e.clientY);
    setDragOffset({
      x: content.x - toSvgX(room.x),
      y: content.y - toSvgY(room.y),
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingRoom != null) {
      const content = screenToContent(e.clientX, e.clientY);
      const newSvgX = content.x - dragOffset.x;
      const newSvgY = content.y - dragOffset.y;
      const newX = Math.max(0, snap((newSvgX - PADDING) / SCALE, SNAP));
      const newY = Math.max(0, snap((bounds.height - newSvgY - PADDING) / SCALE, SNAP));

      replaceCurrent({
        ...currentPlan,
        rooms: currentPlan.rooms.map((r) => (r.id === draggingRoom ? { ...r, x: newX, y: newY } : r)),
      });
      return;
    }

    if (isPanning) {
      setView({
        ...view,
        panX: panStart.panX + (e.clientX - panStart.x),
        panY: panStart.panY + (e.clientY - panStart.y),
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingRoom != null && dragStartPlan && !plansEqual(currentPlan, dragStartPlan)) {
      commit(currentPlan);
    }
    setDraggingRoom(null);
    setDragStartPlan(null);
    setIsPanning(false);
  };

  const updateRoom = (id: number, field: keyof Room, value: any) => {
    let cleanValue = value;
    if (field === "width" || field === "height") {
      cleanValue = Math.max(0.5, snap(parseFloat(value) || 1, SNAP));
    }
    const nextPlan = {
      ...currentPlan,
      rooms: currentPlan.rooms.map((r) => (r.id === id ? { ...r, [field]: cleanValue } : r)),
    };
    commit(nextPlan);
  };

  const addRoom = () => {
    const id = findNextId(currentPlan.rooms);
    const newRoom: Room = {
      id,
      name: `Комната ${id}`,
      type: "room",
      x: 0,
      y: 0,
      width: 3,
      height: 3,
    };
    const placed = tryPlaceRoom(currentPlan.rooms, newRoom);
    const nextPlan = { ...currentPlan, rooms: [...currentPlan.rooms, placed] };
    commit(nextPlan);
    setSelectedRoom(placed.id);
  };

  const deleteRoom = (id: number) => {
    const nextPlan = { ...currentPlan, rooms: currentPlan.rooms.filter((r) => r.id !== id) };
    commit(nextPlan);
    if (selectedRoom === id) setSelectedRoom(null);
  };

  const selected = currentPlan.rooms.find((r) => r.id === selectedRoom);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">2D-планировка</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-2">
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>Привязка {SNAP} м</span>
          </div>

          <div className="flex items-center bg-white border rounded-lg overflow-hidden">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Отменить (Ctrl+Z)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Повторить (Ctrl+Shift+Z / Ctrl+Y)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center bg-white border rounded-lg overflow-hidden">
            <button
              onClick={() => zoomBy(0.9)}
              title="Уменьшить"
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm hover:bg-slate-100 transition"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={() => zoomBy(1.1)}
              title="Увеличить"
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm hover:bg-slate-100 transition"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={fitView}
              title="По размеру окна"
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm hover:bg-slate-100 transition"
            >
              <Maximize className="h-4 w-4" />
            </button>
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

      <div ref={containerRef} className="flex-1 bg-white rounded-xl shadow overflow-hidden border relative">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseDown={handleSvgMouseDown}
          onWheel={handleWheel}
          className={`block ${draggingRoom != null ? "cursor-move" : isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <defs>
            <pattern id="grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
              <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#e2e8f0" strokeWidth={1} />
            </pattern>
          </defs>

          <g transform={`translate(${view.panX}, ${view.panY}) scale(${view.scale})`}>
            <rect x={-PADDING} y={-PADDING} width={bounds.width + PADDING * 2} height={bounds.height + PADDING * 2} fill="white" />
            <rect x={0} y={0} width={bounds.width} height={bounds.height} fill="url(#grid)" />

            {currentPlan.walls.map((w, i) => (
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

            {currentPlan.rooms.map((room) => (
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

            {currentPlan.doors.map((d, i) => (
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

            {currentPlan.windows.map((w, i) => (
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
          </g>
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

  const maxX = existingRooms.reduce((max, r) => Math.max(max, r.x + r.width), 0);
  return { ...newRoom, x: snap(maxX + 0.5, SNAP), y: 0 };
}

function rectanglesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
