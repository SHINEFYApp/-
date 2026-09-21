import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-user";
import { isHabitChallengeTrackKey } from "@/lib/habit-challenge-content";
import {
  isHabitEnrollmentStatus,
  isHabitVersionLevel,
  updateEnrollment,
  upsertEnrollment,
} from "@/lib/habit-challenges";

// POST: يبدأ (أو يعيد تفعيل) مسار — النسخة الافتراضية "تيني" لو محددتش، نفس روح
// behavior-change: ابدأ بأصغر نسخة ممكنة من السلوك.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const input = (body as Record<string, unknown>) ?? {};
  const trackKey = input.trackKey;
  if (!isHabitChallengeTrackKey(trackKey)) {
    return NextResponse.json({ error: "مسار غير معروف" }, { status: 400 });
  }

  const versionLevel = input.versionLevel;
  const resolvedVersion = isHabitVersionLevel(versionLevel) ? versionLevel : "tiny";

  const enrollment = await upsertEnrollment(userId, trackKey, resolvedVersion);
  return NextResponse.json({ enrollment });
}

// PATCH: تغيير النسخة (تيني/عادية/مثالية) أو الحالة (نشط/متوقف مؤقتًا) لمسار مسجّل فيه المستخدم أصلًا.
export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const input = (body as Record<string, unknown>) ?? {};
  const trackKey = input.trackKey;
  if (!isHabitChallengeTrackKey(trackKey)) {
    return NextResponse.json({ error: "مسار غير معروف" }, { status: 400 });
  }

  const patch: { versionLevel?: "tiny" | "normal" | "ideal"; status?: "active" | "paused" | "completed" } = {};

  if (input.versionLevel !== undefined) {
    if (!isHabitVersionLevel(input.versionLevel)) {
      return NextResponse.json({ error: "نسخة غير صالحة" }, { status: 400 });
    }
    patch.versionLevel = input.versionLevel;
  }

  if (input.status !== undefined) {
    if (!isHabitEnrollmentStatus(input.status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }
    patch.status = input.status;
  }

  const updated = await updateEnrollment(userId, trackKey, patch);
  if (!updated) {
    return NextResponse.json({ error: "المسار ده مش مسجّل عندك" }, { status: 404 });
  }

  return NextResponse.json({ enrollment: updated });
}
