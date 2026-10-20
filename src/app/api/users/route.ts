export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, PUBLIC_USER } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { isUniqueViolation } from "@/lib/parse";

export async function GET() {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const users = await prisma.user.findMany({
    where: { householdId: ctx.householdId },
    select: PUBLIC_USER,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const ctx = await getHouseholdCtx({ admin: true });
  if (ctx instanceof NextResponse) return ctx;

  const { name, email, password, role, color } = await req.json();
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(password, 12),
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
        color: color || "#6366f1",
        householdId: ctx.householdId,
      },
      select: PUBLIC_USER,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ error: "Email уже используется" }, { status: 400 });
    throw err;
  }
}
