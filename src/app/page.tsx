"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, TrendingDown, Users, Tag } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import ExpenseModal from "@/components/ExpenseModal";
import type { Category, DashboardData, Expense, User } from "@/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });

function getPeriod(type: string) {
  const now = new Date();
  if (type === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    return { from, to };
  }
  if (type === "prev_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    return { from, to };
  }
  if (type === "year") {
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    return { from, to };
  }
  return { from: "", to: "" };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [period, setPeriod] = useState("month");
  const [myOnly, setMyOnly] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const hId = session?.user?.householdId;
      if (!hId || hId === "null" || hId === "undefined") {
        router.push("/register");
      }
    }
  }, [status, session, router]);


  useEffect(() => {
    if (status === "authenticated") {
      loadDashboard();
      fetch("/api/categories").then((r) => r.json()).then(setCategories);
      fetch("/api/users").then((r) => r.json()).then(setUsers);
    }
  }, [status, period, myOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDashboard() {
    const { from, to } = getPeriod(period);
    const params = new URLSearchParams();
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    if (myOnly) params.set("myOnly", "true");
    const res = await fetch(`/api/dashboard?${params}`);
    const json = await res.json();
    setData(json);
  }

  if (status === "loading" || !session) return null;

  const maxCat = data?.byCategory[0]?.total || 1;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Обзор</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Привет, {session.user.name}!
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={17} />
          Добавить расход
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm"
        >
          <option value="month">Этот месяц</option>
          <option value="prev_month">Прошлый месяц</option>
          <option value="year">Этот год</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 cursor-pointer hover:border-indigo-500 transition-colors">
          <input
            type="checkbox"
            checked={myOnly}
            onChange={(e) => setMyOnly(e.target.checked)}
            className="rounded"
          />
          Только мои
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <TrendingDown size={16} className="text-rose-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Итого</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-100">{fmt(data?.total ?? 0)}</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Tag size={16} className="text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Категорий</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-100">{data?.byCategory.length ?? 0}</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Users size={16} className="text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Участников</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-100">{data?.byUser.length ?? 0}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* By Category bar chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">По категориям</h2>
          {data?.byCategory.length ? (
            <div className="space-y-3">
              {data.byCategory.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span>{c.icon}</span> {c.name}
                    </span>
                    <span className="font-bold text-slate-100">{fmt(c.total)}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(c.total / maxCat) * 100}%`, background: c.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6">Нет данных за период</p>
          )}
        </div>

        {/* By Person bar chart */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">По участникам</h2>
          {data?.byUser.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byUser} barSize={32}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                  labelStyle={{ color: "#f1f5f9", fontSize: 12 }}
                  formatter={(v: number) => [fmt(v), ""]}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {data.byUser.map((u, i) => (
                    <Cell key={i} fill={u.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6">Нет данных за период</p>
          )}
        </div>
      </div>

      {/* Recent expenses */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Последние расходы</h2>
        {data?.recentExpenses.length ? (
          <div className="space-y-2">
            {data.recentExpenses.map((e: Expense) => (
              <div
                key={e.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-700/50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: e.category.color + "22" }}
                >
                  {e.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{e.description}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(e.date)} ·{" "}
                    <span style={{ color: e.user.color }}>{e.user.name}</span>
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-100 flex-shrink-0">{fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-6">Расходов пока нет</p>
        )}
      </div>

      {showModal && (
        <ExpenseModal
          categories={categories}
          users={users}
          currentUserId={parseInt(session.user.id)}
          isAdmin={session.user.role === "ADMIN"}
          onClose={() => setShowModal(false)}
          onSave={loadDashboard}
        />
      )}
    </AppLayout>
  );
}
