// يشيل اشتراك Push بتاع المستخدم الحالي بالـ endpoint — مقيّد بالـ userId عشان
// المستخدم يقدر يمسح اشتراكه هو بس.
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth-user";

async function handleUnsubscribe(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = data?.endpoint;
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return handleUnsubscribe(request);
}

export async function DELETE(request: Request) {
  return handleUnsubscribe(request);
}
