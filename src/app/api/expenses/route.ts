export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { clientToday } from "@/lib/dates";
import { expenseFilter, parseExpenseInput } from "@/lib/expenseInput";
import { materializeRecurring } from "@/lib/recurring";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 300;

export async function GET(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  await materializeRecurring(ctx.householdId, clientToday(searchParams));

  const where = expenseFilter(ctx, searchParams);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "") || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? "") || DEFAULT_LIMIT));

  // Totals come from an aggregate so they cover every match, not just this page
  const [items, agg] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, color: true } },
        category: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
  ]);

  return NextResponse.json({ items, total: agg._sum.amount ?? 0, count: agg._count });
}

export async function POST(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const input = await parseExpenseInput(await req.json(), ctx, ctx.userId);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  const expense = await prisma.expense.create({
    data: { ...input.data, householdId: ctx.householdId },
    include: {
      user: { select: { id: true, name: true, color: true } },
      category: true,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
