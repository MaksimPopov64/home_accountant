"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { writeLocal } from "@/lib/storage";

// Invite link target: /join?code=abc123. Remembers the code and sends the visitor to
// registration, which offers to join with it after sign-up or sign-in.
export default function JoinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")?.trim();
    if (code) writeLocal("pendingInvite", code);
    if (status === "loading") return;
    if (session?.user.householdId) setAlreadyMember(true);
    else router.replace("/register");
  }, [status, session, router]);

  if (!alreadyMember) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/30 mb-4">
          <Wallet size={26} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Вы уже состоите в семье</h1>
        <p className="text-slate-400 text-sm mb-6">
          Чтобы присоединиться к другой семье по приглашению, нужен отдельный аккаунт.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
        >
          На главную
        </button>
      </div>
    </div>
  );
}
