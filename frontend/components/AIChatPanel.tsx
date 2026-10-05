"use client";

import React, { useState, useEffect } from "react";
import { sendChat, generatePlan, generatePlanVariants, getMaterialRecommendations, getEnergyAssessment, updateProject } from "@/lib/api";
import { Project, FloorPlan, ChatMessage } from "@/lib/types";
import { Send, Sparkles, Loader2, SlidersHorizontal, X, Check, LayoutGrid, Package, Zap } from "lucide-react";

interface AIChatPanelProps {
  project: Project;
  floorPlan: FloorPlan;
  onPlanGenerated: (plan: FloorPlan) => void;
  onProjectUpdate?: () => void;
}

interface PlanParams {
  area: string;
  floors: string;
  budget: string;
  style: string;
  rooms: string;
}

function computeArea(plan: FloorPlan) {
  return plan.rooms.reduce((sum, r) => sum + r.width * r.height, 0).toFixed(1);
}

export default function AIChatPanel({ project, floorPlan, onPlanGenerated, onProjectUpdate }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [variants, setVariants] = useState<FloorPlan[] | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [params, setParams] = useState<PlanParams>(() => {
    const p = project.parameters || {};
    return {
      area: p.area?.toString() || "100",
      floors: p.floors?.toString() || "1",
      budget: p.budget?.toString() || "",
      style: p.style?.toString() || "современный",
      rooms: Array.isArray(p.rooms) ? p.rooms.join(", ") : "Гостиная, Кухня, Спальня, Ванная",
    };
  });

  const context = {
    title: project.title,
    description: project.description,
    parameters: { ...project.parameters, ...paramsToObject(params) },
    current_floor_plan: floorPlan,
  };

  function paramsToObject(p: PlanParams) {
    return {
      area: parseFloat(p.area) || undefined,
      floors: parseInt(p.floors) || 1,
      budget: parseFloat(p.budget) || undefined,
      style: p.style,
      rooms: p.rooms.split(",").map((r) => r.trim()).filter(Boolean),
    };
  }

  useEffect(() => {
    const p = project.parameters || {};
    setParams({
      area: p.area?.toString() || "100",
      floors: p.floors?.toString() || "1",
      budget: p.budget?.toString() || "",
      style: p.style?.toString() || "современный",
      rooms: Array.isArray(p.rooms) ? p.rooms.join(", ") : params.rooms,
    });
  }, [project.parameters]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    try {
      const data = await sendChat(updatedMessages, context);
      setMessages([...updatedMessages, { role: "assistant", content: data.answer }]);
    } catch (err: any) {
      setMessages([...updatedMessages, { role: "assistant", content: "Ошибка связи с ИИ." }]);
    } finally {
      setLoading(false);
    }
  };

  const runGeneration = async () => {
    const planParams = paramsToObject(params);
    await updateProject(project.id, { parameters: planParams });
    onProjectUpdate?.();
    return planParams;
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const planParams = await runGeneration();
      const plan = await generatePlan({
        prompt: input || `Создай планировку для проекта "${project.title}"`,
        area: planParams.area,
        floors: planParams.floors,
        budget: planParams.budget,
        style: planParams.style,
        rooms: planParams.rooms,
      });

      onPlanGenerated(plan);
      setMessages([
        ...messages,
        {
          role: "assistant",
          content: `Планировка сгенерирована (${planParams.floors} этаж., ~${planParams.area || "?"} м², стиль: ${planParams.style}). Вы можете отредактировать её на холсте.`,
        },
      ]);
      setInput("");
    } catch (err: any) {
      setMessages([...messages, { role: "assistant", content: "Ошибка генерации планировки. Убедитесь, что в backend задан OPENAI_API_KEY." }]);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateVariants = async () => {
    setGenerating(true);
    setVariants(null);
    setShowVariants(true);
    try {
      const planParams = await runGeneration();
      const data = await generatePlanVariants({
        prompt: input || `Создай несколько вариантов планировки для проекта "${project.title}"`,
        area: planParams.area,
        floors: planParams.floors,
        budget: planParams.budget,
        style: planParams.style,
        rooms: planParams.rooms,
      });
      setVariants(data.variants);
      setMessages([
        ...messages,
        { role: "assistant", content: `Сгенерировано ${data.variants.length} варианта планировки. Выберите подходящий.` },
      ]);
    } catch (err: any) {
      setMessages([...messages, { role: "assistant", content: "Ошибка генерации вариантов. Убедитесь, что в backend задан OPENAI_API_KEY." }]);
      setShowVariants(false);
    } finally {
      setGenerating(false);
    }
  };

  const applyVariant = (plan: FloorPlan) => {
    onPlanGenerated(plan);
    setShowVariants(false);
    setVariants(null);
    setMessages([
      ...messages,
      { role: "assistant", content: "Вариант применён. Можете доработать его в редакторе." },
    ]);
  };

  const handleRecommendMaterials = async () => {
    setLoading(true);
    try {
      const planParams = paramsToObject(params);
      const data = await getMaterialRecommendations({
        floorPlan,
        parameters: planParams,
        style: planParams.style,
        budget: planParams.budget,
        regionFactor: 1.0,
      });

      const lines = [
        `**Рекомендации по материалам** (${data.source === "ai" ? "ИИ" : "заглушка"})`,
        data.summary,
        "",
        ...(data.recommendations || []).map(
          (r: any) =>
            `• **${r.category}**: ${r.material} — ${r.total_cost?.toLocaleString("ru-RU")} ₽ (${r.quantity} ${r.unit}, ${r.estimated_cost_per_unit?.toLocaleString("ru-RU")} ₽/${r.unit})\n  ${r.description}`
        ),
        "",
        `**Итого:** ${data.total_estimate?.toLocaleString("ru-RU")} ₽`,
      ];
      setMessages([...messages, { role: "assistant", content: lines.join("\n") }]);
    } catch (err: any) {
      setMessages([...messages, { role: "assistant", content: "Ошибка получения рекомендаций по материалам." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnergyAssessment = async () => {
    setLoading(true);
    try {
      const planParams = paramsToObject(params);
      const data = await getEnergyAssessment({
        floorPlan,
        parameters: planParams,
        style: planParams.style,
        regionFactor: 1.0,
      });

      const lines = [
        `**Оценка энергоэффективности** (${data.source === "ai" ? "ИИ" : "заглушка"})`,
        data.summary,
        "",
        `**Класс энергоэффективности:** ${data.efficiency_class}`,
        `**Теплопотери:** ~${data.heat_loss_w_per_m2} Вт/м²`,
        `**Отопление в год:** ${data.annual_heating_cost?.toLocaleString("ru-RU")} ₽`,
        `**Охлаждение в год:** ${data.annual_cooling_cost?.toLocaleString("ru-RU")} ₽`,
        "",
        "**Рекомендации:**",
        ...(data.recommendations || []).map((r: string) => `• ${r}`),
      ];
      setMessages([...messages, { role: "assistant", content: lines.join("\n") }]);
    } catch (err: any) {
      setMessages([...messages, { role: "assistant", content: "Ошибка оценки энергоэффективности." }]);
    } finally {
      setLoading(false);
    }
  };

  const updateParam = (field: keyof PlanParams, value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="relative flex flex-col h-[50%] min-h-[300px]">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold">ИИ-помощник</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-10">
            Задайте вопрос архитектору ИИ или настройте параметры и сгенерируйте планировку.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] p-3 rounded-lg text-sm ${
              m.role === "user" ? "bg-blue-600 text-white self-end ml-auto" : "bg-white border text-slate-800"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {(loading || generating) && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {generating ? "Генерирую..." : "ИИ печатает..."}
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t bg-white">
        <div className="flex gap-2 mb-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите запрос или описание пожеланий..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowParams((s) => !s)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showParams ? "Скрыть параметры генерации" : "Параметры генерации"}
        </button>

        {showParams && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div>
              <label className="text-xs text-slate-500">Площадь (м²)</label>
              <input
                type="number"
                min={10}
                value={params.area}
                onChange={(e) => updateParam("area", e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Этажей</label>
              <input
                type="number"
                min={1}
                max={5}
                value={params.floors}
                onChange={(e) => updateParam("floors", e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Бюджет (руб.)</label>
              <input
                type="number"
                min={0}
                value={params.budget}
                onChange={(e) => updateParam("budget", e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Стиль</label>
              <select
                value={params.style}
                onChange={(e) => updateParam("style", e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="современный">Современный</option>
                <option value="классический">Классический</option>
                <option value="минимализм">Минимализм</option>
                <option value="скандинавский">Скандинавский</option>
                <option value="лофт">Лофт</option>
                <option value="деревенский">Деревенский/загородный</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Комнаты (через запятую)</label>
              <input
                type="text"
                value={params.rooms}
                onChange={(e) => updateParam("rooms", e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Генерация..." : "Сгенерировать планировку ИИ"}
          </button>
          <button
            type="button"
            onClick={handleGenerateVariants}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            <LayoutGrid className="h-4 w-4" />
            {generating ? "Генерация вариантов..." : "Сгенерировать варианты"}
          </button>
          <button
            type="button"
            onClick={handleRecommendMaterials}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            <Package className="h-4 w-4" />
            {loading ? "Анализ..." : "Рекомендации по материалам"}
          </button>
          <button
            type="button"
            onClick={handleEnergyAssessment}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            {loading ? "Анализ..." : "Оценка энергоэффективности"}
          </button>
        </div>
      </form>

      {showVariants && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80%] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Варианты планировки</h3>
              <button
                onClick={() => setShowVariants(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {variants == null ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Генерируем варианты...</p>
                </div>
              ) : variants.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Не удалось сгенерировать варианты.</p>
              ) : (
                variants.map((plan, idx) => (
                  <div key={idx} className="border rounded-lg p-3 hover:border-blue-400 transition">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Вариант {idx + 1}</h4>
                      <button
                        onClick={() => applyVariant(plan)}
                        className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Применить
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Площадь: {computeArea(plan)} м²</p>
                      <p>Комнат: {plan.rooms.length}</p>
                      <p>{plan.rooms.map((r) => r.name).join(", ")}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
