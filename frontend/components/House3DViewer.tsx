"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box } from "@react-three/drei";
import { FloorPlan } from "@/lib/types";

interface House3DViewerProps {
  floorPlan: FloorPlan;
}

const roomColors: Record<string, string> = {
  living: "#93c5fd",
  kitchen: "#fde047",
  bedroom: "#d8b4fe",
  bathroom: "#67e8f9",
  office: "#86efac",
  hallway: "#e5e7eb",
  room: "#e5e7eb",
};

function Walls({ walls }: { walls: FloorPlan["walls"] }) {
  return (
    <>
      {walls.map((w, i) => {
        const dx = w.x2 - w.x1;
        const dy = w.y2 - w.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return null;
        const angle = Math.atan2(dy, dx);
        return (
          <Box
            key={i}
            args={[length, 2.8, w.thickness]}
            position={[w.x1 + dx / 2, 1.4, w.y1 + dy / 2]}
            rotation={[0, -angle, 0]}
          >
            <meshStandardMaterial color="#64748b" />
          </Box>
        );
      })}
    </>
  );
}

function Rooms({ rooms }: { rooms: FloorPlan["rooms"] }) {
  return (
    <>
      {rooms.map((room) => (
        <Box
          key={room.id}
          args={[room.width, 0.1, room.height]}
          position={[room.x + room.width / 2, 0.05, room.y + room.height / 2]}
        >
          <meshStandardMaterial color={roomColors[room.type] || roomColors.room} />
        </Box>
      ))}
    </>
  );
}

function Scene({ floorPlan }: { floorPlan: FloorPlan }) {
  const centerX = floorPlan.rooms.reduce((sum, r) => sum + r.x + r.width / 2, 0) / (floorPlan.rooms.length || 1);
  const centerZ = floorPlan.rooms.reduce((sum, r) => sum + r.y + r.height / 2, 0) / (floorPlan.rooms.length || 1);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <Rooms rooms={floorPlan.rooms} />
      <Walls walls={floorPlan.walls} />
      <OrbitControls target={[centerX, 0, centerZ]} />
    </>
  );
}

export default function House3DViewer({ floorPlan }: House3DViewerProps) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="font-semibold text-lg mb-3">3D-визуализация</h2>
      <div className="flex-1 bg-white rounded-xl shadow border overflow-hidden min-h-[400px]">
        <Canvas camera={{ position: [15, 15, 15], fov: 45 }} className="w-full h-full">
          <Suspense fallback={null}>
            <Scene floorPlan={floorPlan} />
          </Suspense>
        </Canvas>
      </div>
      <p className="text-xs text-slate-500 mt-2">Мышью: вращение — зажать ЛКМ, приближение — скролл.</p>
    </div>
  );
}
