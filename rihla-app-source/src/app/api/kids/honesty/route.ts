import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-user";
import { setTodayHonestyReflection } from "@/lib/kids-honesty";

// POST: تسجيل تأمل خفيف اختياري بعد "قصة الأمانة" (وضع الأطفال بس) — علم واحد بسيط،
// مفيش أي تفاصيل شخصية أو "تتبّع سرقة" (راجع رأس src/lib/kids-honesty-content.ts).
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

  const talkedToTrustedAdult = (body as { talkedToTrustedAdult?: unknown } | null)?.talkedToTrustedAdult;
  if (typeof talkedToTrustedAdult !== "boolean") {
    return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
  }

  const reflection = await setTodayHonestyReflection(userId, talkedToTrustedAdult);
  return NextResponse.json({ reflection });
}
