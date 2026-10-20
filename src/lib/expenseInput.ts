import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { dateFilter, isDateStr } from "./dates";
import { parseId } from "./parse";
import type { HouseholdCtx } from "./session";

// List/export filters from the query string, always scoped to the caller's household
export function expenseFilter(ctx: HouseholdCtx, params: URLSearchParams): Prisma.ExpenseWhereInput {
  const userId = parseId(params.get("userId"));
  const categoryId = parseId(params.get("categoryId"));
  const q = params.get("q")?.trim();
  return {
    householdId: ctx.householdId,
    ...(userId && { userId }),
    ...(categoryId && { categoryId }),
    ...(q && { description: { contains: q, mode: "insensitive" as const } }),
    ...dateFilter(params.get("dateFrom"), params.get("dateTo")),
  };
}

interface ExpenseData {
  amount: number;
  description: string;
  date: string;
  categoryId: number;
  userId: number;
}

// Validates an expense create/update body. Category and payer must belong to the
// caller's household; only admins may record an expense for someone else.
export async function parseExpenseInput(
  body: Record<string, unknown>,
  ctx: HouseholdCtx,
  defaultUserId: number,
): Promise<{ data: ExpenseData } | { error: string }> {
  const amount = parseFloat(String(body.amount));
  const description = String(body.description ?? "").trim();
  const date = body.date;
  const categoryId = Number(body.categoryId);

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Сумма должна быть больше 0" };
  if (!description) return { error: "Описание обязательно" };
  if (!isDateStr(date)) return { error: "Некорректная дата" };
  if (!Number.isInteger(categoryId)) return { error: "Категория обязательна" };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId: ctx.householdId },
    select: { id: true },
  });
  if (!category) return { error: "Категория не найдена" };

  let userId = ctx.isAdmin ? defaultUserId : ctx.userId;
  if (ctx.isAdmin && body.userId !== undefined && body.userId !== "") {
    userId = Number(body.userId);
    const user = Number.isInteger(userId)
      ? await prisma.user.findFirst({ where: { id: userId, householdId: ctx.householdId }, select: { id: true } })
      : null;
    if (!user) return { error: "Участник не найден" };
  }

  return { data: { amount, description, date, categoryId, userId } };
}
