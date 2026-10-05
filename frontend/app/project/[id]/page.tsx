"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProject, updateProject, exportPdf, exportSvg, exportDxf, exportReport } from "@/lib/api";
import { Project, FloorPlan, CostEstimate } from "@/lib/types";
import FloorPlanEditor from "@/components/FloorPlanEditor";
import House3DViewer from "@/components/House3DViewer";
import AIChatPanel from "@/components/AIChatPanel";
import CostEstimatePanel from "@/components/CostEstimatePanel";
import { ArrowLeft, Save, Loader2, Download, ChevronDown } from "lucide-react";
import Link from "next/link";

const defaultPlan: FloorPlan = {
  rooms: [
    { id: 1, name: "Гостиная", type: "living", x: 0, y: 0, width: 5, height: 5 },
    { id: 2, name: "Кухня", type: "kitchen", x: 5, y: 0, width: 3.5, height: 3.5 },
    { id: 3, name: "Спальня", type: "bedroom", x: 0, y: 5, width: 4, height: 4 },
    { id: 4, name: "Ванная", type: "bathroom", x: 4, y: 5, width: 2, height: 2 },
  ],
  walls: [
    { x1: 0, y1: 0, x2: 8.5, y2: 0, thickness: 0.2 },
    { x1: 8.5, y1: 0, x2: 8.5, y2: 9, thickness: 0.2 },
    { x1: 8.5, y1: 9, x2: 0, y2: 9, thickness: 0.2 },
    { x1: 0, y1: 9, x2: 0, y2: 0, thickness: 0.2 },
  ],
  doors: [{ x: 2, y: 0, width: 0.9, orientation: "horizontal", room_id: 1 }],
  windows: [{ x: 5, y: 0, width: 1.2, orientation: "horizontal", room_id: 1 }],
};

export default function ProjectPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan>(defaultPlan);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || isNaN(projectId)) return;
    getProject(projectId)
      .then((data) => {
        setProject(data);
        if (data.floor_plan) {
          setFloorPlan(data.floor_plan);
        }
      })
      .catch((err) => setError(err.response?.data?.detail || "Ошибка загрузки проекта"));
  }, [projectId]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { floor_plan: floorPlan };
      if (estimate) updates.materials_estimate = estimate;
      const updated = await updateProject(project.id, updates);
      setProject(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const data = {
      project,
      floorPlan,
      estimate,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${project?.title || "project"}.json`);
  };

  const handleExportPdf = async () => {
    if (!project) return;
    setExporting(true);
    try {
      const blob = await exportPdf({
        title: project.title,
        description: project.description,
        floorPlan,
        parameters: project.parameters,
      });
      downloadBlob(blob, `${project.title}.pdf`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка экспорта PDF");
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  const handleExportSvg = async () => {
    if (!project) return;
    setExporting(true);
    try {
      const blob = await exportSvg({ title: project.title, floorPlan });
      downloadBlob(blob, `${project.title}.svg`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка экспорта SVG");
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  const handleExportDxf = async () => {
    if (!project) return;
    setExporting(true);
    try {
      const blob = await exportDxf({ title: project.title, floorPlan });
      downloadBlob(blob, `${project.title}.dxf`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка экспорта DXF");
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  const handleExportReport = async () => {
    if (!project) return;
    setExporting(true);
    try {
      const blob = await exportReport({
        title: project.title,
        description: project.description,
        floorPlan,
        parameters: project.parameters,
      });
      downloadBlob(blob, `${project.title}-report.txt`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка экспорта отчёта");
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  if (error && !project) {
    return (
      <div className="p-8 text-red-600">
        <Link href="/" className="text-blue-600 hover:underline">← На главную</Link>
        <p className="mt-4">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white hover:text-slate-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-semibold">{project.title}</h1>
            <p className="text-xs text-slate-300">{project.description || "Нет описания"}</p>
          </div>
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
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Экспорт
              <ChevronDown className="h-4 w-4" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-10">
                <button
                  onClick={handleExport}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 first:rounded-t-lg"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  PDF
                </button>
                <button
                  onClick={handleExportSvg}
                  disabled={exporting}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  SVG
                </button>
                <button
                  onClick={handleExportDxf}
                  disabled={exporting}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  DXF
                </button>
                <button
                  onClick={handleExportReport}
                  disabled={exporting}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 last:rounded-b-lg disabled:opacity-50"
                >
                  Отчёт (TXT)
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 p-4 overflow-auto">
          {view === "2d" ? (
            <FloorPlanEditor floorPlan={floorPlan} onChange={setFloorPlan} />
          ) : (
            <House3DViewer floorPlan={floorPlan} />
          )}
        </main>

        <aside className="w-96 bg-white border-l shadow-sm flex flex-col overflow-hidden">
          <AIChatPanel
            project={project}
            floorPlan={floorPlan}
            onPlanGenerated={(plan) => setFloorPlan(plan)}
            onProjectUpdate={() =>
              getProject(project.id)
                .then(setProject)
                .catch(console.error)
            }
          />
          <div className="border-t" />
          <CostEstimatePanel floorPlan={floorPlan} estimate={estimate} onEstimate={setEstimate} />
        </aside>
      </div>
    </div>
  );
}
