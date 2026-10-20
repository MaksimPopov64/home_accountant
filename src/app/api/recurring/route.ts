export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { clientToday } from "@/lib/dates";
import { parseExpenseInput } from "@/lib/expenseInput";
import { materializeRecurring, occurrenceDate, prevMonthKey } from "@/lib/recurring";

const INCLUDE = {
  user: { select: { id: true, name: true, color: true } },
  category: true,
} as const;

export async function GET(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  await materializeRecurring(ctx.householdId, clientToday(new URL(req.url).searchParams));

  const rules = await prisma.recurringExpense.findMany({
    where: { householdId: ctx.householdId },
    include: INCLUDE,
    orderBy: [{ dayOfMonth: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const today = clientToday(new URL(req.url).searchParams);
  const dayOfMonth = Number(body.dayOfMonth);
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return NextResponse.json({ error: "День месяца — от 1 до 31" }, { status: 400 });
  }
  const input = await parseExpenseInput({ ...body, date: today }, ctx, ctx.userId);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  // Start from the next occurrence; this month's already-passed one only if asked for
  const currentMonth = today.slice(0, 7);
  const passed = occurrenceDate(currentMonth, dayOfMonth) <= today;
  const lastGenerated = passed && !body.includeCurrent ? currentMonth : prevMonthKey(today);

  const { date: _date, ...data } = input.data;
  const rule = await prisma.recurringExpense.create({
    data: { ...data, dayOfMonth, lastGenerated, householdId: ctx.householdId },
    include: INCLUDE,
  });
  await materializeRecurring(ctx.householdId, today);

  return NextResponse.json(rule, { status: 201 });
}
