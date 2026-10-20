export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { parseId } from "@/lib/parse";
import { dateFilter } from "@/lib/dates";
import { parseExpenseInput } from "@/lib/expenseInput";

const LIST_LIMIT = 300;

export async function GET(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const userId = parseId(searchParams.get("userId"));
  const categoryId = parseId(searchParams.get("categoryId"));

  const where: Prisma.ExpenseWhereInput = {
    householdId: ctx.householdId,
    ...(userId && { userId }),
    ...(categoryId && { categoryId }),
    ...dateFilter(searchParams.get("dateFrom"), searchParams.get("dateTo")),
  };

  // Totals come from an aggregate so they stay correct beyond the list limit
  const [items, agg] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, color: true } },
        category: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: LIST_LIMIT,
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
