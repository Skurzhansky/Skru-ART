import axios from "axios";
import type { FloorPlan } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export async function login(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);
  const response = await api.post("/auth/login", formData.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
}

export async function register(email: string, password: string, fullName?: string) {
  const response = await api.post("/auth/register", { email, password, full_name: fullName });
  return response.data;
}

export async function getMe() {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function listProjects() {
  const response = await api.get("/projects");
  return response.data;
}

export async function getProject(id: number) {
  const response = await api.get(`/projects/${id}`);
  return response.data;
}

export async function createProject(project: { title: string; description?: string; parameters?: Record<string, unknown> }) {
  const response = await api.post("/projects", project);
  return response.data;
}

export async function updateProject(id: number, updates: Record<string, unknown>) {
  const response = await api.patch(`/projects/${id}`, updates);
  return response.data;
}

export async function deleteProject(id: number) {
  await api.delete(`/projects/${id}`);
}

export async function sendChat(messages: { role: string; content: string }[], context?: Record<string, unknown>) {
  const response = await api.post("/ai/chat", { messages, project_context: context });
  return response.data;
}

export async function generatePlan(payload: {
  prompt: string;
  area?: number;
  floors?: number;
  budget?: number;
  style?: string;
  rooms?: string[];
}) {
  const response = await api.post("/ai/generate-plan", payload);
  return response.data;
}

export async function generatePlanVariants(payload: {
  prompt: string;
  area?: number;
  floors?: number;
  budget?: number;
  style?: string;
  rooms?: string[];
}) {
  const response = await api.post("/ai/generate-plan-variants", payload);
  return response.data as { variants: FloorPlan[] };
}

export async function getMaterialRecommendations(payload: {
  floorPlan: FloorPlan;
  parameters?: Record<string, unknown>;
  style?: string;
  budget?: number;
  regionFactor?: number;
}) {
  const response = await api.post("/ai/materials", {
    floor_plan: payload.floorPlan,
    parameters: payload.parameters,
    style: payload.style,
    budget: payload.budget,
    region_factor: payload.regionFactor ?? 1.0,
  });
  return response.data;
}

export async function getEnergyAssessment(payload: {
  floorPlan: FloorPlan;
  parameters?: Record<string, unknown>;
  style?: string;
  climateZone?: string;
  heatingType?: string;
  regionFactor?: number;
}) {
  const response = await api.post("/ai/energy", {
    floor_plan: payload.floorPlan,
    parameters: payload.parameters,
    style: payload.style,
    climate_zone: payload.climateZone,
    heating_type: payload.heatingType,
    region_factor: payload.regionFactor ?? 1.0,
  });
  return response.data;
}

export async function estimateCost(floorPlan: FloorPlan, regionFactor = 1.0) {
  const response = await api.post("/ai/estimate", { floor_plan: floorPlan, region_factor: regionFactor });
  return response.data;
}

export async function exportPdf(payload: {
  title: string;
  description?: string;
  floorPlan: FloorPlan;
  parameters?: Record<string, unknown>;
  regionFactor?: number;
}) {
  const response = await api.post("/export/pdf", {
    title: payload.title,
    description: payload.description,
    floor_plan: payload.floorPlan,
    parameters: payload.parameters,
    region_factor: payload.regionFactor ?? 1.0,
  }, { responseType: "blob" });
  return response.data;
}

export async function exportSvg(payload: {
  title: string;
  floorPlan: FloorPlan;
}) {
  const response = await api.post("/export/svg", {
    title: payload.title,
    floor_plan: payload.floorPlan,
  }, { responseType: "blob" });
  return response.data;
}

export async function exportDxf(payload: {
  title: string;
  floorPlan: FloorPlan;
}) {
  const response = await api.post("/export/dxf", {
    title: payload.title,
    floor_plan: payload.floorPlan,
  }, { responseType: "blob" });
  return response.data;
}

export async function exportReport(payload: {
  title: string;
  description?: string;
  floorPlan: FloorPlan;
  parameters?: Record<string, unknown>;
  regionFactor?: number;
}) {
  const response = await api.post("/export/report", {
    title: payload.title,
    description: payload.description,
    floor_plan: payload.floorPlan,
    parameters: payload.parameters,
    region_factor: payload.regionFactor ?? 1.0,
  }, { responseType: "blob" });
  return response.data;
}

export async function uploadSitePhoto(projectId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/projects/${projectId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function shareProject(projectId: number) {
  const response = await api.post(`/projects/${projectId}/share`);
  return response.data;
}

export async function unshareProject(projectId: number) {
  const response = await api.post(`/projects/${projectId}/unshare`);
  return response.data;
}

export async function getPublicProject(token: string) {
  const response = await api.get(`/public/${token}`);
  return response.data;
}

