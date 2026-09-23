// رحلة — "الجدول": جدول يوم واحد (اليوم أو أي يوم فات) بيجمع في مكان واحد الثوابت
// التعبدية (من dailyLogs) ومهام الإنتاجية (lifeTasks) المرتبطة بنفس اليوم، مرتبة
// زمنيًا. الهدف اللي حدده خالد: (أ) شاشة "اليوم" الحية بتاخد تأكيد بسيط تم/لأ لكل
// بند، و(ب) سجل تاريخي — ترجع لأي يوم فات تلاقي أحداثه (عباداته ومهامه) متسجلة في
// مكان واحد، بدل ما يتوه بين أكتر من أداة.
//
// خط أحمر (زي worship-content.ts): مفيش أي نص ديني بيتولّد أو يتغيّر هنا — بس بنقرا
// label من DAILY_VIRTUE_TEXTS وبنبني منه بند جدول.
//
// ملحوظة v1 (نفس افتراض send-reminders/route.ts): تقسيم الأيام هنا بتاريخ UTC-only
// (زي عمود dailyLogs.date نفسه) — لسه مفيش عمود منطقة زمنية لكل مستخدم في الـ schema.
import { and, eq, gte, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, lifeTasks } from "@/db/schema";
import { DAILY_VIRTUE_TEXTS, type WorshipReminderType } from "@/lib/worship-content";
import { DEFAULT_REMINDER_TIMES } from "@/lib/push";
import { isDailyLogToggleKey, type DailyLog, type DailyLogToggleKey } from "@/lib/daily-log";

const WORSHIP_TYPES = Object.keys(DAILY_VIRTUE_TEXTS) as WorshipReminderType[];

export function dateOnlyFromKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function dateKeyOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayDateOnlyUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isDoneForType(type: WorshipReminderType, log: DailyLog | undefined): boolean {
  if (!log) return false;
  // كل أنواع الثوابت التعبدية مطابقة اسميًا لأعمدة dailyLogs (بعد فصل الأذكار
  // لصباح/مساء)، فالمفتاح نفسه صالح كـ DailyLogToggleKey — تحقّق دفاعي بسيط.
  return isDailyLogToggleKey(type) ? Boolean(log[type as DailyLogToggleKey]) : false;
}

export interface ScheduleAnchorItem {
  kind: "anchor";
  type: WorshipReminderType;
  label: string;
  time: string; // "HH:MM" تقريبي (v1 — راجع الملحوظة في push.ts)
  done: boolean;
}

export interface ScheduleTaskItem {
  kind: "task";
  id: string;
  title: string;
  category: string;
  time: string | null; // "HH:MM" لو ليها dueAt/reminderAt في نفس اليوم، وإلا null
  done: boolean;
}

export type ScheduleItem = ScheduleAnchorItem | ScheduleTaskItem;

export interface DaySchedule {
  dateKey: string;
  isToday: boolean;
  /** بنود ليها وقت معروف (عبادات + مهام لها dueAt/reminderAt اليوم ده) — مرتبة زمنيًا */
  timed: ScheduleItem[];
  /** مهام اتعملت (completedAt) في اليوم ده بس من غير وقت محدد أصلًا (مفيش dueAt) */
  doneNoTime: ScheduleTaskItem[];
}

function hhmmOf(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/**
 * بيبني جدول يوم واحد (اليوم أو أي يوم فات) لمستخدم معيّن — عبادات + مهام، مرتبة
 * زمنيًا. auth-scoped بالكامل بـ userId (راجع المبدأ الخامس غير القابل للتفاوض).
 */
export async function buildDaySchedule(userId: string, dateKey: string): Promise<DaySchedule | null> {
  const date = dateOnlyFromKey(dateKey);
  if (!date) return null;

  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const [[log], tasks] = await Promise.all([
    db.select().from(dailyLogs).where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, date))).limit(1),
    db
      .select()
      .from(lifeTasks)
      .where(
        and(
          eq(lifeTasks.userId, userId),
          or(
            and(gte(lifeTasks.dueAt, date), lt(lifeTasks.dueAt, nextDay)),
            and(gte(lifeTasks.completedAt, date), lt(lifeTasks.completedAt, nextDay))
          )
        )
      ),
  ]);

  const anchors: ScheduleAnchorItem[] = WORSHIP_TYPES.map((type) => ({
    kind: "anchor",
    type,
    label: DAILY_VIRTUE_TEXTS[type].label,
    time: DEFAULT_REMINDER_TIMES[type],
    done: isDoneForType(type, log),
  }));

  const timedTasks: ScheduleTaskItem[] = [];
  const doneNoTime: ScheduleTaskItem[] = [];

  for (const t of tasks) {
    const scheduledAt = t.reminderAt ?? t.dueAt;
    const isScheduledToday =
      scheduledAt !== null && scheduledAt >= date && scheduledAt < nextDay;

    const item: ScheduleTaskItem = {
      kind: "task",
      id: t.id,
      title: t.title,
      category: t.category,
      time: isScheduledToday ? hhmmOf(scheduledAt as Date) : null,
      done: t.status === "done",
    };

    if (item.time) {
      timedTasks.push(item);
    } else {
      // اتعمل النهارده (completedAt) بس من غير وقت مجدول أصلًا — تحت في مجموعة منفصلة
      doneNoTime.push(item);
    }
  }

  // كل عنصر هنا مضمون ليه time غير فاضي (المهام من غير وقت اتفلترت فوق لـ doneNoTime)،
  // بس النوع الاتحادي ScheduleItem بيسمح بـ null نظريًا — ?? "" أمان بسيط للترتيب بس.
  const timed: ScheduleItem[] = [...anchors, ...timedTasks].sort((a, b) =>
    (a.time ?? "").localeCompare(b.time ?? "")
  );

  return {
    dateKey,
    isToday: dateKey === dateKeyOf(todayDateOnlyUTC()),
    timed,
    doneNoTime,
  };
}
