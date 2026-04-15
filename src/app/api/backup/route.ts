export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  try {
    const dbPath = join(process.cwd(), "prisma", "dev.db");
    const data = readFileSync(dbPath);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="backup_${date}.db"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл базы данных не найден" }, { status: 500 });
  }
}
