"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, TrendingDown, Users, Tag, Zap, TrendingUp, CalendarDays, Loader2, ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, ReferenceLine,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import ExpenseModal from "@/components/ExpenseModal";
import { useTheme } from "@/app/providers";
import type { Category, DashboardData, Expense, TrendPoint, User } from "@/types";
import { monthRange, parseDateStr, toDateStr, todayStr } from "@/lib/dates";
import { fmtMoney as fmt, fmtDate } from "@/lib/format";

type Period = { kind: "month"; year: number; month: number } | { kind: "year"; year: number };

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function currentPeriod(kind: Period["kind"] = "month"): Period {
  const now = new Date();
  return kind === "month"
    ? { kind, year: now.getFullYear(), month: now.getMonth() }
    : { kind, year: now.getFullYear() };
}

function periodRange(p: Period) {
  return p.kind === "month"
    ? monthRange(p.year, p.month)
    : { from: toDateStr(new Date(p.year, 0, 1)), to: toDateStr(new Date(p.year, 11, 31)) };
}

function shiftPeriod(p: Period, delta: number): Period {
  if (p.kind === "year") return { kind: "year", year: p.year + delta };
  const d = new Date(p.year, p.month + delta, 1);
  return { kind: "month", year: d.getFullYear(), month: d.getMonth() };
}

const periodLabel = (p: Period) => (p.kind === "month" ? `${MONTHS[p.month]} ${p.year}` : `${p.year} год`);

// While a month is in progress it is compared with the same days of the previous one
function comparisonLabel(c: { to: string; partial: boolean }) {
  if (!c.partial) return "к прошлому месяцу";
  const to = parseDateStr(c.to).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  return `к 1–${to}`;
}

// ── Skeleton primitives ──────────────────────────────────────────────────
const Sk = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} style={style} />
);

function StatCardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5"
      style={{ minHeight: tall ? 122 : 106 }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Sk className="w-8 h-8 rounded-lg shrink-0" />
        <Sk className="h-2.5 w-16 rounded" />
      </div>
      <Sk className="h-9 sm:h-8 w-28 rounded-lg" />
      {tall && <Sk className="h-3.5 sm:h-3 w-24 rounded mt-2" />}
    </div>
  );
}

function CategoryRowSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <Sk className={`h-4 rounded ${wide ? "w-32" : "w-24"}`} />
        <Sk className="h-4 w-14 rounded flex-shrink-0" />
      </div>
      <Sk className="h-2.5 w-full rounded-full" />
    </div>
  );
}

function ExpenseRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3.5 sm:py-2.5 px-3">
      <Sk className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Sk className="h-4 sm:h-3.5 w-3/5 rounded" />
        <Sk className="h-3.5 sm:h-3 w-2/5 rounded" />
      </div>
      <Sk className="h-5 sm:h-4 w-16 sm:w-14 rounded flex-shrink-0" />
    </div>
  );
}

function BarChartSkeleton() {
  const heights = [45, 70, 55, 90, 60, 80];
  return (
    <div className="flex items-end gap-3 h-[200px] px-2 pb-5">
      {heights.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <Sk className="w-full rounded-md animate-pulse" style={{ height: `${h}%` }} />
          <Sk className="h-3 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

function LineChartSkeleton() {
  return (
    <div className="h-[180px] relative px-10 py-4">
      <svg className="w-full h-full" viewBox="0 0 400 140" preserveAspectRatio="none">
        <polyline
          points="0,110 80,75 160,90 240,40 320,60 400,30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-200 dark:text-slate-700 animate-pulse"
        />
      </svg>
      <div className="absolute inset-x-10 bottom-4 flex justify-between">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Sk key={i} className="h-3 w-8 rounded" />
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();

  const [period, setPeriod] = useState<Period>(() => currentPeriod());
  const [myOnly, setMyOnly] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const hId = session?.user?.householdId;
      if (!hId || hId === "null" || hId === "undefined") router.push("/register");
    }
  }, [status, session, router]);

  const hasHousehold = status === "authenticated" && !!session?.user?.householdId;

  // Reference data and the trend don't depend on the period filter: load once
  useEffect(() => {
    if (!hasHousehold) return;
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])).then(setCategories);
    fetch("/api/users").then((r) => (r.ok ? r.json() : [])).then(setUsers);
    loadTrend();
  }, [hasHousehold]); // eslint-disable-line react-hooks/exhaustive-deps

  // Home-screen shortcut "Добавить расход" opens /?add=1
  useEffect(() => {
    if (!hasHousehold || !window.location.search.includes("add=1")) return;
    setShowModal(true);
    router.replace("/");
  }, [hasHousehold, router]);

  useEffect(() => {
    if (hasHousehold) loadDashboard();
  }, [hasHousehold, period, myOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTrend() {
    setTrendLoading(true);
    try {
      const res = await fetch(`/api/analytics?today=${todayStr()}`);
      const d = res.ok ? await res.json() : null;
      setTrend(d?.trend ?? []);
    } finally {
      setTrendLoading(false);
    }
  }

  async function loadDashboard() {
    const id = ++requestId.current;
    setLoading(true);
    const { from, to } = periodRange(period);
    const params = new URLSearchParams({ today: todayStr() });
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    if (myOnly) params.set("myOnly", "true");
    try {
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      // Ignore stale responses when the filter changed while this one was in flight
      if (id !== requestId.current) return;
      setData(d);
      setLoadError("");
    } catch {
      if (id === requestId.current) setLoadError("Не удалось загрузить данные. Обновите страницу.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  if (status === "loading" || !session) return null;

  const isFirstLoad = data === null;
  const isRefreshing = data !== null && loading;

  const maxCat = data?.byCategory[0]?.total || 1;
  const pred = data?.prediction;
  const cmp = data?.comparison;
  const cmpPct = cmp && cmp.total > 0 && data ? Math.round(((data.total - cmp.total) / cmp.total) * 100) : null;

  const isMonthView = period.kind === "month";
  const now = currentPeriod(period.kind);
  const atPresent = periodRange(period).from >= periodRange(now).from;
  const isCurrentMonth = isMonthView && atPresent;
  const range = periodRange(period);

  // Budgets are monthly, so warnings and budget bars only make sense in month view
  const budgetAlerts = isMonthView
    ? (data?.byCategory ?? []).filter((c) => c.monthlyBudget && c.total >= c.monthlyBudget * 0.8)
    : [];

  const categoryHref = (categoryId: number) => {
    const q = new URLSearchParams({ categoryId: String(categoryId), dateFrom: range.from, dateTo: range.to });
    if (myOnly) q.set("userId", session!.user.id);
    return `/expenses?${q}`;
  };

  const segBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-indigo-500 text-white"
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
    }`;

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
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Обзор</h1>
              {isRefreshing && (
                <Loader2 size={16} className="animate-spin text-indigo-500" />
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Привет, {session.user.name}!</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus size={17} />
          Добавить расход
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <button
            onClick={() => setPeriod(shiftPeriod(period, -1))}
            className="w-9 h-9 flex items-center justify-center rounded-l-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Предыдущий период"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[132px] text-center text-sm font-semibold text-slate-800 dark:text-slate-200 select-none">
            {periodLabel(period)}
          </span>
          <button
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            disabled={atPresent}
            className="w-9 h-9 flex items-center justify-center rounded-r-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Следующий период"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex gap-0.5 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <button onClick={() => setPeriod(currentPeriod("month"))} className={segBtn(isMonthView)}>Месяц</button>
          <button onClick={() => setPeriod(currentPeriod("year"))} className={segBtn(!isMonthView)}>Год</button>
        </div>
        {!atPresent && (
          <button
            onClick={() => setPeriod(currentPeriod(period.kind))}
            className="px-3 py-2 rounded-xl text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
          >
            {isMonthView ? "К текущему месяцу" : "К текущему году"}
          </button>
        )}
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

      {loadError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
          {loadError}
        </div>
      )}

      {budgetAlerts.length > 0 && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
            <AlertTriangle size={16} /> Бюджет на исходе
          </div>
          <ul className="space-y-1">
            {budgetAlerts.map((c) => {
              const budget = c.monthlyBudget!;
              const over = c.total > budget;
              return (
                <li key={c.id}>
                  <Link href={categoryHref(c.id)} className="text-slate-700 dark:text-slate-300 hover:underline">
                    {c.icon} {c.name}:{" "}
                    {over ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">превышен на {fmt(c.total - budget)}</span>
                    ) : (
                      <>
                        {Math.round((c.total / budget) * 100)}% бюджета, осталось{" "}
                        <span className="font-semibold">{fmt(budget - c.total)}</span>
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {isFirstLoad ? (
          <>
            <StatCardSkeleton tall={isMonthView} />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 min-h-[106px]">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                  <TrendingDown size={16} className="text-rose-500 dark:text-rose-400" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Итого</span>
              </div>
              <div className="text-3xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-9 sm:leading-8">{fmt(data?.total ?? 0)}</div>
              {isMonthView && (
                <p className="text-sm sm:text-xs mt-1 h-5 sm:h-4 text-slate-500 dark:text-slate-400">
                  {cmp && cmpPct !== null && (
                    <>
                      <span className={cmpPct > 0 ? "text-rose-500 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                        {cmpPct > 0 ? "+" : cmpPct < 0 ? "−" : "±"}{Math.abs(cmpPct)}%
                      </span>{" "}
                      {comparisonLabel(cmp)}
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 min-h-[106px]">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Tag size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Категорий</span>
              </div>
              <div className="text-3xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-9 sm:leading-8">{data?.byCategory.length ?? 0}</div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 min-h-[106px]">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Участников</span>
              </div>
              <div className="text-3xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-9 sm:leading-8">{data?.byUser.length ?? 0}</div>
            </div>
          </>
        )}
      </div>

      {/* Prediction row — current month only */}
      {isFirstLoad && isCurrentMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCardSkeleton tall />
          <StatCardSkeleton tall />
          <StatCardSkeleton tall />
        </div>
      )}
      {!isFirstLoad && pred && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-5 min-h-[122px]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Прогноз</span>
            </div>
            <div className="text-3xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-9 sm:leading-8">{fmt(pred.projected)}</div>
            <p className="text-sm sm:text-xs text-slate-500 dark:text-slate-400 mt-1">к концу месяца</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 min-h-[122px]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">В день</span>
            </div>
            <div className="text-3xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-9 sm:leading-8">{fmt(pred.dailyRate)}</div>
            <p className="text-sm sm:text-xs text-slate-500 dark:text-slate-400 mt-1">средний расход</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 min-h-[122px]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                <CalendarDays size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Осталось</span>
            </div>
            <div className="text-3xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-9 sm:leading-8">{pred.daysLeft} дн.</div>
            <p className="text-sm sm:text-xs text-slate-500 dark:text-slate-400 mt-1">до конца месяца</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6 min-w-0">
        {/* By Category */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 overflow-hidden">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">По категориям</h2>
          {isFirstLoad ? (
            <div className="space-y-3">
              {([false, true, false, true, false] as boolean[]).map((w, i) => <CategoryRowSkeleton key={i} wide={w} />)}
            </div>
          ) : data?.byCategory.length ? (
            <div className="space-y-1">
              {data.byCategory.map((c) => {
                const budget = isMonthView ? c.monthlyBudget : null;
                const usedPct = budget ? (c.total / budget) * 100 : 0;
                const pct = budget ? Math.min(usedPct, 100) : (c.total / maxCat) * 100;
                const over = budget && c.total > budget;
                return (
                  <Link
                    key={c.id}
                    href={categoryHref(c.id)}
                    className="block -mx-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    title="Показать расходы этой категории"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 min-w-0 flex-1 mr-3">
                        <span className="flex-shrink-0">{c.icon}</span>
                        <span className="truncate">{c.name}</span>
                      </span>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(c.total)}</span>
                        {budget && (
                          <span className={`text-xs font-medium ${over ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {over ? `+${fmt(c.total - budget)}` : `−${fmt(budget - c.total)}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: over ? "#ef4444" : c.color }}
                      />
                    </div>
                    {budget && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 text-right">
                        {Math.round(usedPct)}% · бюджет {fmt(budget)}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Нет данных за период</p>
          )}
        </div>

        {/* By Person */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 overflow-hidden">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">По участникам</h2>
          {isFirstLoad ? (
            <BarChartSkeleton />
          ) : data?.byUser.length ? (
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
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6 overflow-hidden">
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Динамика за 6 месяцев</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">нажмите на месяц, чтобы открыть</span>
        </div>
        {trendLoading ? (
          <LineChartSkeleton />
        ) : trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={trend}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              className="cursor-pointer"
              onClick={(state) => {
                const p = state?.activePayload?.[0]?.payload as TrendPoint | undefined;
                if (p) setPeriod({ kind: "month", year: p.year, month: p.monthIndex });
              }}
            >
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
        ) : (
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Нет данных</p>
        )}
      </div>

      {/* Recent expenses */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 overflow-hidden">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Последние расходы</h2>
        {isFirstLoad ? (
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => <ExpenseRowSkeleton key={i} />)}
          </div>
        ) : data?.recentExpenses.length ? (
          <div className="space-y-2">
            {data.recentExpenses.map((e: Expense) => (
              <div
                key={e.id}
                className="flex items-center gap-3 py-3.5 sm:py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div
                  className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xl sm:text-lg flex-shrink-0"
                  style={{ background: e.category.color + "22" }}
                >
                  {e.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{e.description}</p>
                  <p className="text-sm sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {fmtDate(e.date)} ·{" "}
                    <span style={{ color: e.user.color }}>{e.user.name}</span>
                  </p>
                </div>
                <span className="text-base sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex-shrink-0">{fmt(e.amount)}</span>
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
          onSave={() => { loadDashboard(); loadTrend(); }}
        />
      )}
    </AppLayout>
  );
}
