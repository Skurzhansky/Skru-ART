"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProject, updateProject, exportPdf, exportSvg, exportDxf, exportReport, exportExecDocs, uploadSitePhoto, shareProject, unshareProject, saveProjectVersion, listProjectVersions, restoreProjectVersion } from "@/lib/api";
import { Project, FloorPlan, CostEstimate } from "@/lib/types";
import FloorPlanEditor from "@/components/FloorPlanEditor";
import House3DViewer from "@/components/House3DViewer";
import AIChatPanel from "@/components/AIChatPanel";
import CostEstimatePanel from "@/components/CostEstimatePanel";
import { ArrowLeft, Save, Loader2, Download, ChevronDown, ImagePlus, Share2, Link as LinkIcon, History, Menu } from "lucide-react";
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
  const [versionsMenuOpen, setVersionsMenuOpen] = useState(false);
  const [versions, setVersions] = useState<{ index: number; timestamp: string }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const handleExportExecDocs = async () => {
    if (!project) return;
    setExporting(true);
    try {
      const blob = await exportExecDocs({
        title: project.title,
        description: project.description,
        floorPlan,
        parameters: project.parameters,
      });
      downloadBlob(blob, `${project.title}-exec-docs.pdf`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка экспорта исполнительной документации");
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project || !e.target.files?.[0]) return;
    setExporting(true);
    try {
      const updated = await uploadSitePhoto(project.id, e.target.files[0]);
      setProject(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка загрузки фото");
    } finally {
      setExporting(false);
      e.target.value = "";
    }
  };

  const handleShareToggle = async () => {
    if (!project) return;
    setExporting(true);
    try {
      const updated = project.is_public
        ? await unshareProject(project.id)
        : await shareProject(project.id);
      setProject(updated);
      if (updated.public_token) {
        const url = `${window.location.origin}/public/${updated.public_token}`;
        navigator.clipboard.writeText(url);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка настройки доступа");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!project) return;
    try {
      await saveProjectVersion(project.id);
      const data = await listProjectVersions(project.id);
      setVersions(data.versions || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка сохранения версии");
    }
  };

  const handleRestoreVersion = async (index: number) => {
    if (!project) return;
    if (!confirm("Восстановить эту версию? Текущие изменения будут сохранены в истории.")) return;
    try {
      const updated = await restoreProjectVersion(project.id, index);
      setProject(updated);
      if (updated.floor_plan) setFloorPlan(updated.floor_plan);
      setVersionsMenuOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка восстановления версии");
    }
  };

  const loadVersions = async () => {
    if (!project) return;
    try {
      const data = await listProjectVersions(project.id);
      setVersions(data.versions || []);
    } catch (err) {
      console.error(err);
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
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow flex-wrap gap-2">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="text-white hover:text-slate-300 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{project.title}</h1>
            <p className="text-xs text-slate-300 truncate">{project.description || "Нет описания"}</p>
          </div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-3">
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
          <label className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
            <ImagePlus className="h-4 w-4" />
            Фото участка
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          <button
            onClick={handleShareToggle}
            disabled={exporting}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            {project.is_public ? <LinkIcon className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {project.is_public ? "Скопировать ссылку" : "Поделиться"}
          </button>
          <div className="relative">
            <button
              onClick={() => {
                setVersionsMenuOpen(!versionsMenuOpen);
                if (!versionsMenuOpen) loadVersions();
              }}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
            >
              <History className="h-4 w-4" />
              Версии
            </button>
            {versionsMenuOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-10">
                <div className="p-2">
                  <button
                    onClick={handleSaveVersion}
                    className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 rounded"
                  >
                    + Сохранить текущую версию
                  </button>
                  <div className="border-t border-slate-700 mt-2 pt-2 max-h-48 overflow-y-auto">
                    {versions.length === 0 ? (
                      <p className="text-xs text-slate-400 px-3 py-2">Нет сохранённых версий</p>
                    ) : (
                      versions.map((v) => (
                        <button
                          key={v.index}
                          onClick={() => handleRestoreVersion(v.index)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded"
                        >
                          Версия {v.index + 1} — {new Date(v.timestamp).toLocaleString("ru-RU")}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
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
                <button onClick={handleExport} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 first:rounded-t-lg">JSON</button>
                <button onClick={handleExportPdf} disabled={exporting} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50">PDF</button>
                <button onClick={handleExportSvg} disabled={exporting} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50">SVG</button>
                <button onClick={handleExportDxf} disabled={exporting} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50">DXF</button>
                <button onClick={handleExportReport} disabled={exporting} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50">Отчёт (TXT)</button>
                <button onClick={handleExportExecDocs} disabled={exporting} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 last:rounded-b-lg disabled:opacity-50">Исполнительная документация</button>
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

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <div className="bg-slate-800 rounded-lg p-1 flex">
            <button
              onClick={() => setView("2d")}
              className={`px-2 py-1 text-xs rounded-md transition ${view === "2d" ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
            >
              2D
            </button>
            <button
              onClick={() => setView("3d")}
              className={`px-2 py-1 text-xs rounded-md transition ${view === "3d" ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
            >
              3D
            </button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full right-0 mt-1 w-56 bg-slate-800 rounded-lg shadow-lg border border-slate-700 z-50 mr-4">
            <label className="flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer">
              <ImagePlus className="h-4 w-4" />
              Фото участка
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            <button
              onClick={handleShareToggle}
              disabled={exporting}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700"
            >
              {project.is_public ? <LinkIcon className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {project.is_public ? "Скопировать ссылку" : "Поделиться"}
            </button>
            <button
              onClick={handleSaveVersion}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700"
            >
              <History className="h-4 w-4" />
              Сохранить версию
            </button>
            <div className="border-t border-slate-700">
              <button onClick={handleExport} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700">Экспорт JSON</button>
              <button onClick={handleExportPdf} disabled={exporting} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700">Экспорт PDF</button>
              <button onClick={handleExportSvg} disabled={exporting} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700">Экспорт SVG</button>
              <button onClick={handleExportDxf} disabled={exporting} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700">Экспорт DXF</button>
              <button onClick={handleExportReport} disabled={exporting} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700">Отчёт (TXT)</button>
              <button onClick={handleExportExecDocs} disabled={exporting} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700">Исполнительная документация</button>
            </div>
            <div className="border-t border-slate-700 p-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <main className="flex-1 p-4 overflow-auto min-h-[50vh]">
          {view === "2d" ? (
            <FloorPlanEditor floorPlan={floorPlan} onChange={setFloorPlan} />
          ) : (
            <House3DViewer floorPlan={floorPlan} />
          )}
        </main>

        {/* Mobile toggle for sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-4 right-4 bg-slate-900 text-white p-3 rounded-full shadow-lg z-40"
        >
          {sidebarOpen ? "Скрыть" : "Панель"}
        </button>

        <aside className={`${sidebarOpen ? "flex" : "hidden"} lg:flex w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l shadow-sm flex-col overflow-hidden max-h-[50vh] lg:max-h-none`}>
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
