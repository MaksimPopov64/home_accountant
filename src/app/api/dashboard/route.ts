import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const myOnly = searchParams.get("myOnly") === "true";

  const where: Record<string, unknown> = {};
  if (myOnly) where.userId = parseInt(session.user.id);
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, string>).gte = dateFrom;
    if (dateTo) (where.date as Record<string, string>).lte = dateTo;
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, color: true } },
      category: true,
    },
    orderBy: [{ date: "desc" }],
    take: 1000,
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // By category
  const catMap = new Map<number, { name: string; icon: string; color: string; total: number }>();
  for (const e of expenses) {
    const existing = catMap.get(e.categoryId);
    if (existing) {
      existing.total += e.amount;
    } else {
      catMap.set(e.categoryId, { name: e.category.name, icon: e.category.icon, color: e.category.color, total: e.amount });
    }
  }
  const byCategory = [...catMap.values()].sort((a, b) => b.total - a.total);

  // By user
  const userMap = new Map<number, { name: string; color: string; total: number }>();
  for (const e of expenses) {
    const existing = userMap.get(e.userId);
    if (existing) {
      existing.total += e.amount;
    } else {
      userMap.set(e.userId, { name: e.user.name, color: e.user.color, total: e.amount });
    }
  }
  const byUser = [...userMap.values()].sort((a, b) => b.total - a.total);

  const recentExpenses = expenses.slice(0, 10);

  return NextResponse.json({ total, byCategory, byUser, recentExpenses });
}
