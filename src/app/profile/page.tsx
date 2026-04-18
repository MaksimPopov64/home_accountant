"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, KeyRound, Palette } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#3b82f6", "#14b8a6",
];

const inputCls = "w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5";
const labelCls = "block text-sm text-slate-700 dark:text-slate-300 mb-1.5";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setColor(session.user.color || "#6366f1");
    }
  }, [status, session, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (password && password !== confirm) {
      setMsg({ text: "Пароли не совпадают", ok: false }); return;
    }
    setSaving(true); setMsg(null);
    const body: Record<string, string> = { name, email, color };
    if (password) body.password = password;
    try {
      const res = await fetch(`/api/users/${session!.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Ошибка"); }
      await update({ name, color });
      setPassword(""); setConfirm("");
      setMsg({ text: "Профиль обновлён", ok: true });
    } catch (err) {
      setMsg({ text: (err as Error).message, ok: false });
    } finally { setSaving(false); }
  }

  if (status === "loading" || !session) return null;

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Мой профиль</h1>

        {/* Avatar card */}
        <div className="flex items-center gap-4 mb-6 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{ background: color }}
          >
            {name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{name}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
              {session.user.role === "ADMIN" ? "Администратор" : "Участник"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {msg && (
            <div className={`px-4 py-2.5 rounded-xl text-sm border ${
              msg.ok
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400"
            }`}>
              {msg.text}
            </div>
          )}

          {/* Basic info */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Основное</h2>
            <div>
              <label className={labelCls}>Имя</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </div>
          </div>

          {/* Color */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={16} className="text-slate-500 dark:text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Цвет аватара</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-xl transition-all hover:scale-110"
                  style={{ background: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }}
                />
              ))}
            </div>
          </div>

          {/* Password */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-slate-500 dark:text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Сменить пароль</h2>
            </div>
            <div>
              <label className={labelCls}>Новый пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Оставьте пустым, если не меняете" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Повторите пароль</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Повторите новый пароль" className={inputCls} />
            </div>
          </div>

          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
          >
            <Save size={16} />
            {saving ? "Сохранение…" : "Сохранить изменения"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
