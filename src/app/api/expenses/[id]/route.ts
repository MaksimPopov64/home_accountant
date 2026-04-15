export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = parseInt(session.user.householdId);

  // findFirst ensures the expense belongs to this household
  const expense = await prisma.expense.findFirst({
    where: { id: parseInt(params.id), householdId },
  });
  if (!expense) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  // Only admin or owner can edit
  if (session.user.role !== "ADMIN" && expense.userId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { amount, description, date, categoryId } = await req.json();

  const parsedAmount = parseFloat(amount);
  const parsedCategoryId = parseInt(categoryId);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Сумма должна быть больше 0" }, { status: 400 });
  }
  if (!description || !String(description).trim()) {
    return NextResponse.json({ error: "Описание обязательно" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "Дата обязательна" }, { status: 400 });
  }
  if (!categoryId || isNaN(parsedCategoryId)) {
    return NextResponse.json({ error: "Категория обязательна" }, { status: 400 });
  }

  const updated = await prisma.expense.update({
    where: { id: parseInt(params.id) },
    data: {
      amount: parsedAmount,
      description: String(description).trim(),
      date,
      categoryId: parsedCategoryId,
    },
    include: {
      user: { select: { id: true, name: true, color: true } },
      category: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = parseInt(session.user.householdId);

  const expense = await prisma.expense.findFirst({
    where: { id: parseInt(params.id), householdId },
  });
  if (!expense) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  if (session.user.role !== "ADMIN" && expense.userId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id: parseInt(params.id) } });
  return new NextResponse(null, { status: 204 });
}
