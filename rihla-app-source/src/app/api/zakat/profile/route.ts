import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { zakatProfiles } from "@/db/schema";
import type { NisabReference } from "@/lib/zakat";

// GET: يرجّع ملف الزكاة بتاع المستخدم الحالي، وينشئه بقيم افتراضية (صفر) لو أول مرة.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const [existing] = await db.select().from(zakatProfiles).where(eq(zakatProfiles.userId, userId)).limit(1);
  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  const [created] = await db.insert(zakatProfiles).values({ userId }).returning();
  return NextResponse.json({ profile: created });
}

const NUMERIC_FIELDS = [
  "goldPricePerGram",
  "silverPricePerGram",
  "cashAmount",
  "goldGrams",
  "silverGrams",
  "tradeGoodsValue",
  "debtsOwed",
] as const;

// PATCH: تحديث حقول ملف الزكاة (مدخلات الحاسبة) لصاحب الجلسة فقط — تحديث جزئي.
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

  const input = body as Record<string, unknown>;
  const updates: Partial<typeof zakatProfiles.$inferInsert> = { updatedAt: new Date() };

  for (const field of NUMERIC_FIELDS) {
    const value = input[field];
    if (value === undefined) continue;
    if (value === null) {
      (updates as Record<string, unknown>)[field] = null;
      continue;
    }
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      return NextResponse.json({ error: `قيمة غير صالحة: ${field}` }, { status: 400 });
    }
    (updates as Record<string, unknown>)[field] = value;
  }

  if (input.nisabReference !== undefined) {
    if (input.nisabReference !== "gold" && input.nisabReference !== "silver") {
      return NextResponse.json({ error: "مرجع نصاب غير صالح" }, { status: 400 });
    }
    updates.nisabReference = input.nisabReference as NisabReference;
  }

  if (input.currency !== undefined) {
    if (typeof input.currency !== "string" || input.currency.length > 8) {
      return NextResponse.json({ error: "عملة غير صالحة" }, { status: 400 });
    }
    updates.currency = input.currency;
  }

  if (input.hawlStartDate !== undefined) {
    if (input.hawlStartDate === null) {
      updates.hawlStartDate = null;
    } else if (typeof input.hawlStartDate === "string") {
      const parsed = new Date(input.hawlStartDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "تاريخ بداية الحول غير صالح" }, { status: 400 });
      }
      updates.hawlStartDate = parsed;
    } else {
      return NextResponse.json({ error: "تاريخ بداية الحول غير صالح" }, { status: 400 });
    }
  }

  if (input.malReminderEnabled !== undefined) {
    if (typeof input.malReminderEnabled !== "boolean") {
      return NextResponse.json({ error: "قيمة غير صالحة: malReminderEnabled" }, { status: 400 });
    }
    updates.malReminderEnabled = input.malReminderEnabled;
  }

  if (input.fitrReminderEnabled !== undefined) {
    if (typeof input.fitrReminderEnabled !== "boolean") {
      return NextResponse.json({ error: "قيمة غير صالحة: fitrReminderEnabled" }, { status: 400 });
    }
    updates.fitrReminderEnabled = input.fitrReminderEnabled;
  }

  // نضمن وجود صف أولًا (lazy create) قبل التحديث
  await db.insert(zakatProfiles).values({ userId }).onConflictDoNothing();

  const [updated] = await db
    .update(zakatProfiles)
    .set(updates)
    .where(eq(zakatProfiles.userId, userId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "تعذّر تحديث ملف الزكاة" }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
