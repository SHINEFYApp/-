import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { weeklyReviews } from "@/db/schema";
import { getWeekStart } from "@/lib/weekly-review";

// راجع src/lib/weekly-review.ts للتعليق الكامل عن اصطلاح بداية الأسبوع (الأحد).

// GET: مراجعة الأسبوع الحالي لصاحب الجلسة، أو null لو لسه ماتعملتش
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const weekStart = getWeekStart();

  const [review] = await db
    .select()
    .from(weeklyReviews)
    .where(and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStart, weekStart)))
    .limit(1);

  return NextResponse.json({ review: review ?? null, weekStart: weekStart.toISOString() });
}

// PATCH: حفظ/تحديث إجابات مراجعة الأسبوع الحالي فقط لصاحب الجلسة (upsert بمفتاح userId+weekStart)
export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const { whatHappened, whatDrained, whatToChange } = body as {
    whatHappened?: unknown;
    whatDrained?: unknown;
    whatToChange?: unknown;
  };

  for (const [key, value] of Object.entries({ whatHappened, whatDrained, whatToChange })) {
    if (value !== undefined && typeof value !== "string") {
      return NextResponse.json({ error: `قيمة غير صالحة لـ ${key}` }, { status: 400 });
    }
  }

  const weekStart = getWeekStart();

  const values = {
    userId,
    weekStart,
    ...(whatHappened !== undefined ? { whatHappened: whatHappened as string } : {}),
    ...(whatDrained !== undefined ? { whatDrained: whatDrained as string } : {}),
    ...(whatToChange !== undefined ? { whatToChange: whatToChange as string } : {}),
  };

  const [review] = await db
    .insert(weeklyReviews)
    .values(values)
    .onConflictDoUpdate({
      target: [weeklyReviews.userId, weeklyReviews.weekStart],
      set: {
        ...(whatHappened !== undefined ? { whatHappened: whatHappened as string } : {}),
        ...(whatDrained !== undefined ? { whatDrained: whatDrained as string } : {}),
        ...(whatToChange !== undefined ? { whatToChange: whatToChange as string } : {}),
      },
    })
    .returning();

  return NextResponse.json({ review });
}

export const POST = PATCH;
