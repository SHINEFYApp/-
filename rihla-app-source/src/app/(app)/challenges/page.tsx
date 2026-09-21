import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserId } from "@/lib/auth-user";
import { isKidsMode } from "@/lib/kids-mode";
import { dateOnlyKey, todayDateOnly } from "@/lib/daily-log";
import { HABIT_CHALLENGE_LIBRARY } from "@/lib/habit-challenge-content";
import { getRecentLogs, getUserEnrollments } from "@/lib/habit-challenges";
import { ChallengesBoard } from "@/components/challenges/ChallengesBoard";

// شاشة "تحدي كسر العادة" — مسارات الشباب/البالغين بس. وضع الأطفال ليه مساره الخاص
// تمامًا (قصة الأمانة في لوحة اليوم) ومفيش أي رابط ليه للشاشة دي من واجهته، لكن بنحمي
// الراوت نفسه هنا كمان (Server Component) لو حد وصلله بلينك مباشر.
export default async function ChallengesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  if (isKidsMode(session.user.ageRange)) {
    redirect("/home");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const [enrollments, recentLogs] = await Promise.all([
    getUserEnrollments(userId),
    getRecentLogs(userId),
  ]);

  return (
    <div className="flex flex-col gap-[18px] px-5 pb-4 pt-[22px]">
      <div>
        <div className="text-xl font-extrabold text-ink">تحدي كسر العادة</div>
        <div className="mt-[3px] text-[12.5px] text-ink-muted">
          مساحة خاصة بيك — بلا مقارنة، بلا حكم، خطوة خطوة
        </div>
      </div>

      <ChallengesBoard
        tracks={HABIT_CHALLENGE_LIBRARY}
        initialEnrollments={enrollments.map((e) => ({
          trackKey: e.trackKey,
          versionLevel: e.versionLevel as "tiny" | "normal" | "ideal",
          status: e.status as "active" | "paused" | "completed",
        }))}
        initialRecentLogs={recentLogs.map((l) => ({
          trackKey: l.trackKey,
          date: dateOnlyKey(l.date),
          kept: l.kept,
        }))}
        todayKey={dateOnlyKey(todayDateOnly())}
      />
    </div>
  );
}
