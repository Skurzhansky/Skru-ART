"use client";

import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Cone, Cylinder } from "@react-three/drei";
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
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#94a3b8" />
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
          args={[room.width, 0.15, room.height]}
          position={[room.x + room.width / 2, 0.075, room.y + room.height / 2]}
          receiveShadow
        >
          <meshStandardMaterial color={roomColors[room.type] || roomColors.room} />
        </Box>
      ))}
    </>
  );
}

function Roof({ floorPlan }: { floorPlan: FloorPlan }) {
  const { minX, maxX, minY, maxY } = useMemo(() => {
    const xs = floorPlan.rooms.map((r) => r.x);
    const ys = floorPlan.rooms.map((r) => r.y);
    const ws = floorPlan.rooms.map((r) => r.x + r.width);
    const hs = floorPlan.rooms.map((r) => r.y + r.height);
    return {
      minX: Math.min(...xs, 0),
      maxX: Math.max(...ws, 1),
      minY: Math.min(...ys, 0),
      maxY: Math.max(...hs, 1),
    };
  }, [floorPlan]);

  const width = maxX - minX;
  const depth = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minY + maxY) / 2;
  const roofHeight = Math.min(width, depth) * 0.35;
  const roofWidth = Math.sqrt(width * width + depth * depth);

  return (
    <group position={[centerX, 2.8, centerZ]}>
      {/* Двускатная крыша */}
      <Box
        args={[roofWidth, 0.1, roofHeight * 2]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow
      >
        <meshStandardMaterial color="#7f1d1d" />
      </Box>
    </group>
  );
}

function Ground({ floorPlan }: { floorPlan: FloorPlan }) {
  const { minX, maxX, minY, maxY } = useMemo(() => {
    const xs = floorPlan.rooms.map((r) => r.x);
    const ys = floorPlan.rooms.map((r) => r.y);
    const ws = floorPlan.rooms.map((r) => r.x + r.width);
    const hs = floorPlan.rooms.map((r) => r.y + r.height);
    return {
      minX: Math.min(...xs, -2) - 2,
      maxX: Math.max(...ws, 2) + 2,
      minY: Math.min(...ys, -2) - 2,
      maxY: Math.max(...hs, 2) + 2,
    };
  }, [floorPlan]);

  const width = maxX - minX;
  const depth = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minY + maxY) / 2;

  return (
    <Box
      args={[width, 0.1, depth]}
      position={[centerX, -0.05, centerZ]}
      receiveShadow
    >
      <meshStandardMaterial color="#86efac" />
    </Box>
  );
}

function Scene({ floorPlan }: { floorPlan: FloorPlan }) {
  const centerX = floorPlan.rooms.reduce((sum, r) => sum + r.x + r.width / 2, 0) / (floorPlan.rooms.length || 1);
  const centerZ = floorPlan.rooms.reduce((sum, r) => sum + r.y + r.height / 2, 0) / (floorPlan.rooms.length || 1);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <Ground floorPlan={floorPlan} />
      <Rooms rooms={floorPlan.rooms} />
      <Walls walls={floorPlan.walls} />
      <Roof floorPlan={floorPlan} />
      <OrbitControls target={[centerX, 0, centerZ]} />
    </>
  );
}

export default function House3DViewer({ floorPlan }: House3DViewerProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-lg">3D-визуализация</h2>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Beta</span>
      </div>
      <div className="flex-1 bg-gradient-to-b from-sky-100 to-sky-50 rounded-xl shadow border overflow-hidden min-h-[400px]">
        <Canvas
          camera={{ position: [15, 12, 15], fov: 45 }}
          shadows
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            <Scene floorPlan={floorPlan} />
          </Suspense>
        </Canvas>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-500">Мышью: вращение — зажать ЛКМ, приближение — скролл.</p>
        <div className="flex gap-4 text-xs text-slate-500">
          <span>🏠 Автоматическая крыша</span>
          <span>☀️ Тени</span>
        </div>
      </div>
    </div>
  );
}
