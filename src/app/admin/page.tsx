"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Download, Users, Tag, ShieldCheck, Copy, Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import type { Category, User } from "@/types";

interface Household {
  id: number;
  name: string;
  inviteCode: string;
}

const COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444",
  "#f59e0b","#10b981","#3b82f6","#14b8a6","#94a3b8",
];

const CAT_COLORS = [
  "#10b981","#3b82f6","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#6b7280","#94a3b8","#14b8a6",
];

interface UserFormData {
  name: string; email: string; password: string; role: string; color: string;
}
interface CatFormData {
  name: string; icon: string; color: string; monthlyBudget: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<"users" | "categories" | "settings">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [copied, setCopied] = useState(false);

  // User form
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState<UserFormData>({ name:"", email:"", password:"", role:"MEMBER", color:"#6366f1" });
  const [userErr, setUserErr] = useState("");
  const [userSaving, setUserSaving] = useState(false);

  // Category form
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState<CatFormData>({ name:"", icon:"💰", color:"#10b981", monthlyBudget:"" });
  const [catErr, setCatErr] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "ADMIN") {
      loadUsers();
      loadCategories();
      loadHousehold();
    }
  }, [status, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHousehold = () => fetch("/api/households").then(r => r.json()).then(setHousehold);

  const loadUsers = () => fetch("/api/users").then(r => r.json()).then(setUsers);
  const loadCategories = () => fetch("/api/categories").then(r => r.json()).then(setCategories);

  // ── User CRUD ──────────────────────────────────────────────────────────────
  function openAddUser() {
    setEditUser(null);
    setUserForm({ name:"", email:"", password:"", role:"MEMBER", color:"#6366f1" });
    setUserErr("");
    setShowUserForm(true);
  }
  function openEditUser(u: User) {
    setEditUser(u);
    setUserForm({ name:u.name, email:u.email, password:"", role:u.role, color:u.color });
    setUserErr("");
    setShowUserForm(true);
  }
  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setUserSaving(true);
    setUserErr("");
    try {
      const body = { ...userForm };
      if (!body.password) delete (body as Partial<UserFormData>).password;
      const res = await fetch(editUser ? `/api/users/${editUser.id}` : "/api/users", {
        method: editUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setShowUserForm(false);
      loadUsers();
    } catch (err) { setUserErr((err as Error).message); }
    finally { setUserSaving(false); }
  }
  async function deleteUser(id: number) {
    if (!confirm("Удалить участника и все его расходы?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  }

  // ── Category CRUD ──────────────────────────────────────────────────────────
  function openAddCat() {
    setEditCat(null);
    setCatForm({ name:"", icon:"💰", color:"#10b981", monthlyBudget:"" });
    setCatErr("");
    setShowCatForm(true);
  }
  function openEditCat(c: Category) {
    setEditCat(c);
    setCatForm({ name:c.name, icon:c.icon, color:c.color, monthlyBudget: c.monthlyBudget ? String(c.monthlyBudget) : "" });
    setCatErr("");
    setShowCatForm(true);
  }
  async function saveCat(e: React.FormEvent) {
    e.preventDefault();
    setCatSaving(true);
    setCatErr("");
    try {
      const res = await fetch(editCat ? `/api/categories/${editCat.id}` : "/api/categories", {
        method: editCat ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...catForm,
          monthlyBudget: catForm.monthlyBudget ? parseFloat(catForm.monthlyBudget) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setShowCatForm(false);
      loadCategories();
    } catch (err) { setCatErr((err as Error).message); }
    finally { setCatSaving(false); }
  }
  async function deleteCat(id: number) {
    if (!confirm("Удалить категорию?")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    loadCategories();
  }

  if (status === "loading" || !session) return null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Управление</h1>
            <p className="text-sm text-slate-400 mt-0.5">Панель администратора</p>
          </div>
        </div>
        <a
          href="/api/backup"
          download
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition-colors"
        >
          <Download size={16} />
          Скачать резервную копию
        </a>
        {household && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(household.inviteCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-semibold transition-colors"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            Код: {household.inviteCode}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 border border-slate-700 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "users" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-100"
          }`}
        >
          <Users size={15} /> Участники
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "categories" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-100"
          }`}
        >
          <Tag size={15} /> Категории
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "settings" ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-100"
          }`}
        >
          <ShieldCheck size={15} /> Настройки
        </button>
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-400">{users.length} участников</p>
            <button
              onClick={openAddUser}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> Добавить
            </button>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: u.color }}
                >
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  u.role === "ADMIN"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-700 text-slate-400"
                }`}>
                  {u.role === "ADMIN" ? "Админ" : "Участник"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditUser(u)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  {u.id !== parseInt(session.user.id) && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && household && (
        <div className="space-y-4">
          <div className="p-5 bg-slate-800 border border-slate-700 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Код приглашения</h3>
            <p className="text-xs text-slate-400 mb-3">Поделитесь этим кодом с другими членами семьи</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-slate-900 rounded-xl font-mono text-lg text-indigo-400">
                {household.inviteCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(household.inviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
          <div className="p-5 bg-slate-800 border border-slate-700 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Название семьи</h3>
            <p className="text-sm text-slate-100">{household.name}</p>
          </div>
        </div>
      )}

      {/* Categories tab */}
      {tab === "categories" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-400">{categories.length} категорий</p>
            <button
              onClick={openAddCat}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> Добавить
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: c.color + "22" }}
                >
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-100">{c.name}</span>
                  {c.monthlyBudget ? (
                    <p className="text-xs text-slate-400">
                      бюджет {new Intl.NumberFormat("ru-RU", { style:"currency", currency:"RUB", maximumFractionDigits:0 }).format(c.monthlyBudget)}/мес
                    </p>
                  ) : null}
                </div>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditCat(c)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteCat(c.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── User Modal ──────────────────────────────────────────────────────── */}
      {showUserForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowUserForm(false)}
        >
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl animate-pop-in">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-base font-bold text-slate-100">
                {editUser ? "Редактировать участника" : "Добавить участника"}
              </h2>
            </div>
            <form onSubmit={saveUser} className="p-6 space-y-4">
              {userErr && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{userErr}</div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Имя</label>
                <input type="text" required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})}
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})}
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Пароль {editUser && "(оставьте пустым, чтобы не менять)"}
                </label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})}
                  required={!editUser} placeholder="Минимум 6 символов"
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Роль</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5">
                  <option value="MEMBER">Участник</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Цвет</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setUserForm({...userForm, color: c})}
                      className="w-8 h-8 rounded-xl transition-all hover:scale-110"
                      style={{ background: c, outline: userForm.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowUserForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm">
                  Отмена
                </button>
                <button type="submit" disabled={userSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold text-sm">
                  {userSaving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Category Modal ──────────────────────────────────────────────────── */}
      {showCatForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowCatForm(false)}
        >
          <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl animate-pop-in">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-base font-bold text-slate-100">
                {editCat ? "Редактировать категорию" : "Добавить категорию"}
              </h2>
            </div>
            <form onSubmit={saveCat} className="p-6 space-y-4">
              {catErr && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{catErr}</div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Название</label>
                <input type="text" required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})}
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Эмодзи</label>
                <input type="text" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})}
                  maxLength={4} placeholder="🛒"
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5 text-xl" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Бюджет в месяц (₽, необязательно)
                </label>
                <input
                  type="number" min="0" step="100"
                  value={catForm.monthlyBudget}
                  onChange={e => setCatForm({...catForm, monthlyBudget: e.target.value})}
                  placeholder="например, 15000"
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Цвет</label>
                <div className="flex gap-2 flex-wrap">
                  {CAT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setCatForm({...catForm, color: c})}
                      className="w-8 h-8 rounded-xl transition-all hover:scale-110"
                      style={{ background: c, outline: catForm.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCatForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm">
                  Отмена
                </button>
                <button type="submit" disabled={catSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold text-sm">
                  {catSaving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
