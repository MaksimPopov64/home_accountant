export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHouseholdCtx } from "@/lib/session";
import { isUniqueViolation, parseBudget } from "@/lib/parse";

export async function GET() {
  const ctx = await getHouseholdCtx();
  if (ctx instanceof NextResponse) return ctx;

  const categories = await prisma.category.findMany({
    where: { householdId: ctx.householdId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const ctx = await getHouseholdCtx({ admin: true });
  if (ctx instanceof NextResponse) return ctx;

  const { name, icon, color, monthlyBudget } = await req.json();
  if (!name || !String(name).trim()) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });

  try {
    const cat = await prisma.category.create({
      data: {
        name: String(name).trim(),
        icon: icon || "💰",
        color: color || "#10b981",
        monthlyBudget: parseBudget(monthlyBudget),
        householdId: ctx.householdId,
      },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "Категория с таким именем уже существует" }, { status: 400 });
    }
    throw err;
  }
}
