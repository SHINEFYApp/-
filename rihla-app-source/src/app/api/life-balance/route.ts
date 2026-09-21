import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { lifeBalanceAreas } from "@/db/schema";
import { isLifeBalanceDomainKey, isLifeBalanceStatus } from "@/lib/life-balance";
import { getOrCreateLifeBalanceAreas } from "@/lib/life-balance-server";

// GET: يتأكد إن الـ ٨ مجالات موجودة لصاحب الجلسة (بينشئ الناقص بحالة "stable" وملاحظة فاضية)،
// وبيرجعهم كلهم — مرتبين بترتيب النموذج المعتمد. كل الاستعلامات مقيّدة بـ userId الجلسة الحالية.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const areas = await getOrCreateLifeBalanceAreas(userId);
  return NextResponse.json({ areas });
}

// PATCH: تحديث حالة/ملاحظة مجال واحد لصاحب الجلسة فقط — أبدًا صف مستخدم تاني.
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

  const { domainKey, status, note } = body as {
    domainKey?: unknown;
    status?: unknown;
    note?: unknown;
  };

  if (typeof domainKey !== "string" || !isLifeBalanceDomainKey(domainKey)) {
    return NextResponse.json({ error: "مجال غير معروف" }, { status: 400 });
  }
  if (status !== undefined && (typeof status !== "string" || !isLifeBalanceStatus(status))) {
    return NextResponse.json({ error: "حالة غير معروفة" }, { status: 400 });
  }
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json({ error: "ملاحظة غير صالحة" }, { status: 400 });
  }

  // نضمن وجود الصف الأول (lazy create) قبل التحديث
  await db
    .insert(lifeBalanceAreas)
    .values({ userId, domainKey })
    .onConflictDoNothing();

  const updates: Partial<typeof lifeBalanceAreas.$inferInsert> = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (note !== undefined) updates.note = note;

  const [updated] = await db
    .update(lifeBalanceAreas)
    .set(updates)
    .where(and(eq(lifeBalanceAreas.userId, userId), eq(lifeBalanceAreas.domainKey, domainKey)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "المجال غير موجود" }, { status: 404 });
  }

  return NextResponse.json({ area: updated });
}
