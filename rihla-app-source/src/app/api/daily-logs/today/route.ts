import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import {
  buildTogglePatch,
  getOrCreateTodayLog,
  isDailyLogToggleKey,
  todayDateOnly,
} from "@/lib/daily-log";
import { getCurrentUserId } from "@/lib/auth-user";

// GET: يرجّع سجل اليوم للمستخدم الحالي، وينشئه بقيم افتراضية (false) لو أول تفاعل النهاردة.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const log = await getOrCreateTodayLog(userId);
  return NextResponse.json({ log });
}

// PATCH: بيبدّل قيمة حقل واحد بس (toggle) من سجل اليوم — بعد التحقق إنه من الحقول
// المسموح بيها، وبعد تقييد الاستعلام بـ userId + date=اليوم عشان مستخدم متلمسش سجل غيره
// (راجع المبدأ الخامس غير القابل للتفاوض).
export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const key = (body as { key?: unknown } | null)?.key;
  if (!isDailyLogToggleKey(key)) {
    return NextResponse.json({ error: "حقل غير مسموح به" }, { status: 400 });
  }

  // نضمن وجود سجل اليوم أولًا (المستخدم ممكن يفتح الشاشة ويضغط توجل قبل أي GET صريح)
  const current = await getOrCreateTodayLog(userId);
  const today = todayDateOnly();
  const patch = buildTogglePatch(key, !current[key]);

  const [updated] = await db
    .update(dailyLogs)
    .set(patch)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, today)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "تعذّر تحديث سجل اليوم" }, { status: 500 });
  }

  return NextResponse.json({ log: updated });
}
