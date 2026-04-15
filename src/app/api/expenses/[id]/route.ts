export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expense = await prisma.expense.findUnique({ where: { id: parseInt(params.id) } });
  if (!expense) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  // Only admin or owner can edit
  if (session.user.role !== "ADMIN" && expense.userId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { amount, description, date, categoryId } = await req.json();

  const updated = await prisma.expense.update({
    where: { id: parseInt(params.id) },
    data: {
      amount: parseFloat(amount),
      description: description.trim(),
      date,
      categoryId: parseInt(categoryId),
    },
    include: {
      user: { select: { id: true, name: true, color: true } },
      category: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expense = await prisma.expense.findUnique({ where: { id: parseInt(params.id) } });
  if (!expense) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  if (session.user.role !== "ADMIN" && expense.userId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id: parseInt(params.id) } });
  return new NextResponse(null, { status: 204 });
}
