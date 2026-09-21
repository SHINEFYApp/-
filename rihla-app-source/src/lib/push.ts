// رحلة — محرك الإشعارات الحقيقي (Web Push / VAPID)
//
// خط أحمر: أي نص ديني (فضل عبادة) بيتبعت في إشعار لازم ييجي حرفيًا من
// src/lib/worship-content.ts (DAILY_VIRTUE_TEXTS) — من غير أي توليد أو إعادة صياغة هنا.
// وأي إرسال هنا لازم يتقيّد بـ userId صاحب الاشتراك فعليًا (مفيش اشتراك مستخدم تاني).

import webPush from "web-push";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import type { WorshipReminderType } from "@/lib/worship-content";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:khaledessam80@gmail.com";

let vapidConfigured = false;

/**
 * بيهيّئ مكتبة web-push بمفاتيح VAPID أول مرة بس. في بيئة الـ sandbox دي المفاتيح
 * فاضية (.env بدون قيم حقيقية) — ده متوقع، فبنرجع false ونتجاهل الإرسال بهدوء
 * بدل ما نكسر الـ build أو الـ request. القيم الحقيقية هتتحط وقت النشر الفعلي.
 */
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

/** المفتاح العام بس (آمن نعرضه للمتصفح) — بيتسحب من endpoint الاشتراك في الواجهة. */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

export interface PushPayload {
  title: string;
  body: string;
  /** مسار داخلي يتفتح لما المستخدم يدوس على الإشعار (مثلاً /home أو /tasks) */
  url?: string;
}

export interface SendPushResult {
  sent: number;
  pruned: number;
  configured: boolean;
}

/**
 * بيبعت إشعار Push لكل اشتراكات المستخدم ده بس (userId) — مفيش أي إرسال عابر لمستخدم
 * تاني تحت أي ظرف. بيمسح تلقائيًا أي اشتراك رجع منه 404/410 (يعني المتصفح ألغاه).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendPushResult> {
  if (!ensureVapidConfigured()) {
    console.warn("[push] VAPID keys غير مهيأة — تم تجاهل الإرسال (متوقع في بيئة التطوير/الـ sandbox)");
    return { sent: 0, pruned: 0, configured: false };
  }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.url ? { url: payload.url } : undefined,
  });

  let sent = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // المتصفح ألغى الاشتراك ده — ننضفه بدل ما نحاول تاني كل مرة
          await db
            .delete(pushSubscriptions)
            .where(and(eq(pushSubscriptions.id, sub.id), eq(pushSubscriptions.userId, userId)));
          pruned += 1;
        } else {
          console.error(`[push] فشل الإرسال للاشتراك ${sub.id}`, err);
        }
      }
    })
  );

  return { sent, pruned, configured: true };
}

// جدول أوقات افتراضية (v1) لكل نوع تذكير — تبسيط مقصود:
// جدول reminderRules في الـ schema المجمّد فيه بس userId/type/enabled، من غير عمود وقت.
// بدل ما نمنع ميزة التذكير الحقيقي، بنستخدم جدول أوقات ثابت هنا لحد ما يُضاف عمود
// وقت مخصص لكل مستخدم (قرار للجلسة المنسّقة). الأوقات دي تقريبية لمواقيت الصلاة
// (مش مرتبطة بموقع جغرافي حقيقي) — ملحوظة v1 واضحة، مش قرار نهائي.
export const DEFAULT_REMINDER_TIMES: Record<WorshipReminderType, `${number}${number}:${number}${number}`> = {
  fajr: "05:00",
  dhuhr: "13:00",
  asr: "16:30",
  maghrib: "18:45",
  isha: "20:15",
  quran: "21:00",
  adhkar: "19:30",
  sadaqah: "12:00",
};
