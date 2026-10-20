export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma, PUBLIC_USER } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { isUniqueViolation, parseId } from "@/lib/parse";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = parseId(params.id);
  if (!targetId) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  const isSelf = parseInt(session.user.id) === targetId;
  const householdId = session.user.householdId ? parseInt(session.user.householdId) : null;
  const isAdmin = session.user.role === "ADMIN" && householdId !== null;

  // Admins may edit only members of their own household
  if (!isSelf) {
    if (!isAdmin) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    const target = await prisma.user.findFirst({ where: { id: targetId, householdId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  }

  const { name, email, password, role, color } = await req.json();
  const data: Record<string, unknown> = {};

  if (name?.trim()) data.name = name.trim();
  if (email?.trim()) data.email = email.toLowerCase().trim();
  if (color) data.color = color;
  if (password) {
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
    }
    data.password = await bcrypt.hash(password, 12);
  }
  if (isAdmin && role) {
    if (role !== "ADMIN" && role !== "MEMBER") {
      return NextResponse.json({ error: "Неверная роль" }, { status: 400 });
    }
    if (isSelf && role === "MEMBER") {
      const otherAdmins = await prisma.user.count({ where: { householdId, role: "ADMIN", id: { not: targetId } } });
      if (otherAdmins === 0) {
        return NextResponse.json({ error: "Нельзя снять права с единственного администратора" }, { status: 400 });
      }
    }
    data.role = role;
  }

  try {
    const user = await prisma.user.update({ where: { id: targetId }, data, select: PUBLIC_USER });
    return NextResponse.json(user);
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ error: "Email уже используется" }, { status: 400 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getHouseholdCtx({ admin: true });
  if (ctx instanceof NextResponse) return ctx;

  const targetId = parseId(params.id);
  if (targetId === ctx.userId) {
    return NextResponse.json({ error: "Нельзя удалить себя" }, { status: 400 });
  }

  const target = targetId
    ? await prisma.user.findFirst({ where: { id: targetId, householdId: ctx.householdId }, select: { id: true } })
    : null;
  if (!target) return NextResponse.json({ error: "Не найден" }, { status: 404 });

  await prisma.user.delete({ where: { id: target.id } });
  return new NextResponse(null, { status: 204 });
}
