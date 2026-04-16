export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.householdId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const householdId = parseInt(session.user.householdId);
  const users = await prisma.user.findMany({
    where: { householdId },
    select: { id: true, name: true, email: true, role: true, color: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.householdId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const householdId = parseInt(session.user.householdId);
  const { name, email, password, role, color } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hash,
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
        color: color || "#6366f1",
        householdId,
      },
      select: { id: true, name: true, email: true, role: true, color: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email уже используется" }, { status: 400 });
  }
}
