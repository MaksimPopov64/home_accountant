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

// First and last day of a calendar month (month is 0-based, may overflow).
export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: toDateStr(new Date(year, month, 1)),
    to: toDateStr(new Date(year, month + 1, 0)),
  };
}
