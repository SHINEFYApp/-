// رحلة — لوحة "اليوم" (Agent 2): عناصر مشتركة بين src/app/(app)/home/page.tsx
// و src/app/api/daily-logs/today/route.ts و مكوّنات src/components/home/*.
//
// كل الدوال هنا auth-scoped بمعنى إنها بتاخد userId صريح وبترجع/تعدّل بياناته هو بس
// (راجع "المبادئ غير القابلة للتفاوض" رقم ٥ في تعليمات المهمة).

import { and, eq, type InferSelectModel } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";

export type DailyLog = InferSelectModel<typeof dailyLogs>;

// الحقول المنطقية القابلة للتبديل في سجل اليوم — بنفس ترتيب أعمدة dailyLogs في src/db/schema.ts
export const DAILY_LOG_TOGGLE_KEYS = [
  "badDayMode",
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "quran",
  "adhkarMorning",
  "adhkarEvening",
  "sadaqah",
  "habitSleep",
  "habitWalk",
  "habitScreen",
] as const;

export type DailyLogToggleKey = (typeof DAILY_LOG_TOGGLE_KEYS)[number];

export function isDailyLogToggleKey(key: unknown): key is DailyLogToggleKey {
  return (
    typeof key === "string" &&
    (DAILY_LOG_TOGGLE_KEYS as readonly string[]).includes(key)
  );
}

// الثوابت التعبدية التسعة اللي عليها بيتحسب "نور الاستمرارية" — منفصلة عمدًا عن
// عادات الدعم الثلاثة (النوم/المشي/الشاشة) لأنها مش عبادة، وأصلًا المقارنة التنافسية
// ممنوعة على العبادات (راجع المبدأ الرابع: المؤشر كيفي لا رقمي تنافسي).
export const WORSHIP_TRACK_KEYS = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "quran",
  "adhkarMorning",
  "adhkarEvening",
  "sadaqah",
] as const satisfies readonly DailyLogToggleKey[];

type WorshipTrackKey = (typeof WORSHIP_TRACK_KEYS)[number];

/**
 * تعديل حقل واحد بأمان من ناحية الأنواع (بدل استخدام مفتاح ديناميكي مباشرة في .set()).
 * القيمة اتحققنا منها فعليًا إنها من DAILY_LOG_TOGGLE_KEYS قبل الوصول هنا.
 */
export function buildTogglePatch(
  key: DailyLogToggleKey,
  value: boolean
): Partial<Record<DailyLogToggleKey, boolean>> {
  switch (key) {
    case "badDayMode":
      return { badDayMode: value };
    case "fajr":
      return { fajr: value };
    case "dhuhr":
      return { dhuhr: value };
    case "asr":
      return { asr: value };
    case "maghrib":
      return { maghrib: value };
    case "isha":
      return { isha: value };
    case "quran":
      return { quran: value };
    case "adhkarMorning":
      return { adhkarMorning: value };
    case "adhkarEvening":
      return { adhkarEvening: value };
    case "sadaqah":
      return { sadaqah: value };
    case "habitSleep":
      return { habitSleep: value };
    case "habitWalk":
      return { habitWalk: value };
    case "habitScreen":
      return { habitScreen: value };
  }
}

/**
 * "تاريخ اليوم" بدون وقت، بتوقيت السيرفر — مبني بـ UTC عمدًا عشان يطابق تمامًا
 * القيمة اللي هيخزّنها عمود dailyLogs.date (Drizzle's PgDate.mapToDriverValue بيعمل
 * value.toISOString())، وبرضو عشان أي عرض لاحق للتاريخ (Intl.DateTimeFormat مع
 * timeZone: "UTC") يطابق نفس اليوم التقويمي بالظبط بغض النظر عن فرق توقيت السيرفر.
 */
export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function daysAgoDateOnly(daysAgo: number): Date {
  const d = todayDateOnly();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

export function dateOnlyKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** يرجّع سجل اليوم للمستخدم، وينشئه بقيم افتراضية (false) لو أول مرة النهاردة. */
export async function getOrCreateTodayLog(userId: string): Promise<DailyLog> {
  const today = todayDateOnly();

  const [existing] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, today)))
    .limit(1);
  if (existing) return existing;

  const inserted = await db
    .insert(dailyLogs)
    .values({ userId, date: today })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  // احتمال نادر لسباق تزامن (طلبين جايين مع بعض أول ما اليوم يبدأ) — إعادة قراءة بعد onConflictDoNothing
  const [row] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, today)))
    .limit(1);
  if (!row) throw new Error("تعذّر إنشاء أو إيجاد سجل اليوم");
  return row;
}

// ── نور الاستمرارية ─────────────────────────────────────────────────────────
// مؤشر أسبوعي كيفي بحت (راجع المبدأ الرابع: ممنوع أي سكور رقمي تنافسي على العبادات).
// بيتحسب من نسبة الثوابت التعبدية المكتملة عبر آخر ٧ أيام، لكن بيتحوّل فورًا لكلمة/درجة
// توهّج، مش رقم أو نسبة مئوية بتتعرض للمستخدم.

const WEEKDAY_LETTERS: Record<number, string> = {
  0: "ح", // الأحد
  1: "ن", // الاثنين
  2: "ث", // الثلاثاء
  3: "ر", // الأربعاء
  4: "خ", // الخميس
  5: "ج", // الجمعة
  6: "س", // السبت
};

export interface ContinuityDay {
  dateKey: string;
  dayLetter: string;
  lit: boolean;
  isToday: boolean;
}

export type ContinuityBand = "starting" | "gentle" | "improving" | "steady";

export interface ContinuityResult {
  days: ContinuityDay[];
  band: ContinuityBand;
  label: string;
}

export function computeContinuity(weekLogs: DailyLog[]): ContinuityResult {
  const byDate = new Map(weekLogs.map((log) => [dateOnlyKey(log.date), log]));
  const todayKey = dateOnlyKey(todayDateOnly());

  const days: ContinuityDay[] = [];
  let totalFraction = 0;

  for (let i = 6; i >= 0; i--) {
    const d = daysAgoDateOnly(i);
    const key = dateOnlyKey(d);
    const log = byDate.get(key);
    const completedCount = log
      ? WORSHIP_TRACK_KEYS.filter((k: WorshipTrackKey) => log[k]).length
      : 0;
    const fraction = completedCount / WORSHIP_TRACK_KEYS.length;
    totalFraction += fraction;

    days.push({
      dateKey: key,
      dayLetter: WEEKDAY_LETTERS[d.getUTCDay()],
      lit: fraction >= 0.5,
      isToday: key === todayKey,
    });
  }

  const weeklyAvg = totalFraction / 7;
  let band: ContinuityBand;
  let label: string;
  if (weeklyAvg <= 0) {
    band = "starting";
    label = "لسه في أول الطريق — كل خطوة بتفرق، خطوة خطوة";
  } else if (weeklyAvg < 0.45) {
    band = "gentle";
    label = "محتاج شوية رفق بنفسك — النسخة الدنيا كفاية في الأيام الصعبة";
  } else if (weeklyAvg < 0.75) {
    band = "improving";
    label = "في تحسّن — كمّل بنفس الإيقاع";
  } else {
    band = "steady";
    label = "مستمر بحمد الله — استمر بنفس الإيقاع، مش أسرع";
  }

  return { days, band, label };
}
