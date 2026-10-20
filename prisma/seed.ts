import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "Продукты",           icon: "🛒", color: "#10b981" },
  { name: "Транспорт",          icon: "🚗", color: "#3b82f6" },
  { name: "Кафе и рестораны",   icon: "🍕", color: "#f59e0b" },
  { name: "Здоровье",           icon: "💊", color: "#ef4444" },
  { name: "Развлечения",        icon: "🎮", color: "#8b5cf6" },
  { name: "Одежда",             icon: "👕", color: "#ec4899" },
  { name: "Коммунальные услуги",icon: "🏠", color: "#6b7280" },
  { name: "Прочее",             icon: "📦", color: "#94a3b8" },
];

async function main() {
  // Seed only an empty database. Re-running against live data used to move every
  // user without a household into the first household and resurrect deleted categories.
  if (await prisma.household.count()) {
    console.log("✅ Database already has data, nothing to seed");
    return;
  }

  const inviteCode = randomBytes(4).toString("hex");
  const household = await prisma.household.create({
    data: { name: "Моя семья", inviteCode },
  });
  const householdId = household.id;
  console.log(`✅ Household created: ${inviteCode}`);

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({ ...cat, householdId })),
    skipDuplicates: true,
  });

  const adminExists = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminExists) {
    const hash = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        name: "Администратор",
        email: "admin@family.local",
        password: hash,
        role: "ADMIN",
        color: "#6366f1",
        householdId,
      },
    });
    console.log("✅ Admin created: admin@family.local / admin123");
    console.log("   ⚠️  Change the password in Profile settings!");
  }

  console.log("✅ Database seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
