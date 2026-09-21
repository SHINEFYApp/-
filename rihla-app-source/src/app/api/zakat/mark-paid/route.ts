import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { zakatProfiles } from "@/db/schema";

// POST: تسجيل إن زكاة المال اتسددت النهارده — بيحدّث تاريخ آخر سداد، وبيبدأ حول جديد
// من النهارده (الافتراض: المال لسه فوق النصاب، فالحول الجديد بيبدأ من تاريخ السداد).
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  await db.insert(zakatProfiles).values({ userId }).onConflictDoNothing();

  const today = new Date();
  const [updated] = await db
    .update(zakatProfiles)
    .set({ lastPaidDate: today, hawlStartDate: today, updatedAt: new Date() })
    .where(eq(zakatProfiles.userId, userId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "تعذّر تحديث ملف الزكاة" }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
