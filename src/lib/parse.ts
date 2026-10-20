export function parseId(s: string | null): number | null {
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseBudget(v: unknown): number | null {
  const n = parseFloat(String(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Prisma unique-constraint violation
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
