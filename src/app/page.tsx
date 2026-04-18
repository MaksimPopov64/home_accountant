"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, TrendingDown, Users, Tag, Zap, TrendingUp, CalendarDays } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, ReferenceLine,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import ExpenseModal from "@/components/ExpenseModal";
import { useTheme } from "@/app/providers";
import type { Category, DashboardData, Expense, TrendPoint, User } from "@/types";

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
  const { theme } = useTheme();

  const [period, setPeriod] = useState("month");
  const [myOnly, setMyOnly] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const hId = session?.user?.householdId;
      if (!hId || hId === "null" || hId === "undefined") router.push("/register");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadDashboard();
      fetch("/api/categories").then((r) => r.json()).then(setCategories);
      fetch("/api/users").then((r) => r.json()).then(setUsers);
      fetch("/api/analytics").then((r) => r.json()).then((d) => setTrend(d.trend ?? []));
    }
  }, [status, period, myOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDashboard() {
    const { from, to } = getPeriod(period);
    const params = new URLSearchParams();
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    if (myOnly) params.set("myOnly", "true");
    const res = await fetch(`/api/dashboard?${params}`);
    setData(await res.json());
  }

  if (status === "loading" || !session) return null;

  const maxCat = data?.byCategory[0]?.total || 1;
  const pred = data?.prediction;

  const isDark = theme === "dark";
  const tipBg = isDark ? "#1e293b" : "#ffffff";
  const tipBorder = isDark ? "1px solid #334155" : "1px solid #e2e8f0";
  const tipLabel = isDark ? { color: "#f1f5f9", fontSize: 12 } : { color: "#0f172a", fontSize: 12 };
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#1e293b" : "#f1f5f9";

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Обзор</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Привет, {session.user.name}!</p>
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
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm"
        >
          <option value="month">Этот месяц</option>
          <option value="prev_month">Прошлый месяц</option>
          <option value="year">Этот год</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:border-indigo-500 transition-colors">
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
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <TrendingDown size={16} className="text-rose-500 dark:text-rose-400" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Итого</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmt(data?.total ?? 0)}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Tag size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Категорий</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{data?.byCategory.length ?? 0}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Участников</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{data?.byUser.length ?? 0}</div>
        </div>
      </div>

      {/* Prediction row — current month only */}
      {pred && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Zap size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Прогноз</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmt(pred.projected)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">к концу месяца</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">В день</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmt(pred.dailyRate)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">средний расход</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <CalendarDays size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Осталось</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{pred.daysLeft} дн.</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">до конца месяца</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* By Category */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">По категориям</h2>
          {data?.byCategory.length ? (
            <div className="space-y-3">
              {data.byCategory.map((c) => {
                const budget = c.monthlyBudget;
                const pct = budget ? Math.min((c.total / budget) * 100, 100) : (c.total / maxCat) * 100;
                const over = budget && c.total > budget;
                return (
                  <div key={c.name}>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <span>{c.icon}</span> {c.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {budget && (
                          <span className={`text-xs font-medium ${over ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>
                            {over ? `+${fmt(c.total - budget)}` : `${fmt(budget - c.total)} осталось`}
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-slate-100">{fmt(c.total)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: over ? "#ef4444" : c.color }}
                      />
                    </div>
                    {budget && (
                      <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        <span>{Math.round(pct)}%</span>
                        <span>бюджет {fmt(budget)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Нет данных за период</p>
          )}
        </div>

        {/* By Person */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">По участникам</h2>
          {data?.byUser.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byUser} barSize={32}>
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: tipBg, border: tipBorder, borderRadius: 8 }}
                  labelStyle={tipLabel}
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
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Нет данных за период</p>
          )}
        </div>
      </div>

      {/* 6-month trend */}
      {trend.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Динамика за 6 месяцев</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}к`}
                width={36}
              />
              <Tooltip
                contentStyle={{ background: tipBg, border: tipBorder, borderRadius: 8 }}
                labelStyle={tipLabel}
                formatter={(v: number) => [fmt(v), "Расходы"]}
              />
              <ReferenceLine
                y={Math.round(trend.reduce((s, t) => s + t.total, 0) / (trend.filter((t) => t.total > 0).length || 1))}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{ value: "avg", fill: "#6366f1", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#818cf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent expenses */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Последние расходы</h2>
        {data?.recentExpenses.length ? (
          <div className="space-y-2">
            {data.recentExpenses.map((e: Expense) => (
              <div
                key={e.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: e.category.color + "22" }}
                >
                  {e.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{e.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {fmtDate(e.date)} ·{" "}
                    <span style={{ color: e.user.color }}>{e.user.name}</span>
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex-shrink-0">{fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Расходов пока нет</p>
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
