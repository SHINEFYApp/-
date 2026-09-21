import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userInterests, users } from "@/db/schema";
import { isSourceAgeRange, isSourceInterestKey } from "@/lib/sources-content";

// GET: اهتمامات المستخدم الحالي + فئته العمرية — مقيّد بـ userId الجلسة فقط
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const [rows, [user]] = await Promise.all([
    db.select().from(userInterests).where(eq(userInterests.userId, userId)),
    db.select().from(users).where(eq(users.id, userId)).limit(1),
  ]);

  return NextResponse.json({
    interests: rows.map((r) => r.key),
    ageRange: user?.ageRange ?? null,
  });
}

// PUT: استبدال كامل لاهتمامات المستخدم + تحديث الفئة العمرية — مقيّد بـ userId الجلسة فقط
export async function PUT(request: Request) {
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

  const { interests, ageRange } = body as { interests?: unknown; ageRange?: unknown };

  if (!Array.isArray(interests) || !interests.every((i) => typeof i === "string" && isSourceInterestKey(i))) {
    return NextResponse.json({ error: "اهتمامات غير صالحة" }, { status: 400 });
  }
  if (ageRange !== undefined && ageRange !== null && (typeof ageRange !== "string" || !isSourceAgeRange(ageRange))) {
    return NextResponse.json({ error: "فئة عمرية غير صالحة" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(userInterests).where(eq(userInterests.userId, userId));
    if (interests.length > 0) {
      await tx.insert(userInterests).values(interests.map((key) => ({ userId, key })));
    }
    if (ageRange !== undefined) {
      await tx.update(users).set({ ageRange: ageRange ?? null }).where(eq(users.id, userId));
    }
  });

  return NextResponse.json({ interests, ageRange: ageRange ?? null });
}
