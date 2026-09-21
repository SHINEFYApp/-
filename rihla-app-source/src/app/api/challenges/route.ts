import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-user";
import { getRecentLogs, getUserEnrollments } from "@/lib/habit-challenges";

// GET: يرجّع تسجيلات المستخدم الحالي في مسارات "تحدي كسر العادة" + آخر ٧ أيام سجلات،
// عشان الواجهة تبني الحالة من غير ما تحتاج نداء لكل مسار لوحده.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const [enrollments, recentLogs] = await Promise.all([
    getUserEnrollments(userId),
    getRecentLogs(userId),
  ]);

  return NextResponse.json({ enrollments, recentLogs });
}
