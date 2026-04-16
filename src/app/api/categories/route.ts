export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = parseInt(session.user.householdId);
  const categories = await prisma.category.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.householdId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const householdId = parseInt(session.user.householdId);
  const { name, icon, color } = await req.json();
  if (!name) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });

  try {
    const cat = await prisma.category.create({
      data: { name: name.trim(), icon: icon || "💰", color: color || "#10b981", householdId },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Категория с таким именем уже существует" }, { status: 400 });
  }
}
