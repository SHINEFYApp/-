// رحلة — مساعد صغير لاستخراج التاريخ الهجري (أرقام لاتينية للمقارنة البرمجية)،
// باستخدام تقويم أم القرى المدمج في المتصفح/Node (Intl) — نفس التقويم المستخدم فعليًا
// في عرض التاريخ بشاشة اليوم (src/app/(app)/home/page.tsx)، بدون أي مكتبة خارجية.

export interface HijriDateParts {
  year: number;
  month: number; // ١-١٢ (٩ = رمضان)
  day: number;
}

export function getHijriDateParts(date: Date): HijriDateParts {
  const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export const RAMADAN_MONTH = 9;
