export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma, PUBLIC_USER } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { todayStr } from "@/lib/dates";

// JSON export of the admin's household (the database is Postgres, there is no file to copy)
export async function GET() {
  const ctx = await getHouseholdCtx({ admin: true });
  if (ctx instanceof NextResponse) return ctx;

  const where = { householdId: ctx.householdId };
  const [household, users, categories, expenses, recurring] = await Promise.all([
    prisma.household.findUnique({ where: { id: ctx.householdId }, select: { id: true, name: true, createdAt: true } }),
    prisma.user.findMany({ where, select: PUBLIC_USER }),
    prisma.category.findMany({ where }),
    prisma.expense.findMany({ where, orderBy: [{ date: "asc" }, { id: "asc" }] }),
    prisma.recurringExpense.findMany({ where }),
  ]);

  const body = JSON.stringify({ exportedAt: new Date().toISOString(), household, users, categories, expenses, recurring }, null, 2);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup_${todayStr()}.json"`,
    },
  });
}
