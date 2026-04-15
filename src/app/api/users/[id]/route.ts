import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = parseInt(params.id);
  const isSelf = parseInt(session.user.id) === targetId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { name, email, password, role, color } = await req.json();
  const data: Record<string, unknown> = {};

  if (name) data.name = name.trim();
  if (email) data.email = email.toLowerCase().trim();
  if (color) data.color = color;
  if (password) data.password = await bcrypt.hash(password, 12);
  if (isAdmin && role) data.role = role;

  const user = await prisma.user.update({
    where: { id: targetId },
    data,
    select: { id: true, name: true, email: true, role: true, color: true, createdAt: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const targetId = parseInt(params.id);
  if (parseInt(session.user.id) === targetId) {
    return NextResponse.json({ error: "Нельзя удалить себя" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: targetId } });
  return new NextResponse(null, { status: 204 });
}
