export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { clientToday, dateFilter, monthRange, parseDateStr, toDateStr } from "@/lib/dates";
import { materializeRecurring } from "@/lib/recurring";

export async function GET(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const myOnly = searchParams.get("myOnly") === "true";
  // Client's local date: the server runs in UTC, the family doesn't
  const today = clientToday(searchParams);

  await materializeRecurring(ctx.householdId, today);

  const base: Prisma.ExpenseWhereInput = {
    householdId: ctx.householdId,
    ...(myOnly && { userId: ctx.userId }),
  };
  const where: Prisma.ExpenseWhereInput = { ...base, ...dateFilter(dateFrom, dateTo) };

  // Is the range exactly one calendar month? Then compare with the month before it.
  const now = parseDateStr(today);
  const from = dateFrom ? parseDateStr(dateFrom) : null;
  const month = from && monthRange(from.getFullYear(), from.getMonth());
  const isMonth = !!month && month.from === dateFrom && month.to === dateTo;
  const isCurrentMonth = isMonth && from!.getFullYear() === now.getFullYear() && from!.getMonth() === now.getMonth();

  let prevRange: { from: string; to: string; partial: boolean } | null = null;
  if (isMonth) {
    const prev = monthRange(from!.getFullYear(), from!.getMonth() - 1);
    if (isCurrentMonth) {
      // Month in progress: compare like with like, the 1st..today of the previous month
      const prevLast = parseDateStr(prev.to).getDate();
      const day = Math.min(now.getDate(), prevLast);
      prevRange = { from: prev.from, to: toDateStr(new Date(from!.getFullYear(), from!.getMonth() - 1, day)), partial: true };
    } else {
      prevRange = { ...prev, partial: false };
    }
  }

  // Aggregate in the database instead of loading every row
  const [catSums, userSums, categories, users, recentExpenses, prevAgg] = await Promise.all([
    prisma.expense.groupBy({ by: ["categoryId"], where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["userId"], where, _sum: { amount: true } }),
    prisma.category.findMany({ where: { householdId: ctx.householdId } }),
    prisma.user.findMany({ where: { householdId: ctx.householdId }, select: { id: true, name: true, color: true } }),
    prisma.expense.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, color: true } },
        category: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prevRange
      ? prisma.expense.aggregate({ where: { ...base, date: { gte: prevRange.from, lte: prevRange.to } }, _sum: { amount: true } })
      : null,
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const byCategory = catSums
    .flatMap((s) => {
      const c = catById.get(s.categoryId);
      return c
        ? [{ id: c.id, name: c.name, icon: c.icon, color: c.color, monthlyBudget: c.monthlyBudget, total: s._sum.amount ?? 0 }]
        : [];
    })
    .sort((a, b) => b.total - a.total);

  const userById = new Map(users.map((u) => [u.id, u]));
  const byUser = userSums
    .flatMap((s) => {
      const u = userById.get(s.userId);
      return u ? [{ name: u.name, color: u.color, total: s._sum.amount ?? 0 }] : [];
    })
    .sort((a, b) => b.total - a.total);

  const total = byCategory.reduce((s, c) => s + c.total, 0);

  const comparison = prevRange && prevAgg ? { ...prevRange, total: prevAgg._sum.amount ?? 0 } : undefined;

  // Prediction (only meaningful for the current calendar month)
  let prediction: { dailyRate: number; projected: number; daysLeft: number } | undefined;
  if (isCurrentMonth && total > 0) {
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyRate = total / dayOfMonth;
    const projected = Math.round(dailyRate * daysInMonth);
    const daysLeft = daysInMonth - dayOfMonth;
    prediction = { dailyRate: Math.round(dailyRate), projected, daysLeft };
  }

  return NextResponse.json({ total, byCategory, byUser, recentExpenses, prediction, comparison });
}
