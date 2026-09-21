// رحلة — "تحدي كسر العادة": عناصر مشتركة بين src/app/(app)/challenges/page.tsx
// و src/app/api/challenges/*/route.ts و src/components/challenges/*.
//
// كل الدوال هنا auth-scoped (بتاخد userId صريح وبترجع/تعدّل بياناته هو بس — راجع
// "المبادئ غير القابلة للتفاوض" رقم ٥)، ومنفصلة تمامًا عن src/lib/kids-honesty.ts
// (وضع الأطفال له مساره الخاص بالكامل — راجع رأس src/lib/habit-challenge-content.ts).

import { and, eq, gte, type InferSelectModel } from "drizzle-orm";
import { db } from "@/db";
import { habitChallengeEnrollments, habitChallengeLogs } from "@/db/schema";
import { daysAgoDateOnly, todayDateOnly } from "@/lib/daily-log";
import { isHabitChallengeTrackKey, type HabitVersionLevel } from "@/lib/habit-challenge-content";

export type HabitChallengeEnrollment = InferSelectModel<typeof habitChallengeEnrollments>;
export type HabitChallengeLog = InferSelectModel<typeof habitChallengeLogs>;

export const HABIT_VERSION_LEVELS = ["tiny", "normal", "ideal"] as const;
export const HABIT_ENROLLMENT_STATUSES = ["active", "paused", "completed"] as const;
export type HabitEnrollmentStatus = (typeof HABIT_ENROLLMENT_STATUSES)[number];

export function isHabitVersionLevel(v: unknown): v is HabitVersionLevel {
  return typeof v === "string" && (HABIT_VERSION_LEVELS as readonly string[]).includes(v);
}

export function isHabitEnrollmentStatus(v: unknown): v is HabitEnrollmentStatus {
  return typeof v === "string" && (HABIT_ENROLLMENT_STATUSES as readonly string[]).includes(v);
}

export async function getUserEnrollments(userId: string): Promise<HabitChallengeEnrollment[]> {
  return db
    .select()
    .from(habitChallengeEnrollments)
    .where(eq(habitChallengeEnrollments.userId, userId));
}

/** تسجيل/تحديث مسار — upsert بمفتاح (userId, trackKey) بالاعتماد على uniqueIndex في السكيما. */
export async function upsertEnrollment(
  userId: string,
  trackKey: string,
  versionLevel: HabitVersionLevel = "tiny"
): Promise<HabitChallengeEnrollment> {
  const [row] = await db
    .insert(habitChallengeEnrollments)
    .values({ userId, trackKey, versionLevel, status: "active" })
    .onConflictDoUpdate({
      target: [habitChallengeEnrollments.userId, habitChallengeEnrollments.trackKey],
      set: { versionLevel, status: "active", updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function updateEnrollment(
  userId: string,
  trackKey: string,
  patch: { versionLevel?: HabitVersionLevel; status?: HabitEnrollmentStatus }
): Promise<HabitChallengeEnrollment | undefined> {
  const [row] = await db
    .update(habitChallengeEnrollments)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(eq(habitChallengeEnrollments.userId, userId), eq(habitChallengeEnrollments.trackKey, trackKey))
    )
    .returning();
  return row;
}

/** تسجيل يوم النهارده لمسار معيّن — upsert بمفتاح (userId, trackKey, date). */
export async function upsertTodayLog(
  userId: string,
  trackKey: string,
  kept: boolean,
  note?: string | null
): Promise<HabitChallengeLog> {
  const today = todayDateOnly();
  const [row] = await db
    .insert(habitChallengeLogs)
    .values({ userId, trackKey, date: today, kept, note: note ?? null })
    .onConflictDoUpdate({
      target: [habitChallengeLogs.userId, habitChallengeLogs.trackKey, habitChallengeLogs.date],
      set: { kept, note: note ?? null },
    })
    .returning();
  return row;
}

/** آخر ٧ أيام من سجلات المسارات كلها بتاعة المستخدم — لعرض نمط كيفي بسيط، مش سكور. */
export async function getRecentLogs(userId: string, daysBack = 6): Promise<HabitChallengeLog[]> {
  return db
    .select()
    .from(habitChallengeLogs)
    .where(and(eq(habitChallengeLogs.userId, userId), gte(habitChallengeLogs.date, daysAgoDateOnly(daysBack))));
}

export { isHabitChallengeTrackKey };
