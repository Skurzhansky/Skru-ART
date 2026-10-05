"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { login, register, getMe, listProjects, createProject, deleteProject } from "@/lib/api";
import { Project, User } from "@/lib/types";
import {
  Home, Plus, Trash2, Loader2, Sparkles, Box, FileText,
  Share2, Zap, Download, ArrowRight, Check
} from "lucide-react";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem("token"));
    }
  }, []);

  useEffect(() => {
    if (user) {
      listProjects().then(setProjects).catch(console.error);
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (authMode === "login") {
        const data = await login(email, password);
        localStorage.setItem("token", data.access_token);
      } else {
        await register(email, password, fullName);
        const data = await login(email, password);
        localStorage.setItem("token", data.access_token);
      }
      const me = await getMe();
      setUser(me);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setProjects([]);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const project = await createProject({ title: newTitle, description: newDescription });
      setProjects([project, ...projects]);
      setNewTitle("");
      setNewDescription("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка создания проекта");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить проект?")) return;
    await deleteProject(id);
    setProjects(projects.filter((p) => p.id !== id));
  };

  const features = [
    { icon: Sparkles, title: "ИИ-генерация", desc: "Опишите дом словами — получите планировку" },
    { icon: Box, title: "2D и 3D", desc: "Редактируйте в 2D, смотрите в 3D" },
    { icon: FileText, title: "Смета", desc: "Расчёт стоимости строительства" },
    { icon: Share2, title: "Поделиться", desc: "Публичная ссылка на проект" },
    { icon: Zap, title: "Материалы", desc: "Рекомендации по материалам от ИИ" },
    { icon: Download, title: "Экспорт", desc: "PDF, DXF, SVG для строителей" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-slate-900 text-white py-4 px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-blue-400" />
          <h1 className="text-xl font-bold">AI House Designer</h1>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">{user.full_name || user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
            >
              Выйти
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">
        {!user ? (
          <div>
            {/* Hero Section */}
            <section className="py-20 px-6 text-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
              <div className="max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-1 rounded-full text-sm mb-6">
                  <Sparkles className="h-4 w-4" />
                  Powered by AI
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                  Спроектируйте дом<br />с помощью <span className="text-blue-400">искусственного интеллекта</span>
                </h1>
                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                  Опишите требования — получите планировку, 3D-модель и смету за минуты, а не недели
                </p>
                <button
                  onClick={() => document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center gap-2 transition shadow-lg shadow-blue-600/30"
                >
                  Начать бесплатно <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </section>

            {/* Features */}
            <section className="py-16 px-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Возможности</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {features.map((f, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-slate-200">
                      <f.icon className="h-10 w-10 text-blue-600 mb-4" />
                      <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                      <p className="text-slate-600">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* How it works */}
            <section className="py-16 px-6 bg-white">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Как это работает</h2>
                <div className="space-y-8">
                  {[
                    { num: "1", title: "Опишите требования", desc: "Укажите площадь, этажность, стиль и список комнат" },
                    { num: "2", title: "Получите планировку", desc: "ИИ сгенерирует 2-3 варианта на выбор" },
                    { num: "3", title: "Настройте и оцените", desc: "Отредактируйте в 2D, посмотрите в 3D, получите смету" },
                    { num: "4", title: "Экспортируйте", desc: "Скачайте PDF, DXF или поделитесь ссылкой" },
                  ].map((step) => (
                    <div key={step.num} className="flex gap-6 items-start">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                        {step.num}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                        <p className="text-slate-600">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Auth */}
            <section id="auth" className="py-16 px-6">
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                <h2 className="text-2xl font-bold mb-2 text-center">
                  {authMode === "login" ? "Вход" : "Регистрация"}
                </h2>
                <p className="text-slate-500 text-center mb-6">
                  {authMode === "login" ? "С возвращением!" : "Создайте аккаунт за 30 секунд"}
                </p>
                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === "register" && (
                    <input
                      type="text"
                      placeholder="Имя"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Пароль"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 flex justify-center font-semibold transition"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : authMode === "login" ? "Войти" : "Зарегистрироваться"}
                  </button>
                </form>
                <p className="mt-6 text-center text-sm text-slate-600">
                  {authMode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                  <button
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    {authMode === "login" ? "Зарегистрироваться" : "Войти"}
                  </button>
                </p>
              </div>
            </section>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5" /> Новый проект
              </h2>
              <form onSubmit={handleCreateProject} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Название проекта"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Описание"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="flex-[2] border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 font-semibold transition"
                >
                  Создать
                </button>
              </form>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Мои проекты</h2>
              {projects.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                  <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">У вас пока нет проектов</p>
                  <p className="text-slate-400 text-sm">Создайте первый проект и начните проектировать</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition group">
                      <h3 className="font-semibold text-lg mb-1">{project.title}</h3>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2">{project.description || "Без описания"}</p>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/project/${project.id}`}
                          className="text-blue-600 hover:underline text-sm font-medium inline-flex items-center gap-1"
                        >
                          Открыть <ArrowRight className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
