export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { isDateStr, todayStr } from "@/lib/dates";
import { expenseFilter } from "@/lib/expenseInput";

// Russian Excel: ";" separator, decimal comma, UTF-8 BOM so Cyrillic opens correctly
function cell(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: NextRequest) {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const expenses = await prisma.expense.findMany({
    where: expenseFilter(ctx, searchParams),
    include: { user: { select: { name: true } }, category: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const rows = [
    ["Дата", "Описание", "Категория", "Кто", "Сумма"],
    ...expenses.map((e) => [
      e.date.split("-").reverse().join("."),
      e.description,
      e.category.name,
      e.user.name,
      String(e.amount).replace(".", ","),
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";

  const from = searchParams.get("dateFrom");
  const to = searchParams.get("dateTo");
  const range = isDateStr(from) || isDateStr(to) ? `${from || "начало"}_${to || todayStr()}` : todayStr();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses_${range}.csv"; filename*=UTF-8''${encodeURIComponent(`расходы_${range}.csv`)}`,
    },
  });
}
