import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lifeTasks } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth-user";
import { TasksTabs } from "@/components/tasks/TasksTabs";
import type { Task } from "@/components/tasks/types";
import { dateKeyOf, todayDateOnlyUTC } from "@/lib/schedule";

// لوحة الإنتاجية — مهام الحياة العادية (تعلّم/شغل/اجتماعات/أهداف شخصية)، منفصلة تمامًا عن تتبع العبادات.
// بدون أي نقط أو مكافآت أو "streaks"، وصياغة محايدة للمهام المتأخرة (راجع الـ PRD).
export default async function TasksPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/auth/sign-in");

  const rows = await db.select().from(lifeTasks).where(eq(lifeTasks.userId, userId));

  const tasks: Task[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category as Task["category"],
    status: r.status as Task["status"],
    dueAt: r.dueAt ? r.dueAt.toISOString() : null,
    reminderEnabled: r.reminderEnabled,
    reminderAt: r.reminderAt ? r.reminderAt.toISOString() : null,
    notes: r.notes,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-6">
      <header>
        <div className="text-[20px] font-extrabold">الإنتاجية</div>
        <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-muted)" }}>
          مهامك العادية — تعلّم، شغل، اجتماعات، وحياتك الشخصية
        </div>
      </header>

      <TasksTabs initialTasks={tasks} todayKey={dateKeyOf(todayDateOnlyUTC())} />
    </div>
  );
}
