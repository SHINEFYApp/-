import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { lifeTasks } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth-user";

const CATEGORIES = ["learning", "work", "meeting", "personal", "other"] as const;
const STATUSES = ["backlog", "today", "in_progress", "done"] as const;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const tasks = await db.select().from(lifeTasks).where(eq(lifeTasks.userId, userId));
  return Response.json(tasks);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 300) : "";
  if (!title) {
    return Response.json({ error: "العنوان مطلوب" }, { status: 400 });
  }

  const category = CATEGORIES.includes(body?.category as (typeof CATEGORIES)[number])
    ? (body!.category as (typeof CATEGORIES)[number])
    : "other";
  const status = STATUSES.includes(body?.status as (typeof STATUSES)[number])
    ? (body!.status as (typeof STATUSES)[number])
    : "backlog";
  const dueAt = parseDate(body?.dueAt);
  const reminderEnabled = Boolean(body?.reminderEnabled);
  const reminderAt = reminderEnabled ? parseDate(body?.reminderAt) : null;
  const notes =
    typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null;

  if (reminderEnabled && !reminderAt) {
    return Response.json({ error: "لازم تحدد وقت التذكير" }, { status: 400 });
  }

  const [created] = await db
    .insert(lifeTasks)
    .values({
      userId,
      title,
      category,
      status,
      dueAt,
      reminderEnabled,
      reminderAt,
      notes,
      completedAt: status === "done" ? new Date() : null,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
