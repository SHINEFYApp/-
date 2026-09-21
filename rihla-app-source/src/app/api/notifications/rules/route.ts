// GET: بيرجّع حالة كل نوع تذكير للمستخدم الحالي (مفعّل؟ وقته الافتراضي v1، وهل خلص
//      النهارده من dailyLogs ولا لسه). PATCH: بيغيّر enabled لنوع واحد (upsert).
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reminderRules, dailyLogs } from "@/db/schema";
import { DAILY_VIRTUE_TEXTS, type WorshipReminderType } from "@/lib/worship-content";
import { DEFAULT_REMINDER_TIMES } from "@/lib/push";
import { getCurrentUserId } from "@/lib/auth-user";

const TYPES = Object.keys(DAILY_VIRTUE_TEXTS) as WorshipReminderType[];

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// نوع التذكير "adhkar" بيغطي أذكار الصباح والمساء مع بعض في dailyLogs —
// بنعتبره "خلص النهارده" لو حصل أي واحد منهم.
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

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [rules, [log]] = await Promise.all([
    db.select().from(reminderRules).where(eq(reminderRules.userId, userId)),
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, todayUTC())))
      .limit(1),
  ]);

  const enabledByType = new Map(rules.map((r) => [r.type as WorshipReminderType, r.enabled]));

  const items = TYPES.map((type) => ({
    type,
    label: DAILY_VIRTUE_TEXTS[type].label,
    // مفيش صف = التذكير مفعّل افتراضيًا (سلوك v1 معقول لحد ما المستخدم يغيّره بنفسه)
    enabled: enabledByType.get(type) ?? true,
    time: DEFAULT_REMINDER_TIMES[type],
    doneToday: isDoneForType(type, log),
  }));

  return NextResponse.json({ items });
}

interface PatchBody {
  type?: string;
  enabled?: boolean;
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = (await request.json().catch(() => null)) as PatchBody | null;
  const type = data?.type as WorshipReminderType | undefined;
  const enabled = data?.enabled;

  if (!type || !TYPES.includes(type) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  await db
    .insert(reminderRules)
    .values({ userId, type, enabled })
    .onConflictDoUpdate({
      target: [reminderRules.userId, reminderRules.type],
      set: { enabled },
    });

  return NextResponse.json({ ok: true, type, enabled });
}
