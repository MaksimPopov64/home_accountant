export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx, type HouseholdCtx } from "@/lib/session";
import { parseId } from "@/lib/parse";
import { todayStr } from "@/lib/dates";
import { parseExpenseInput } from "@/lib/expenseInput";

// Same household, and owner unless admin
async function findEditable(ctx: HouseholdCtx, rawId: string) {
  const id = parseId(rawId);
  const rule = id ? await prisma.recurringExpense.findFirst({ where: { id, householdId: ctx.householdId } }) : null;
  if (!rule) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  if (!ctx.isAdmin && rule.userId !== ctx.userId) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  return rule;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const rule = await findEditable(ctx, params.id);
  if (rule instanceof NextResponse) return rule;

  const body = await req.json();
  const dayOfMonth = Number(body.dayOfMonth);
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return NextResponse.json({ error: "День месяца — от 1 до 31" }, { status: 400 });
  }
  const input = await parseExpenseInput({ ...body, date: todayStr() }, ctx, rule.userId);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  // Already created expenses stay as they are; changes apply from the next occurrence
  const { date: _date, ...data } = input.data;
  const updated = await prisma.recurringExpense.update({
    where: { id: rule.id },
    data: { ...data, dayOfMonth },
    include: {
      user: { select: { id: true, name: true, color: true } },
      category: true,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const rule = await findEditable(ctx, params.id);
  if (rule instanceof NextResponse) return rule;

  await prisma.recurringExpense.delete({ where: { id: rule.id } });
  return new NextResponse(null, { status: 204 });
}
