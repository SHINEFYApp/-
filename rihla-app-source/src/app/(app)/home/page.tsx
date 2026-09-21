import { redirect } from "next/navigation";
import { and, asc, eq, gte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import {
  computeContinuity,
  daysAgoDateOnly,
  getOrCreateTodayLog,
  todayDateOnly,
} from "@/lib/daily-log";
import { getCurrentUserId } from "@/lib/auth-user";
import { isKidsMode } from "@/lib/kids-mode";
import { pickStoryForDate } from "@/lib/kids-stories";
import { HomeDashboard } from "@/components/home/HomeDashboard";

function formatDateLabel(today: Date): string {
  const gregorianParts = new Intl.DateTimeFormat("ar-EG-u-nu-arab", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).formatToParts(today);
  const weekday = gregorianParts.find((p) => p.type === "weekday")?.value ?? "";
  const gDay = gregorianParts.find((p) => p.type === "day")?.value ?? "";
  const gMonth = gregorianParts.find((p) => p.type === "month")?.value ?? "";

  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-arab", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(today);

  return `${weekday} ${gDay} ${gMonth} — ${hijri}`;
}

// شاشة "اليوم" — الرئيسية بعد تسجيل الدخول. Server Component بيجيب سجل اليوم (أو ينشئه)
// وآخر ٧ أيام لحساب "نور الاستمرارية"، وبيسلّم البيانات لمكوّن عميل واحد بيتولى التفاعل.
export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const [todayLog, weekLogs] = await Promise.all([
    getOrCreateTodayLog(userId),
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, daysAgoDateOnly(6))))
      .orderBy(asc(dailyLogs.date)),
  ]);

  const continuity = computeContinuity(weekLogs);
  const displayName = session.user.name?.trim() || "خالد";
  const avatarLetter = displayName.slice(0, 1);
  const dateLabel = formatDateLabel(todayDateOnly());
  const kids = isKidsMode(session.user.ageRange);
  const todayStory = kids ? pickStoryForDate(todayDateOnly()) : null;

  return (
    <HomeDashboard
      userName={displayName}
      avatarLetter={avatarLetter}
      dateLabel={dateLabel}
      initialLog={todayLog}
      continuity={continuity}
      todayStory={todayStory}
    />
  );
}
