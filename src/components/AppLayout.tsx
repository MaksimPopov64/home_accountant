"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  List,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/",         icon: LayoutDashboard, label: "Обзор" },
  { href: "/expenses", icon: List,             label: "Расходы" },
  { href: "/profile",  icon: User,             label: "Профиль" },
];

const ADMIN_NAV = [
  { href: "/admin", icon: Settings, label: "Управление" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const allNav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <Wallet size={16} className="text-white" />
        </div>
        <span className="font-bold text-base text-slate-100">Семейный бюджет</span>
      </div>

      {/* User badge */}
      {session?.user && (
        <div className="mx-3 mt-4 px-3 py-2.5 rounded-xl bg-slate-700/50 border border-slate-700">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: session.user.color }}
            >
              {session.user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400">{isAdmin ? "Администратор" : "Участник"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-3 mt-4 space-y-0.5">
        {allNav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/60"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={17} />
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-slate-800/80 border-r border-slate-700 fixed top-0 left-0 bottom-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-64 bg-slate-800 border-r border-slate-700 flex flex-col animate-fade-in">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-56 min-h-screen">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700 sticky top-0 z-30 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Wallet size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm">Семейный бюджет</span>
          </div>
          <button onClick={() => setOpen(true)} className="text-slate-300 hover:text-white">
            <Menu size={22} />
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
