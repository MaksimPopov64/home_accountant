export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const trend = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      select: { amount: true },
    });

    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const monthName = d.toLocaleString("ru-RU", { month: "short" });

    trend.push({ month: monthName, total: Math.round(total), year, monthIndex: month });
  }

  return NextResponse.json({ trend });
}
