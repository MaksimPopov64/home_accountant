export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx, type HouseholdCtx } from "@/lib/session";
import { parseId } from "@/lib/parse";
import { parseExpenseInput } from "@/lib/expenseInput";

// Loads an expense the caller may modify: same household, and owner unless admin.
async function findEditable(ctx: HouseholdCtx, rawId: string) {
  const id = parseId(rawId);
  const expense = id ? await prisma.expense.findFirst({ where: { id, householdId: ctx.householdId } }) : null;
  if (!expense) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  if (!ctx.isAdmin && expense.userId !== ctx.userId) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  return expense;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const expense = await findEditable(ctx, params.id);
  if (expense instanceof NextResponse) return expense;

  const input = await parseExpenseInput(await req.json(), ctx, expense.userId);
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  const updated = await prisma.expense.update({
    where: { id: expense.id },
    data: input.data,
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

  const expense = await findEditable(ctx, params.id);
  if (expense instanceof NextResponse) return expense;

  await prisma.expense.delete({ where: { id: expense.id } });
  return new NextResponse(null, { status: 204 });
}
