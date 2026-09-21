// رحلة — "قصة الأمانة" (وضع الأطفال بس): عناصر مشتركة بين src/app/(app)/home/page.tsx
// و src/app/api/kids/honesty/route.ts و src/components/home/HomeDashboard.tsx.
// راجع رأس src/lib/kids-honesty-content.ts لسبب فصله تمامًا عن src/lib/habit-challenges.ts.

import { and, eq, type InferSelectModel } from "drizzle-orm";
import { db } from "@/db";
import { kidsHonestyReflections } from "@/db/schema";
import { todayDateOnly } from "@/lib/daily-log";

export type KidsHonestyReflection = InferSelectModel<typeof kidsHonestyReflections>;

export async function getTodayHonestyReflection(userId: string): Promise<KidsHonestyReflection | null> {
  const today = todayDateOnly();
  const [row] = await db
    .select()
    .from(kidsHonestyReflections)
    .where(and(eq(kidsHonestyReflections.userId, userId), eq(kidsHonestyReflections.date, today)))
    .limit(1);
  return row ?? null;
}

export async function setTodayHonestyReflection(
  userId: string,
  talkedToTrustedAdult: boolean
): Promise<KidsHonestyReflection> {
  const today = todayDateOnly();
  const [row] = await db
    .insert(kidsHonestyReflections)
    .values({ userId, date: today, talkedToTrustedAdult })
    .onConflictDoUpdate({
      target: [kidsHonestyReflections.userId, kidsHonestyReflections.date],
      set: { talkedToTrustedAdult },
    })
    .returning();
  return row;
}
