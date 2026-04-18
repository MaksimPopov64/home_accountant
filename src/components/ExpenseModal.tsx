"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Category, Expense, User } from "@/types";

interface Props {
  expense?: Expense | null;
  categories: Category[];
  users: User[];
  currentUserId: number;
  isAdmin: boolean;
  onClose: () => void;
  onSave: () => void;
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 transition-colors";
const labelCls = "block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5";

export default function ExpenseModal({
  expense, categories, users, currentUserId, isAdmin, onClose, onSave,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [categoryId, setCategoryId] = useState("");
  const [userId, setUserId] = useState(String(currentUserId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setDescription(expense.description);
      setDate(expense.date);
      setCategoryId(String(expense.categoryId));
      setUserId(String(expense.userId));
    } else {
      setAmount("");
      setDescription("");
      setDate(today);
      setCategoryId(categories[0] ? String(categories[0].id) : "");
      setUserId(String(currentUserId));
    }
  }, [expense, categories, currentUserId, today]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = { amount: parseFloat(amount), description, date, categoryId, userId };
      const url = expense ? `/api/expenses/${expense.id}` : "/api/expenses";
      const res = await fetch(url, {
        method: expense ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Ошибка"); }
      onSave();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {expense ? "Редактировать расход" : "Добавить расход"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Сумма (₽)</label>
            <input
              type="number" min="0.01" step="0.01" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)} required
              className={`${inputCls} text-lg font-bold`}
            />
          </div>

          <div>
            <label className={labelCls}>Описание</label>
            <input
              type="text" placeholder="Что куплено / за что оплачено"
              value={description} onChange={(e) => setDescription(e.target.value)} required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Дата</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Категория</label>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className={labelCls}>Кто платил</label>
              <select
                value={userId} onChange={(e) => setUserId(e.target.value)} required
                className={inputCls}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
            >
              {loading ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
