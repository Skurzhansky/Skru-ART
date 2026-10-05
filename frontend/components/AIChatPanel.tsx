"use client";

import React, { useState } from "react";
import { sendChat, generatePlan } from "@/lib/api";
import { Project, FloorPlan, ChatMessage } from "@/lib/types";
import { Send, Sparkles, Loader2 } from "lucide-react";

interface AIChatPanelProps {
  project: Project;
  floorPlan: FloorPlan;
  onPlanGenerated: (plan: FloorPlan) => void;
}

export default function AIChatPanel({ project, floorPlan, onPlanGenerated }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const context = {
    title: project.title,
    description: project.description,
    parameters: project.parameters,
    current_floor_plan: floorPlan,
  };

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

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const plan = await generatePlan({
        prompt: input || `Создай планировку для проекта "${project.title}"`,
        area: 100,
        floors: 1,
        style: "современный",
        rooms: ["Гостиная", "Кухня", "Спальня", "Ванная"],
      });
      onPlanGenerated(plan);
      setMessages([
        ...messages,
        { role: "assistant", content: "Планировка сгенерирована. Вы можете отредактировать её на холсте." },
      ]);
    } catch (err: any) {
      setMessages([...messages, { role: "assistant", content: "Ошибка генерации планировки." }]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[50%] min-h-[300px]">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold">ИИ-помощник</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-10">
            Задайте вопрос архитектору ИИ или попросите сгенерировать планировку.
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
            {generating ? "Генерирую планировку..." : "ИИ печатает..."}
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t bg-white">
        <div className="flex gap-2 mb-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите запрос..."
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
          onClick={handleGeneratePlan}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Генерация..." : "Сгенерировать планировку ИИ"}
        </button>
      </form>
    </div>
  );
}
