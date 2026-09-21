// أنواع وثوابت لوحة الإنتاجية — مهام الحياة العادية (منفصلة تمامًا عن تتبع العبادات).
// ملحوظة: لا نقط ولا مكافآت ولا "streaks" هنا إطلاقًا — راجع المبادئ غير القابلة للتفاوض في الـ PRD.

export type TaskCategory = "learning" | "work" | "meeting" | "personal" | "other";
export type TaskStatus = "backlog" | "today" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  dueAt: string | null; // ISO string
  reminderEnabled: boolean;
  reminderAt: string | null; // ISO string
  notes: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// الحمولة اللي بيبعتها الفورم — نفس الشكل للإنشاء والتعديل
export interface TaskFormPayload {
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  dueAt: string | null;
  reminderEnabled: boolean;
  reminderAt: string | null;
  notes: string | null;
}

export const STATUS_ORDER: TaskStatus[] = ["backlog", "today", "in_progress", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "قيد الانتظار",
  today: "اليوم",
  in_progress: "جارٍ",
  done: "تم",
};

export const CATEGORY_ORDER: TaskCategory[] = ["learning", "work", "meeting", "personal", "other"];

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  learning: "تعلّم",
  work: "شغل",
  meeting: "اجتماع",
  personal: "شخصي",
  other: "أخرى",
};

export type DueTone = "muted" | "today" | "overdue";

// شارة الاستحقاق — صياغة محايدة بحتة، ممنوع أي لغة تأنيب أو تخويف (راجع المبادئ غير القابلة للتفاوض)
export function computeDueBadge(
  dueAt: string | null,
  status: TaskStatus
): { label: string; tone: DueTone } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const formatted = new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(due);

  // مهمة "تم" إنجازها ما بتاخدش شارة "متأخر"/"اليوم" — بس تاريخها كمعلومة عادية
  if (status === "done") {
    return { label: formatted, tone: "muted" };
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dueDay = startOfDay(due);
  const today = startOfDay(new Date());

  if (dueDay < today) return { label: "متأخر", tone: "overdue" };
  if (dueDay === today) return { label: "اليوم", tone: "today" };
  return { label: formatted, tone: "muted" };
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit" }).format(d);
}

export function sortTasks(a: Task, b: Task): number {
  const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
  const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
  if (aTime !== bTime) return aTime - bTime;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

// تحويل تاريخ/وقت ISO لصيغة input[type=datetime-local] (بالتوقيت المحلي)
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// تحويل قيمة input[type=datetime-local] لـ ISO string (UTC) — أو null لو فاضية
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
