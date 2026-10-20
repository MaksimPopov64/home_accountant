export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx, type HouseholdCtx } from "@/lib/session";
import { isUniqueViolation, parseBudget, parseId } from "@/lib/parse";

async function findOwn(ctx: HouseholdCtx, rawId: string) {
  const id = parseId(rawId);
  const cat = id ? await prisma.category.findFirst({ where: { id, householdId: ctx.householdId } }) : null;
  return cat ?? NextResponse.json({ error: "Не найдена" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getHouseholdCtx({ admin: true });
  if (ctx instanceof NextResponse) return ctx;

  const { name, icon, color, monthlyBudget } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }

  const existing = await findOwn(ctx, params.id);
  if (existing instanceof NextResponse) return existing;

  try {
    const cat = await prisma.category.update({
      where: { id: existing.id },
      data: {
        name: String(name).trim(),
        icon: icon || undefined,
        color: color || undefined,
        monthlyBudget: parseBudget(monthlyBudget),
      },
    });
    return NextResponse.json(cat);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "Категория с таким именем уже существует" }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getHouseholdCtx({ admin: true });
  if (ctx instanceof NextResponse) return ctx;

  const existing = await findOwn(ctx, params.id);
  if (existing instanceof NextResponse) return existing;

  // Expense/RecurringExpense.category have no cascade: deleting a used category would fail with a FK error
  const [used, rules] = await Promise.all([
    prisma.expense.count({ where: { categoryId: existing.id } }),
    prisma.recurringExpense.count({ where: { categoryId: existing.id } }),
  ]);
  if (used > 0) {
    return NextResponse.json(
      { error: `В категории ${used} расход(ов). Сначала перенесите их в другую категорию.` },
      { status: 409 },
    );
  }
  if (rules > 0) {
    return NextResponse.json(
      { error: `Категория используется в регулярных расходах (${rules}). Сначала измените или удалите их.` },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id: existing.id } });
  return new NextResponse(null, { status: 204 });
}
