import { prisma } from "./prisma";

const pad = (n: number) => String(n).padStart(2, "0");

// Never back-fill more than this many months for a single rule in one pass
const MAX_MONTHS = 24;

function nextMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
}

export function prevMonthKey(today: string): string {
  const [y, m] = today.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

// Expense date for a rule in a given month; day 31 falls on the last day of shorter months
export function occurrenceDate(monthKey: string, dayOfMonth: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${monthKey}-${pad(Math.min(dayOfMonth, lastDay))}`;
}

// Creates the expenses that recurring rules owe up to `today` (YYYY-MM-DD).
// Idempotent and safe under concurrent requests: each rule's months are claimed by a
// conditional update on lastGenerated before any expense is inserted.
export async function materializeRecurring(householdId: number, today: string): Promise<void> {
  const currentMonth = today.slice(0, 7);
  const rules = await prisma.recurringExpense.findMany({
    where: { householdId, lastGenerated: { lt: currentMonth } },
  });

  for (const rule of rules) {
    const dates: string[] = [];
    let month = rule.lastGenerated;
    while (dates.length < MAX_MONTHS) {
      month = nextMonth(month);
      if (month > currentMonth) break;
      const date = occurrenceDate(month, rule.dayOfMonth);
      if (date > today) break;
      dates.push(date);
    }
    if (!dates.length) continue;

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.recurringExpense.updateMany({
        where: { id: rule.id, lastGenerated: rule.lastGenerated },
        data: { lastGenerated: dates[dates.length - 1].slice(0, 7) },
      });
      if (claimed.count === 0) return; // another request got here first
      await tx.expense.createMany({
        data: dates.map((date) => ({
          amount: rule.amount,
          description: rule.description,
          date,
          userId: rule.userId,
          categoryId: rule.categoryId,
          householdId,
        })),
      });
    });
  }
}
