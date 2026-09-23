// راوت تشغيل هجرة قاعدة البيانات يدويًا مرة واحدة (drizzle/0006_add_life_tasks_completed_at.sql)
// على قاعدة بيانات الإنتاج — الـ migrations مش بتتطبق تلقائيًا مع الديبلوي هنا.
// محمي بنفس آلية CRON_SECRET المستخدمة في /api/cron/send-reminders. مؤقت: هيتشال بعد
// التأكد إن العمود اتضاف في الإنتاج.
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  await db.execute(
    sql`ALTER TABLE "life_tasks" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;`
  );

  return NextResponse.json({ ok: true, migration: "0006_add_life_tasks_completed_at" });
}
