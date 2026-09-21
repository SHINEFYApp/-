import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-user";
import { isHabitChallengeTrackKey } from "@/lib/habit-challenge-content";
import { upsertTodayLog } from "@/lib/habit-challenges";

const MAX_NOTE_LENGTH = 500;

// POST: تسجيل يوم النهارده لمسار معيّن — "التزمت ولا لأ" + ملاحظة اختيارية.
// تتبّع كيفي بحت (kept: boolean)، مفيش أي سكور أو نقط (راجع رأس habit-challenge-content.ts).
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

  if (typeof input.kept !== "boolean") {
    return NextResponse.json({ error: "قيمة kept غير صالحة" }, { status: 400 });
  }

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string" || input.note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: "ملاحظة غير صالحة" }, { status: 400 });
    }
    note = input.note;
  }

  const log = await upsertTodayLog(userId, trackKey, input.kept, note);
  return NextResponse.json({ log });
}
