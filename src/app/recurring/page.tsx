"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import RecurringModal from "@/components/RecurringModal";
import type { Category, RecurringExpense, User } from "@/types";
import { todayStr } from "@/lib/dates";
import { fmtMoney as fmt } from "@/lib/format";

export default function RecurringPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rules, setRules] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editRule, setEditRule] = useState<RecurringExpense | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])).then(setCategories);
    fetch("/api/users").then((r) => (r.ok ? r.json() : [])).then(setUsers);
    loadRules();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch(`/api/recurring?today=${todayStr()}`);
      if (!res.ok) throw new Error();
      setRules(await res.json());
      setLoadError("");
    } catch {
      setLoadError("Не удалось загрузить регулярные расходы. Обновите страницу.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(r: RecurringExpense) {
    if (!confirm(`Больше не создавать «${r.description}» каждый месяц? Уже внесённые расходы останутся.`)) return;
    const res = await fetch(`/api/recurring/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Не удалось удалить");
    }
    loadRules();
  }

  if (status === "loading" || !session) return null;

  const isAdmin = session.user.role === "ADMIN";
  const monthlyTotal = rules.reduce((s, r) => s + r.amount, 0);

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Регулярные расходы</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Создаются автоматически каждый месяц в указанное число
            {rules.length > 0 && <> · всего <span className="font-semibold text-slate-800 dark:text-slate-200">{fmt(monthlyTotal)}</span> в месяц</>}
          </p>
        </div>
        <button
          onClick={() => { setEditRule(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={17} />
          Добавить
        </button>
      </div>

      {loadError && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">Загрузка…</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <Repeat size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">Нет регулярных расходов</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Коммуналка, интернет, подписки — добавьте один раз</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => {
            const canEdit = isAdmin || r.userId === parseInt(session.user.id);
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: r.category.color + "22" }}
                >
                  {r.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    каждое {r.dayOfMonth}-е · {r.category.name} ·{" "}
                    <span style={{ color: r.user.color }}>{r.user.name}</span>
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex-shrink-0">{fmt(r.amount)}</span>
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditRule(r); setShowModal(true); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                      aria-label="Редактировать"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteRule(r)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      aria-label="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <RecurringModal
          rule={editRule}
          categories={categories}
          users={users}
          currentUserId={parseInt(session.user.id)}
          isAdmin={isAdmin}
          onClose={() => { setShowModal(false); setEditRule(null); }}
          onSave={loadRules}
        />
      )}
    </AppLayout>
  );
}
