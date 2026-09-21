// GET: بيتأكد إن صفوف dhikrCounts بتاعة "مجموعة اليوم" (تدوير من DHIKR_ROTATION) موجودة
//      للمستخدم الحالي — بينشئها بـ count=0 / target=defaultTarget لو ناقصة، وبيرجعها.
// PATCH: بيزوّد تكرار ذكر واحد بمقدار ١ (أو يصفّره) — مقيّد بالمستخدم الحالي، ومفيش نزول
//        تحت الصفر، ومفيش تخطي للـ target (نفس روح "مفيش عدّاد بينقص لو نسيت يوم").
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { dhikrCounts } from "@/db/schema";
import { DHIKR_LIBRARY, DHIKR_ROTATION, type DhikrKey } from "@/lib/worship-content";
import { getCurrentUserId } from "@/lib/auth-user";

// نفس عدد البطاقات المعروضة في نموذج الواجهة المعتمد (Dhikr.dc.html: showCount = 6)
const DAILY_SHOW_COUNT = 6;

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}

/**
 * مجموعة أذكار اليوم — تدوير حسب رقم اليوم في السنة (dayOfYear % DHIKR_ROTATION.length)
 * زي ما موضّح في تعليق DHIKR_ROTATION بملف worship-content.ts، من غير أي تعديل في المحتوى.
 */
function todaysRotation(): DhikrKey[] {
  const n = DHIKR_ROTATION.length;
  const start = dayOfYear(todayUTC()) % n;
  const keys: DhikrKey[] = [];
  for (let i = 0; i < DAILY_SHOW_COUNT; i++) {
    keys.push(DHIKR_ROTATION[(start + i) % n]);
  }
  return keys;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = todayUTC();
  const keys = todaysRotation();

  const existing = await db
    .select()
    .from(dhikrCounts)
    .where(
      and(eq(dhikrCounts.userId, userId), eq(dhikrCounts.date, date), inArray(dhikrCounts.key, keys))
    );

  const byKey = new Map(existing.map((row) => [row.key as DhikrKey, row]));
  const missing = keys.filter((k) => !byKey.has(k));

  if (missing.length > 0) {
    const inserted = await db
      .insert(dhikrCounts)
      .values(
        missing.map((key) => ({
          userId,
          date,
          key,
          count: 0,
          target: DHIKR_LIBRARY[key].defaultTarget,
        }))
      )
      .onConflictDoNothing()
      .returning();

    for (const row of inserted) byKey.set(row.key as DhikrKey, row);

    // سباق نادر: لو صف اتعمل في نفس اللحظة من طلب تاني، onConflictDoNothing مش هيرجّعه —
    // نجيبه بالقراءة بدل ما نسيبه ناقص من الاستجابة.
    const stillMissing = missing.filter((k) => !byKey.has(k));
    if (stillMissing.length > 0) {
      const refetched = await db
        .select()
        .from(dhikrCounts)
        .where(
          and(
            eq(dhikrCounts.userId, userId),
            eq(dhikrCounts.date, date),
            inArray(dhikrCounts.key, stillMissing)
          )
        );
      for (const row of refetched) byKey.set(row.key as DhikrKey, row);
    }
  }

  const items = keys
    .filter((key) => byKey.has(key))
    .map((key) => {
      const row = byKey.get(key)!;
      return { key, count: row.count, target: row.target };
    });

  return NextResponse.json({ items });
}

interface PatchBody {
  key?: string;
  action?: "increment" | "reset";
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = (await request.json().catch(() => null)) as PatchBody | null;
  const key = data?.key as DhikrKey | undefined;
  const action = data?.action === "reset" ? "reset" : "increment";

  if (!key || !(key in DHIKR_LIBRARY)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }

  const date = todayUTC();

  const [row] = await db
    .select()
    .from(dhikrCounts)
    .where(and(eq(dhikrCounts.userId, userId), eq(dhikrCounts.date, date), eq(dhikrCounts.key, key)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not found — call GET /api/dhikr/today أولًا" }, { status: 404 });
  }

  const nextCount = action === "reset" ? 0 : Math.min(row.count + 1, row.target);

  const [updated] = await db
    .update(dhikrCounts)
    .set({ count: nextCount })
    .where(and(eq(dhikrCounts.id, row.id), eq(dhikrCounts.userId, userId)))
    .returning();

  return NextResponse.json({ item: { key, count: updated.count, target: updated.target } });
}
