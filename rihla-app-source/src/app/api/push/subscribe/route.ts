// POST: يسجّل (أو يحدّث) اشتراك Push بتاع المستخدم الحالي.
// GET: بيرجّع مفتاح VAPID العام بس (آمن) عشان الواجهة تستخدمه في pushManager.subscribe.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth-user";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = data?.endpoint;
  const p256dh = data?.keys?.p256dh;
  const auth = data?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid push subscription" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing) {
    // نفس الـ endpoint ممكن يترجع (مثلاً بعد تجديد المفاتيح في نفس المتصفح) —
    // بنحدّثه ونربطه بالمستخدم الحالي، عشان ولا اشتراك يفضل معلّق على مستخدم غلط.
    await db
      .update(pushSubscriptions)
      .set({ userId, p256dh, auth })
      .where(eq(pushSubscriptions.id, existing.id));
  } else {
    await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth });
  }

  return NextResponse.json({ ok: true });
}
