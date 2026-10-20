// Format a Date as YYYY-MM-DD in local time.
// Never use toISOString() for this: it converts to UTC and shifts the date
// back a day for positive timezones (e.g. 1 Oct 00:00 MSK -> "2026-09-30").
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

// Parse YYYY-MM-DD as local midnight (new Date("YYYY-MM-DD") would be UTC midnight).
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isDateStr(s: unknown): s is string {
  // Round-trip rejects impossible dates like 2026-02-31
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toDateStr(parseDateStr(s)) === s;
}

// First and last day of a calendar month (month is 0-based, may overflow).
export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: toDateStr(new Date(year, month, 1)),
    to: toDateStr(new Date(year, month + 1, 0)),
  };
}

// Prisma `where` fragment for an inclusive date range; invalid bounds are ignored.
export function dateFilter(from: string | null, to: string | null) {
  const date: { gte?: string; lte?: string } = {};
  if (isDateStr(from)) date.gte = from;
  if (isDateStr(to)) date.lte = to;
  return Object.keys(date).length ? { date } : {};
}
