export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const categoryId = searchParams.get("categoryId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};

  // Members can only see all expenses (dashboard transparency) but filter by own
  if (userId) where.userId = parseInt(userId);
  if (categoryId) where.categoryId = parseInt(categoryId);
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) (where.date as Record<string, string>).gte = dateFrom;
    if (dateTo) (where.date as Record<string, string>).lte = dateTo;
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, color: true } },
      category: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { amount, description, date, categoryId, userId } = body;

  if (!amount || !description || !date || !categoryId || !userId) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Сумма должна быть больше 0" }, { status: 400 });
  }

  // Members can only add for themselves
  const targetUserId = session.user.role === "ADMIN" ? parseInt(userId) : parseInt(session.user.id);

  const expense = await prisma.expense.create({
    data: {
      amount: parsedAmount,
      description: String(description).trim(),
      date,
      userId: targetUserId,
      categoryId: parseInt(categoryId),
    },
    include: {
      user: { select: { id: true, name: true, color: true } },
      category: true,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
