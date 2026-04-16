export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = parseInt(session.user.householdId);
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { id: true, name: true, inviteCode: true, createdAt: true },
  });

  return NextResponse.json(household);
}

export async function POST(req: NextRequest) {
  const { action, name, inviteCode } = await req.json();

  if (action === "create") {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(session.user.id);

    const existing = await prisma.household.findFirst({
      where: { users: { some: { id: userId } } },
    });
    if (existing) {
      return NextResponse.json({ error: "Вы уже состоите в семье" }, { status: 400 });
    }

    const newCode = randomBytes(4).toString("hex");
    const household = await prisma.household.create({
      data: {
        name: name?.trim() || "Моя семья",
        inviteCode: newCode,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { householdId: household.id, role: "ADMIN" },
    });

    const defaultCategories = [
      { name: "Продукты", icon: "🛒", color: "#10b981" },
      { name: "Транспорт", icon: "🚗", color: "#3b82f6" },
      { name: "Кафе и рестораны", icon: "🍕", color: "#f59e0b" },
      { name: "Здоровье", icon: "💊", color: "#ef4444" },
      { name: "Развлечения", icon: "🎮", color: "#8b5cf6" },
      { name: "Одежда", icon: "👕", color: "#ec4899" },
      { name: "Коммунальные услуги", icon: "🏠", color: "#6b7280" },
      { name: "Прочее", icon: "📦", color: "#94a3b8" },
    ];

    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: { ...cat, householdId: household.id },
      });
    }

    return NextResponse.json(household, { status: 201 });
  }

  if (action === "join") {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!inviteCode) {
      return NextResponse.json({ error: "Введите код приглашения" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    const existing = await prisma.household.findFirst({
      where: { users: { some: { id: userId } } },
    });
    if (existing) {
      return NextResponse.json({ error: "Вы уже состоите в семье" }, { status: 400 });
    }

    const household = await prisma.household.findUnique({
      where: { inviteCode: inviteCode.trim().toLowerCase() },
    });
    if (!household) {
      return NextResponse.json({ error: "Неверный код приглашения" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { householdId: household.id },
    });

    return NextResponse.json(household);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}