"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wallet, LogIn, Plus, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      const hId = session?.user?.householdId;
      if (hId && hId !== "undefined" && hId !== "null") {
        router.push("/");
      }
    }
  }, [status, session, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: householdName }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", inviteCode }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const hasHousehold = session?.user?.householdId && session.user.householdId !== "null" && session.user.householdId !== "undefined";
  if (status === "authenticated" && hasHousehold) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-pop-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/30 mb-4">
            <Wallet size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Добро пожаловать!</h1>
          <p className="text-slate-400 text-sm mt-1">Создайте или присоединитесь к семье</p>
        </div>

        {mode === "select" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full flex items-center gap-4 p-5 bg-slate-800 border border-slate-700 rounded-2xl hover:border-indigo-500/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Plus size={22} className="text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-100">Создать семью</p>
                <p className="text-sm text-slate-400">Новая семья с уникальным кодом</p>
              </div>
              <ArrowRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>

            <button
              onClick={() => setMode("join")}
              className="w-full flex items-center gap-4 p-5 bg-slate-800 border border-slate-700 rounded-2xl hover:border-indigo-500/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <LogIn size={22} className="text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-100">Присоединиться</p>
                <p className="text-sm text-slate-400">По коду приглашения</p>
              </div>
              <ArrowRight size={18} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </button>

            <a
              href="/"
              className="block text-center text-sm text-slate-500 mt-6 hover:text-slate-300 transition-colors"
            >
              Пропустить
            </a>
          </div>
        )}

        {mode === "create" && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <button
              onClick={() => setMode("select")}
              className="text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
            >
              ← Назад
            </button>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Название семьи
                </label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Моя семья"
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/20 mt-2"
              >
                {loading ? "Создание…" : "Создать семью"}
              </button>
            </form>
          </div>
        )}

        {mode === "join" && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <button
              onClick={() => setMode("select")}
              className="text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
            >
              ← Назад
            </button>
            <form onSubmit={handleJoin} className="space-y-4">
              {error && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Код приглашения
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toLowerCase())}
                  placeholder="a1b2c3d4"
                  required
                  className="w-full bg-slate-900/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5 font-mono transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/20 mt-2"
              >
                {loading ? "Подключение…" : "Присоединиться"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}