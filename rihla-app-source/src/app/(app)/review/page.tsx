import { and, eq, gte, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { dailyLogs, weeklyReviews } from "@/db/schema";
import { computeWeeklyStats, formatWeekRangeArabic, getWeekEnd, getWeekStart } from "@/lib/weekly-review";
import { WeeklyActivityChart } from "@/components/review/WeeklyActivityChart";
import { WeeklyReviewForm } from "@/components/review/WeeklyReviewForm";

// مراجعة الأسبوع — منقولة من نموذج الواجهات المعتمد Review.dc.html.
// شارت "الطاقة خلال الأسبوع" في النموذج ماله غطاء بيانات حقيقي (مفيش حقل energy في الـ schema)،
// فاتبدّل بشارت "نشاط العبادة اليومي" المحسوب فعليًا من dailyLogs — راجع التعليق الكامل في
// src/lib/weekly-review.ts (computeWeeklyStats).
export default async function ReviewPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  const [logs, [review]] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, weekStart), lte(dailyLogs.date, weekEnd))),
    db
      .select()
      .from(weeklyReviews)
      .where(and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStart, weekStart)))
      .limit(1),
  ]);

  const stats = computeWeeklyStats(logs, weekStart);
  const prayersPct = Math.round((stats.prayersOnTime / 35) * 100);
  const quranPct = Math.round((stats.quranDays / 7) * 100);

  return (
    <div className="flex flex-col gap-[18px] px-5 pb-5 pt-[22px]">
      <div>
        <div className="text-xl font-extrabold text-ink">مراجعة الأسبوع</div>
        <div className="mt-[2px] text-[12.5px] text-ink-muted">
          {formatWeekRangeArabic(weekStart, weekEnd)}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[18px] bg-green-soft p-[18px]">
        <div className="text-[13px] font-extrabold text-green">الثوابت التعبدية أولًا</div>

        <div>
          <div className="mb-[5px] flex justify-between text-[13px] text-ink">
            <span>الصلوات في وقتها</span>
            <span className="font-bold">{stats.prayersOnTime} / ٣٥</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-green/15">
            <div className="h-full rounded-full bg-green" style={{ width: `${prayersPct}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-[5px] flex justify-between text-[13px] text-ink">
            <span>ورد القرآن</span>
            <span className="font-bold">{stats.quranDays} / ٧ أيام</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-green/15">
            <div className="h-full rounded-full bg-green" style={{ width: `${quranPct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]"
            style={{ background: stats.sadaqahRegular ? "var(--green)" : "var(--surface)" }}
          >
            {stats.sadaqahRegular ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
          </div>
          <span className="text-[13px] text-ink">
            {stats.sadaqahRegular ? "الصدقة كانت منتظمة الأسبوع ده" : "الصدقة ماكانتش منتظمة الأسبوع ده"}
          </span>
        </div>
      </div>

      <WeeklyActivityChart dailyActivity={stats.dailyActivity} />

      <WeeklyReviewForm
        initial={{
          whatHappened: review?.whatHappened ?? "",
          whatDrained: review?.whatDrained ?? "",
          whatToChange: review?.whatToChange ?? "",
        }}
      />
    </div>
  );
}
