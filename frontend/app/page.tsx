"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { login, register, getMe, listProjects, createProject, deleteProject } from "@/lib/api";
import { Project, User } from "@/lib/types";
import { Home, Plus, Trash2, Loader2 } from "lucide-react";

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white py-4 px-6 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6" />
          <h1 className="text-xl font-bold">AI House Designer</h1>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">{user.full_name || user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 transition"
            >
              Выйти
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {!user ? (
          <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              {authMode === "login" ? "Вход" : "Регистрация"}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === "register" && (
                <input
                  type="text"
                  placeholder="Имя"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
              <input
                type="password"
                placeholder="Пароль"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex justify-center"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : authMode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>
            <p className="mt-4 text-center text-sm">
              {authMode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
              <button
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-blue-600 underline"
              >
                {authMode === "login" ? "Зарегистрироваться" : "Войти"}
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="bg-white p-6 rounded-xl shadow">
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
                  className="flex-1 border rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Описание"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="flex-[2] border rounded-lg px-4 py-2"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  Создать
                </button>
              </form>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Мои проекты</h2>
              {projects.length === 0 ? (
                <p className="text-slate-500">У вас пока нет проектов. Создайте первый!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-white p-5 rounded-xl shadow hover:shadow-md transition">
                      <h3 className="font-semibold text-lg mb-1">{project.title}</h3>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2">{project.description || "Без описания"}</p>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/project/${project.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Открыть редактор →
                        </Link>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="text-red-600 hover:bg-red-50 p-2 rounded"
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
