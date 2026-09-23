// GET /api/schedule?date=YYYY-MM-DD — جدول يوم واحد (auth-scoped). من غير ?date بيرجّع
// اليوم الحالي. راجع src/lib/schedule.ts للمنطق الكامل.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-user";
import { buildDaySchedule, dateKeyOf, todayDateOnlyUTC } from "@/lib/schedule";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const dateKey = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : dateKeyOf(todayDateOnlyUTC());

  const schedule = await buildDaySchedule(userId, dateKey);
  if (!schedule) {
    return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
  }

  return NextResponse.json(schedule);
}
