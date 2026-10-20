"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Search, Download, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ExpenseModal from "@/components/ExpenseModal";
import type { Category, Expense, ExpensesResponse, User } from "@/types";
import { todayStr } from "@/lib/dates";
import { fmtMoney as fmt, fmtDate as fmtDateBase } from "@/lib/format";

const fmtDate = (s: string) => fmtDateBase(s, "long");

const PAGE_SIZE = 50;
const UNDO_MS = 5000;

const fieldCls = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm";

interface PendingDelete {
  expense: Expense;
  index: number;
  timer: ReturnType<typeof setTimeout>;
}

// useSearchParams needs a Suspense boundary in the app router
export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}

function ExpensesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ total: 0, count: 0 });
  const [loadError, setLoadError] = useState("");
  const requestId = useRef(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters start from the URL so the dashboard can link straight into a category
  const [filterUser, setFilterUser] = useState(() => searchParams.get("userId") ?? "");
  const [filterCat, setFilterCat] = useState(() => searchParams.get("categoryId") ?? "");
  const [filterFrom, setFilterFrom] = useState(() => searchParams.get("dateFrom") ?? "");
  const [filterTo, setFilterTo] = useState(() => searchParams.get("dateTo") ?? "");
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [query, setQuery] = useState(search);

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showModal, setShowModal] = useState(false);

  const pending = useRef<PendingDelete | null>(null);
  const [undoItem, setUndoItem] = useState<Expense | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Reference data doesn't depend on filters: load once
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])).then(setCategories);
    fetch("/api/users").then((r) => (r.ok ? r.json() : [])).then(setUsers);
  }, [status]);

  // Debounce typing in the search box
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filterUser) params.set("userId", filterUser);
    if (filterCat)  params.set("categoryId", filterCat);
    if (filterFrom) params.set("dateFrom", filterFrom);
    if (filterTo)   params.set("dateTo", filterTo);
    if (query)      params.set("q", query);
    return params;
  }, [filterUser, filterCat, filterFrom, filterTo, query]);

  // A deletion waiting for its undo window must reach the server before the list is re-read
  const flushPending = useCallback(async (keepalive = false) => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setUndoItem(null);
    const res = await fetch(`/api/expenses/${p.expense.id}`, { method: "DELETE", keepalive }).catch(() => null);
    if (!res?.ok && !keepalive) {
      const d = await res?.json().catch(() => ({}));
      alert(d?.error || "Не удалось удалить расход");
    }
  }, []);

  // Leaving the page commits the pending deletion
  useEffect(() => {
    const onHide = () => { flushPending(true); };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flushPending(true);
    };
  }, [flushPending]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const qs = filterParams().toString();
    router.replace(qs ? `/expenses?${qs}` : "/expenses", { scroll: false });
    loadExpenses();
  }, [status, filterParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPage(offset: number): Promise<ExpensesResponse> {
    const params = filterParams();
    params.set("offset", String(offset));
    params.set("limit", String(PAGE_SIZE));
    params.set("today", todayStr());
    const res = await fetch(`/api/expenses?${params}`);
    if (!res.ok) throw new Error();
    return res.json();
  }

  async function loadExpenses() {
    const id = ++requestId.current;
    setLoading(true);
    try {
      await flushPending();
      const d = await fetchPage(0);
      // Ignore stale responses when filters changed while this one was in flight
      if (id !== requestId.current) return;
      setExpenses(d.items);
      setSummary({ total: d.total, count: d.count });
      setLoadError("");
    } catch {
      if (id === requestId.current) setLoadError("Не удалось загрузить расходы. Обновите страницу.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function loadMore() {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      await flushPending();
      const d = await fetchPage(expenses.length);
      if (id !== requestId.current) return;
      setExpenses((list) => {
        const seen = new Set(list.map((e) => e.id));
        return [...list, ...d.items.filter((e) => !seen.has(e.id))];
      });
      setSummary({ total: d.total, count: d.count });
    } catch {
      setLoadError("Не удалось загрузить расходы. Обновите страницу.");
    } finally {
      setLoadingMore(false);
    }
  }

  // Hide right away, delete on the server after the undo window
  function deleteExpense(e: Expense) {
    flushPending();
    const index = expenses.findIndex((x) => x.id === e.id);
    setExpenses((list) => list.filter((x) => x.id !== e.id));
    setSummary((s) => ({ total: s.total - e.amount, count: s.count - 1 }));
    const timer = setTimeout(() => { flushPending(); }, UNDO_MS);
    pending.current = { expense: e, index, timer };
    setUndoItem(e);
  }

  function undoDelete() {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setUndoItem(null);
    setExpenses((list) => {
      const copy = [...list];
      copy.splice(Math.min(p.index, copy.length), 0, p.expense);
      return copy;
    });
    setSummary((s) => ({ total: s.total + p.expense.amount, count: s.count + 1 }));
  }

  if (status === "loading" || !session) return null;

  const isAdmin = session.user.role === "ADMIN";
  const hasFilters = !!(filterUser || filterCat || filterFrom || filterTo || search);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Расходы</h1>
          {summary.count > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {summary.count} записей · итого{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{fmt(summary.total)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/expenses/export?${filterParams()}`}
            download
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
            title="Скачать для Excel (CSV) с учётом фильтров"
          >
            <Download size={16} /> Excel
          </a>
          <button
            onClick={() => { setEditExpense(null); setShowModal(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={17} />
            Добавить расход
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-5">
        <label className={`col-span-2 flex items-center gap-2 sm:w-64 focus-within:border-indigo-500 transition-colors ${fieldCls}`}>
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по описанию"
            className="bg-transparent outline-none min-w-0 flex-1"
          />
        </label>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className={`w-full sm:w-auto ${fieldCls}`}
        >
          <option value="">Все участники</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className={`w-full sm:w-auto ${fieldCls}`}
        >
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500 transition-colors cursor-pointer">
          <span className="text-slate-500 dark:text-slate-500 font-semibold text-xs uppercase tracking-wider select-none whitespace-nowrap">С</span>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 text-sm outline-none min-w-0 flex-1"
          />
        </label>
        <label className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-indigo-500 transition-colors cursor-pointer">
          <span className="text-slate-500 dark:text-slate-500 font-semibold text-xs uppercase tracking-wider select-none whitespace-nowrap">По</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 text-sm outline-none min-w-0 flex-1"
          />
        </label>
        {hasFilters && (
          <button
            onClick={() => { setFilterUser(""); setFilterCat(""); setFilterFrom(""); setFilterTo(""); setSearch(""); }}
            className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {loadError && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
          {loadError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">Загрузка…</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 dark:text-slate-400">{hasFilters ? "Ничего не найдено" : "Расходов нет"}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Дата</th>
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Описание</th>
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Категория</th>
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Кто</th>
                    <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Сумма</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">{fmtDate(e.date)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-900 dark:text-slate-100 max-w-xs truncate">{e.description}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: e.category.color + "22", color: e.category.color }}
                        >
                          {e.category.icon} {e.category.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: e.user.color }}>
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ background: e.user.color }}
                          >
                            {e.user.name[0]}
                          </span>
                          {e.user.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(e.amount)}</td>
                      <td className="px-5 py-3.5">
                        {(isAdmin || e.userId === parseInt(session.user.id)) && (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditExpense(e); setShowModal(true); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteExpense(e)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
              {expenses.map((e) => (
                <div key={e.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: e.category.color + "22" }}
                      >
                        {e.category.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{e.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {fmtDate(e.date)} · <span style={{ color: e.user.color }}>{e.user.name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{fmt(e.amount)}</p>
                      {(isAdmin || e.userId === parseInt(session.user.id)) && (
                        <div className="flex gap-1 mt-1 justify-end">
                          <button
                            onClick={() => { setEditExpense(e); setShowModal(true); }}
                            className="text-slate-400 hover:text-indigo-500 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteExpense(e)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && expenses.length < summary.count && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 disabled:opacity-60 transition-colors"
          >
            {loadingMore ? "Загрузка…" : `Показать ещё (${summary.count - expenses.length})`}
          </button>
        </div>
      )}

      {undoItem && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:min-w-[320px] z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white shadow-2xl animate-pop-in">
          <span className="text-sm flex-1 min-w-0 truncate">Удалено: {undoItem.description}</span>
          <button onClick={undoDelete} className="text-sm font-bold text-indigo-300 hover:text-indigo-200 flex-shrink-0">
            Отменить
          </button>
          <button onClick={() => { flushPending(); }} className="text-slate-400 hover:text-white flex-shrink-0" aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
      )}

      {showModal && (
        <ExpenseModal
          expense={editExpense}
          categories={categories}
          users={users}
          currentUserId={parseInt(session.user.id)}
          isAdmin={isAdmin}
          onClose={() => { setShowModal(false); setEditExpense(null); }}
          onSave={loadExpenses}
        />
      )}
    </AppLayout>
  );
}
