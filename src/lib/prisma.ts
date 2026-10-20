import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// User fields safe to send to the client (never the password hash)
export const PUBLIC_USER = { id: true, name: true, email: true, role: true, color: true, createdAt: true } as const;
