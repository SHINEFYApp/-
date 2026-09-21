import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { discoveryResponses } from "@/db/schema";

interface DiscoveryAnswerPayload {
  questionNo: number;
  answer: string;
  tags?: string[];
}

// حفظ إجابات المقابلة التشخيصية (Discovery) — سؤال واحد لكل صف، والتاجز بتتحفظ بس للسؤال الأول.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "لازم تسجل الدخول الأول" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "البيانات المرسلة غير صالحة" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !Array.isArray((body as Record<string, unknown>).answers)) {
    return NextResponse.json({ error: "البيانات المرسلة غير صالحة" }, { status: 400 });
  }

  const rawAnswers = (body as Record<string, unknown>).answers as unknown[];

  const answers: DiscoveryAnswerPayload[] = [];
  for (const raw of rawAnswers) {
    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ error: "شكل الإجابات غير صالح" }, { status: 400 });
    }
    const { questionNo, answer, tags } = raw as Record<string, unknown>;
    if (typeof questionNo !== "number" || !Number.isInteger(questionNo)) {
      return NextResponse.json({ error: "رقم السؤال غير صالح" }, { status: 400 });
    }
    if (typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json({ error: "من فضلك اكتب إجابة قبل ما تكمل" }, { status: 400 });
    }
    let normalizedTags: string[] | undefined;
    if (tags !== undefined) {
      if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
        return NextResponse.json({ error: "شكل التاجز غير صالح" }, { status: 400 });
      }
      normalizedTags = tags as string[];
    }
    answers.push({ questionNo, answer: answer.trim(), tags: normalizedTags });
  }

  if (answers.length === 0) {
    return NextResponse.json({ error: "مفيش إجابات للحفظ" }, { status: 400 });
  }

  await db.insert(discoveryResponses).values(
    answers.map((a) => ({
      userId,
      questionNo: a.questionNo,
      answer: a.answer,
      tags: a.tags && a.tags.length > 0 ? a.tags : null,
    }))
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
