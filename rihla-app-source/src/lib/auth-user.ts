// مساعد صغير: جلب معرّف المستخدم الحالي (userId) من الجلسة.
//
// تحديث: src/auth.config.ts دلوقتي فيه callback جلسة مركزي بيحط session.user.id
// فعليًا (راجع jwt/session callbacks هناك) — فبنستخدمه مباشرة من غير استعلام DB إضافي.
// السطر الاحتياطي بالبريد الإلكتروني فاضل موجود بس كـ fallback دفاعي (مثلاً جلسة قديمة
// اتعملها إصدار قبل الإصلاح ده) — أهم حاجة تفضل زي ما هي: كل استعلام DB وكل إرسال Push
// لازم يتقيّد بالـ userId الحقيقي بتاع صاحب الجلسة (راجع "المبادئ غير القابلة للتفاوض" رقم ٥).

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email;
  if (!email) return null;

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row?.id ?? null;
}
