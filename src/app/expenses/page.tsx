"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ExpenseModal from "@/components/ExpenseModal";
import type { Category, Expense, User } from "@/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterUser, setFilterUser] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/categories").then((r) => r.json()).then(setCategories);
      fetch("/api/users").then((r) => r.json()).then(setUsers);
      loadExpenses();
    }
  }, [status, filterUser, filterCat, filterFrom, filterTo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadExpenses() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterUser) params.set("userId", filterUser);
    if (filterCat)  params.set("categoryId", filterCat);
    if (filterFrom) params.set("dateFrom", filterFrom);
    if (filterTo)   params.set("dateTo", filterTo);
    const res = await fetch(`/api/expenses?${params}`);
    setExpenses(await res.json());
    setLoading(false);
  }

  async function deleteExpense(id: number) {
    if (!confirm("Удалить расход?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    loadExpenses();
  }

  const totalFiltered = expenses.reduce((s, e) => s + e.amount, 0);

  if (status === "loading" || !session) return null;

  const isAdmin = session.user.role === "ADMIN";

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Расходы</h1>
          {expenses.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {expenses.length} записей · итого{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{fmt(totalFiltered)}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => { setEditExpense(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={17} />
          Добавить расход
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-5">
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Все участники</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm"
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
        {(filterUser || filterCat || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterUser(""); setFilterCat(""); setFilterFrom(""); setFilterTo(""); }}
            className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">Загрузка…</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 dark:text-slate-400">Расходов нет</p>
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
                              onClick={() => deleteExpense(e.id)}
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
                            onClick={() => deleteExpense(e.id)}
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
