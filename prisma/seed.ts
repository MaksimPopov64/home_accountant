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
  const existingHousehold = await prisma.household.findFirst();
  let householdId: number;

  if (existingHousehold) {
    householdId = existingHousehold.id;
    console.log("✅ Household already exists");
  } else {
    const inviteCode = randomBytes(4).toString("hex");
    const household = await prisma.household.create({
      data: { name: "Моя семья", inviteCode },
    });
    householdId = household.id;
    console.log(`✅ Household created: ${inviteCode}`);
  }

  const existingUsers = await prisma.user.findMany();
  const usersWithoutHousehold = existingUsers.filter(u => !u.householdId);
  for (const user of usersWithoutHousehold) {
    await prisma.user.update({ where: { id: user.id }, data: { householdId } });
  }
  if (usersWithoutHousehold.length > 0) {
    console.log(`✅ Assigned ${usersWithoutHousehold.length} users to household`);
  }

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_householdId: { name: cat.name, householdId } },
      update: {},
      create: { ...cat, householdId },
    });
  }

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
