import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6",
];

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (existing) {
    return NextResponse.json({ error: "Email уже используется" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      color,
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(user, { status: 201 });
}
