import { parseDateStr } from "./dates";

const moneyFmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

export const fmtMoney = (n: number) => moneyFmt.format(n);

export const fmtDate = (s: string, month: "short" | "long" = "short") =>
  parseDateStr(s).toLocaleDateString("ru-RU", { day: "2-digit", month });
