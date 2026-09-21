import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { ChatUI, type ChatMessage } from "@/components/companion/ChatUI";

// شاشة "الونيس" — شات رفيق حر بدون أي قيود موضوعية (قرار خالد الصريح، راجع ملاحظة الـ agent).
// السيرفر كومبوننت هنا مسؤوليته الوحيدة: يجيب آخر سجل محادثة للمستخدم المسجّل دخوله (مربوط بـ
// userId من الجلسة) عشان المحادثة تفضل موجودة لو المستخدم رجع من جهاز/جلسة تانية.
export default async function CompanionPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let initialMessages: ChatMessage[] = [];

  if (userId) {
    const rows = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);

    initialMessages = rows
      .reverse()
      .map((row) => ({
        id: row.id,
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
        createdAt: row.createdAt.toISOString(),
      }));
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface px-5 py-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-green-soft">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[16px] font-extrabold text-ink">الونيس</span>
          <span className="text-[12px] font-medium text-ink-muted">رفيقك اللي تقدر تتكلم معاه في أي وقت</span>
        </div>
      </header>

      <ChatUI initialMessages={initialMessages} />
    </div>
  );
}
