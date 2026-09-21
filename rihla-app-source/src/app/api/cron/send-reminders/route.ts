// نقطة تشغيل دورية (Vercel Cron — راجع vercel.json في جذر المشروع) بتفحص كل
// مستخدم وتبعت Push حقيقي لتذكيرات الثوابت التعبدية ومهام الإنتاجية المستحقة.
//
// خط أحمر: نص أي تذكير عبادة بيتسحب حرفيًا من DAILY_VIRTUE_TEXTS (worship-content.ts) —
// من غير أي توليد أو إعادة صياغة هنا. وتذكيرات المهام العادية بعنوان المهمة نفسه بس،
// بدون أي صياغة ذنب أو تحفيز/نقط (راجع المبدأ رقم ٦ في الـ PRD).
import { NextResponse } from "next/server";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { users, reminderRules, dailyLogs, lifeTasks, zakatProfiles } from "@/db/schema";
import { DAILY_VIRTUE_TEXTS, type WorshipReminderType } from "@/lib/worship-content";
import { DEFAULT_REMINDER_TIMES, sendPushToUser } from "@/lib/push";
import { computeHawlDueDate } from "@/lib/zakat";
import { RAMADAN_MONTH, getHijriDateParts } from "@/lib/hijri";

// الراوت ده بيقرا الوقت الحالي في كل استدعاء — لازم يفضل ديناميكي ومايتخزنش.
export const dynamic = "force-dynamic";

// ملحوظة v1: مفيش عمود موقع/منطقة زمنية لكل مستخدم في الـ schema المجمّد، فبنستخدم
// منطقة زمنية ثابتة (قابلة للتغيير من env) بدل ما نمنع الميزة بالكامل.
const REMINDER_TIMEZONE = process.env.REMINDER_TIMEZONE || "Africa/Cairo";

// نافذة قصيرة حوالين reminderAt بتاع المهمة — عشان lifeTasks مفيهاش عمود "notified"
// (الـ schema مجمّد)، فبنعتبر المهمة "مستحقة" لو وقتها كان في آخر N دقيقة بس، بدل ما
// نعيد إرسال نفس التذكير في كل تشغيلة cron. الـ cron نفسه متوقع يشتغل كل دقيقة (vercel.json).
const TASK_REMINDER_WINDOW_MINUTES = 5;

const WORSHIP_TYPES = Object.keys(DAILY_VIRTUE_TEXTS) as WorshipReminderType[];

// وقت فحص تذكيرات الزكاة اليومي (مرة واحدة في اليوم بس، مش كل دقيقة زي الصلاة) —
// وقت صباحي مناسب بعيد عن أوقات الصلاة الافتراضية فوق.
const ZAKAT_CHECK_TIME = "09:00";
// آخر ٤ أيام من رمضان (تقريبًا) — وقت شائع لإخراج زكاة الفطر قبل صلاة العيد.
const FITR_REMINDER_MIN_DAY = 27;

function todayDateOnlyUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isSameUTCDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function currentHHMM(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date());
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isDoneForType(
  type: WorshipReminderType,
  log: typeof dailyLogs.$inferSelect | undefined
): boolean {
  if (!log) return false;
  switch (type) {
    case "fajr":
      return log.fajr;
    case "dhuhr":
      return log.dhuhr;
    case "asr":
      return log.asr;
    case "maghrib":
      return log.maghrib;
    case "isha":
      return log.isha;
    case "quran":
      return log.quran;
    case "adhkar":
      return log.adhkarMorning || log.adhkarEvening;
    case "sadaqah":
      return log.sadaqah;
    default:
      return false;
  }
}

function truncateBody(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function GET(request: Request) {
  // حماية بسيطة (اختيارية v1): لو CRON_SECRET متظبط في env، لازم الطلب يبعت نفس
  // القيمة في Authorization header (كده Vercel Cron محمي من استدعاء خارجي عشوائي).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const nowHHMM = currentHHMM(REMINDER_TIMEZONE);
  const date = todayUTC();
  const nowTs = Date.now();
  const windowStart = new Date(nowTs - TASK_REMINDER_WINDOW_MINUTES * 60_000);

  const dueWorshipTypes = WORSHIP_TYPES.filter((type) => DEFAULT_REMINDER_TIMES[type] === nowHHMM);

  const allUsers = await db.select({ id: users.id }).from(users);

  let worshipSent = 0;
  let taskSent = 0;

  for (const user of allUsers) {
    // ١) تذكيرات الثوابت التعبدية — بس للأنواع اللي وقتها الافتراضي (v1) بيطابق الدقيقة
    //    الحالية، ومفعّلة عند المستخدم، ولسه مسجّلتش خلاص النهارده في dailyLogs.
    if (dueWorshipTypes.length > 0) {
      const [rules, [log]] = await Promise.all([
        db.select().from(reminderRules).where(eq(reminderRules.userId, user.id)),
        db
          .select()
          .from(dailyLogs)
          .where(and(eq(dailyLogs.userId, user.id), eq(dailyLogs.date, date)))
          .limit(1),
      ]);
      const enabledByType = new Map(rules.map((r) => [r.type as WorshipReminderType, r.enabled]));

      for (const type of dueWorshipTypes) {
        const enabled = enabledByType.get(type) ?? true; // مفيش صف = مفعّل افتراضيًا
        if (!enabled || isDoneForType(type, log)) continue;

        const virtue = DAILY_VIRTUE_TEXTS[type];
        const result = await sendPushToUser(user.id, {
          title: virtue.label,
          body: truncateBody(`${virtue.text} — ${virtue.source}`),
          url: "/home",
        });
        if (result.sent > 0) worshipSent += 1;
      }
    }

    // ٢) تذكيرات مهام الإنتاجية العادية — عنوان المهمة نفسه بس، بدون أي نص ديني أو
    //    صياغة ذنب/ترهيب أو نقط (مبدأ ٦). مقيّدة بنافذة قصيرة حوالين reminderAt.
    const dueTasks = await db
      .select()
      .from(lifeTasks)
      .where(
        and(
          eq(lifeTasks.userId, user.id),
          eq(lifeTasks.reminderEnabled, true),
          isNotNull(lifeTasks.reminderAt),
          lte(lifeTasks.reminderAt, new Date(nowTs)),
          gte(lifeTasks.reminderAt, windowStart)
        )
      );

    for (const task of dueTasks) {
      const result = await sendPushToUser(user.id, {
        title: task.title,
        body: "حان وقت المهمة المجدولة",
        url: "/tasks",
      });
      if (result.sent > 0) taskSent += 1;
    }
  }

  // ٣) تذكيرات الزكاة — فحص مرة واحدة يوميًا بس (وقت ثابت)، مش كل دقيقة زي الصلاة.
  // زكاة المال: لو الحول خلص (وفق تاريخ بداية الحول المُدخل من المستخدم) ولسه محدّش سدد.
  // زكاة الفطر: آخر أيام رمضان (تقويم أم القرى)، مرة واحدة كل سنة هجرية.
  let zakatSent = 0;
  if (nowHHMM === ZAKAT_CHECK_TIME) {
    const today = todayDateOnlyUTC();
    const hijriToday = getHijriDateParts(today);
    const isFitrWindow = hijriToday.month === RAMADAN_MONTH && hijriToday.day >= FITR_REMINDER_MIN_DAY;

    const profiles = await db.select().from(zakatProfiles);

    for (const profile of profiles) {
      // زكاة المال
      if (profile.malReminderEnabled && profile.hawlStartDate) {
        const dueDate = computeHawlDueDate(profile.hawlStartDate);
        const alreadySentToday =
          profile.lastMalReminderSentAt && isSameUTCDate(profile.lastMalReminderSentAt, today);
        if (dueDate && today >= dueDate && !alreadySentToday) {
          const result = await sendPushToUser(profile.userId, {
            title: "زكاة المال",
            body: "الحول اكتمل على مالك — افتح حاسبة الزكاة في رحلة عشان تحسب المستحق وتسدده.",
            url: "/zakat",
          });
          if (result.sent > 0) {
            zakatSent += 1;
            await db
              .update(zakatProfiles)
              .set({ lastMalReminderSentAt: today })
              .where(eq(zakatProfiles.id, profile.id));
          }
        }
      }

      // زكاة الفطر
      if (profile.fitrReminderEnabled && isFitrWindow && profile.lastFitrReminderHijriYear !== hijriToday.year) {
        const result = await sendPushToUser(profile.userId, {
          title: "زكاة الفطر",
          body: "اقترب العيد — متنساش تخرج زكاة الفطر عنك وعن اللي تعولهم قبل صلاة العيد.",
          url: "/zakat",
        });
        if (result.sent > 0) {
          zakatSent += 1;
          await db
            .update(zakatProfiles)
            .set({ lastFitrReminderHijriYear: hijriToday.year })
            .where(eq(zakatProfiles.id, profile.id));
        }
      }
    }
  }

  return NextResponse.json({ ok: true, nowHHMM, worshipSent, taskSent, zakatSent });
}
