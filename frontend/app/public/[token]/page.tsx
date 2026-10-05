"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicProject } from "@/lib/api";
import { Project, FloorPlan } from "@/lib/types";
import FloorPlanEditor from "@/components/FloorPlanEditor";
import House3DViewer from "@/components/House3DViewer";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PublicProject {
  id: number;
  title: string;
  description?: string;
  parameters?: Record<string, unknown>;
  floor_plan?: FloorPlan;
  site_photo_url?: string;
  created_at: string;
}

export default function PublicProjectPage() {
  const params = useParams();
  const token = params.token as string;
  const [project, setProject] = useState<PublicProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    if (!token) return;
    getPublicProject(token)
      .then((res) => setProject(res))
      .catch((err) => setError(err.response?.data?.detail || "Проект не найден или доступ закрыт"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <p className="text-red-600 mb-4">{error || "Проект не найден"}</p>
        <Link href="/" className="text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow">
        <div>
          <h1 className="font-semibold">{project.title}</h1>
          <p className="text-xs text-slate-300">{project.description || "Публичный проект"}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 rounded-lg p-1 flex">
            <button
              onClick={() => setView("2d")}
              className={`px-3 py-1 text-sm rounded-md transition ${view === "2d" ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
            >
              2D план
            </button>
            <button
              onClick={() => setView("3d")}
              className={`px-3 py-1 text-sm rounded-md transition ${view === "3d" ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
            >
              3D вид
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        {project.site_photo_url && (
          <div className="mb-4">
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${project.site_photo_url}`}
              alt="Фото участка"
              className="max-w-full h-auto rounded-lg shadow"
            />
          </div>
        )}
        {project.floor_plan ? (
          view === "2d" ? (
            <FloorPlanEditor floorPlan={project.floor_plan} onChange={() => {}} />
          ) : (
            <House3DViewer floorPlan={project.floor_plan} />
          )
        ) : (
          <p className="text-slate-500">Планировка не создана</p>
        )}
      </main>
    </div>
  );
}
