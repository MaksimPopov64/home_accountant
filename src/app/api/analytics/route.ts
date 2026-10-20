export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { isDateStr, monthRange, parseDateStr } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const todayParam = new URL(req.url).searchParams.get("today");
  const now = isDateStr(todayParam) ? parseDateStr(todayParam) : new Date();

  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const from = monthRange(months[0].getFullYear(), months[0].getMonth()).from;
  const to = monthRange(now.getFullYear(), now.getMonth()).to;

  // One grouped query instead of six full scans
  const sums = await prisma.expense.groupBy({
    by: ["date"],
    where: { householdId: ctx.householdId, date: { gte: from, lte: to } },
    _sum: { amount: true },
  });

  const byMonth = new Map<string, number>();
  for (const s of sums) {
    const key = s.date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + (s._sum.amount ?? 0));
  }

  const trend = months.map((d) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = monthRange(year, month).from.slice(0, 7);
    return {
      month: d.toLocaleString("ru-RU", { month: "short" }),
      total: Math.round(byMonth.get(key) ?? 0),
      year,
      monthIndex: month,
    };
  });

  return NextResponse.json({ trend });
}
