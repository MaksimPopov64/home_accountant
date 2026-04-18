export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.householdId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const householdId = parseInt(session.user.householdId);
  const { name, icon, color, monthlyBudget } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }

  // Ensure category belongs to this household
  const existing = await prisma.category.findFirst({
    where: { id: parseInt(params.id), householdId },
  });
  if (!existing) return NextResponse.json({ error: "Не найдена" }, { status: 404 });

  const cat = await prisma.category.update({
    where: { id: parseInt(params.id) },
    data: {
      name: String(name).trim(),
      icon,
      color,
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
    },
  });
  return NextResponse.json(cat);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.householdId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const householdId = parseInt(session.user.householdId);
  const existing = await prisma.category.findFirst({
    where: { id: parseInt(params.id), householdId },
  });
  if (!existing) return NextResponse.json({ error: "Не найдена" }, { status: 404 });

  await prisma.category.delete({ where: { id: parseInt(params.id) } });
  return new NextResponse(null, { status: 204 });
}
