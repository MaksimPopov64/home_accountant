export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { toDateStr } from "@/lib/dates";

// Frequent descriptions from the last year, each with the category it is usually filed under
export async function GET() {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const groups = await prisma.expense.groupBy({
    by: ["description", "categoryId"],
    where: { householdId: ctx.householdId, date: { gte: toDateStr(since) } },
    _count: { _all: true },
    orderBy: { _count: { description: "desc" } },
    take: 300,
  });

  // Groups are sorted by frequency, so the first category seen for a description wins
  const seen = new Set<string>();
  const result: { description: string; categoryId: number }[] = [];
  for (const g of groups) {
    const key = g.description.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ description: g.description, categoryId: g.categoryId });
    if (result.length >= 150) break;
  }

  return NextResponse.json(result);
}
