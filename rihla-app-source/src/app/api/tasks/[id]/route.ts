import { and, eq } from "drizzle-orm";
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return Response.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const patch: Partial<typeof lifeTasks.$inferInsert> = { updatedAt: new Date() };

  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
    if (!title) return Response.json({ error: "العنوان مطلوب" }, { status: 400 });
    patch.title = title;
  }
  if ("category" in body && CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])) {
    patch.category = body.category as (typeof CATEGORIES)[number];
  }
  if ("status" in body && STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    patch.status = body.status as (typeof STATUSES)[number];
  }
  if ("dueAt" in body) {
    patch.dueAt = parseDate(body.dueAt);
  }
  if ("notes" in body) {
    patch.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null;
  }
  if ("reminderEnabled" in body) {
    if (body.reminderEnabled === true) {
      const reminderAt = parseDate(body.reminderAt);
      if (!reminderAt) {
        return Response.json({ error: "لازم تحدد وقت التذكير" }, { status: 400 });
      }
      patch.reminderEnabled = true;
      patch.reminderAt = reminderAt;
    } else if (body.reminderEnabled === false) {
      patch.reminderEnabled = false;
      patch.reminderAt = null;
    }
  }

  const [updated] = await db
    .update(lifeTasks)
    .set(patch)
    .where(and(eq(lifeTasks.id, id), eq(lifeTasks.userId, userId)))
    .returning();

  if (!updated) return new Response("Not found", { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const deleted = await db
    .delete(lifeTasks)
    .where(and(eq(lifeTasks.id, id), eq(lifeTasks.userId, userId)))
    .returning({ id: lifeTasks.id });

  if (deleted.length === 0) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 204 });
}
