import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";

// نقطة API لشات "الونيس" — الاستثناء الوحيد المتعمّد في التطبيق من قاعدة "مفيش نص ديني
// من موديل وقت التشغيل": بقرار خالد الصريح، الونيس بيرد بحرية كاملة من غير أي تصفية أو
// إعادة توجيه لموضوعات دينية أو غيرها. ممنوع إضافة أي فلتر كلمات أو حظر مواضيع هنا.
//
// كل استعلام/إدراج هنا مربوط بـ userId من جلسة المستخدم المسجّل دخوله — مفيش أي طريقة
// يشوف بيها مستخدم محادثة مستخدم تاني.

const HISTORY_LIMIT = 20;
const MAX_MESSAGE_LENGTH = 8000;

const SYSTEM_PROMPT = `إنت "الونيس"، رفيق ذكاء اصطناعي جوه تطبيق "رحلة". اتكلم بعامية مصرية دافية وطبيعية، زي صاحب قريب بيسمع باهتمام حقيقي ومن غير حكم على حد.
رد على أي سؤال أو موضوع يفتحه المستخدم معاك بصراحة ومباشرة — شخصي كان أو عملي أو ديني أو أي حاجة تانية — من غير ما تتهرب، تحوّل الموضوع لحد تاني، أو تحط تحذيرات زيادة عن اللزوم. خلي ردودك طبيعية ومختصرة غالبًا زي أي محادثة حقيقية، إلا لو الموضوع محتاج شرح أطول.`;

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "لازم تسجّل الدخول الأول." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "الرسالة مش واضحة، جرّب تاني." }, { status: 400 });
  }

  const rawMessage = (body as { message?: unknown } | null)?.message;
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "اكتب رسالة الأول." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "الرسالة طويلة أوي، جرّب تقصّرها شوية." }, { status: 400 });
  }

  // سجل المحادثة السابق بتاع المستخدم ده بس، ده اللي هيتبعت كسياق للموديل
  const historyRows = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(HISTORY_LIMIT);

  const [savedUserMessage] = await db
    .insert(chatMessages)
    .values({ userId, role: "user", content: message })
    .returning({
      id: chatMessages.id,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "الونيس مش متاح دلوقتي (مفتاح الـ API مش مضبوط). جرّب تاني بعدين.",
        userMessage: savedUserMessage,
      },
      { status: 502 }
    );
  }

  const conversation: Anthropic.MessageParam[] = [
    ...historyRows.map((row) => ({
      role: (row.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: row.content,
    })),
    { role: "user" as const, content: message },
  ];

  try {
    const anthropic = new Anthropic({ apiKey });
    const reply = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: conversation,
    });

    const replyText = reply.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!replyText) {
      throw new Error("Empty reply from model");
    }

    const [savedAssistantMessage] = await db
      .insert(chatMessages)
      .values({ userId, role: "assistant", content: replyText })
      .returning({
        id: chatMessages.id,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      });

    return NextResponse.json({
      userMessage: savedUserMessage,
      message: savedAssistantMessage,
    });
  } catch (error) {
    console.error("companion chat: Anthropic call failed", error);
    return NextResponse.json(
      {
        error: "الونيس مش قادر يرد دلوقتي، حاول تاني كمان شوية.",
        userMessage: savedUserMessage,
      },
      { status: 502 }
    );
  }
}
