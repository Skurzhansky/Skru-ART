export interface Room {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

export interface Door {
  x: number;
  y: number;
  width: number;
  orientation: "horizontal" | "vertical";
  room_id: number;
}

export interface Window {
  x: number;
  y: number;
  width: number;
  orientation: "horizontal" | "vertical";
  room_id: number;
}

export interface FloorPlan {
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
  windows: Window[];
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  parameters?: Record<string, unknown>;
  floor_plan?: FloorPlan;
  materials_estimate?: Record<string, unknown>;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
}

export interface CostBreakdownItem {
  category: string;
  rate_per_sqm: number;
  area: number;
  cost: number;
}

export interface CostEstimate {
  total_area_sqm: number;
  region_factor: number;
  total_cost: number;
  currency: string;
  breakdown: CostBreakdownItem[];
}
