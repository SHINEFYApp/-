"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const DISCLAIMER_STORAGE_KEY = "rihla:companion:disclaimer-seen";

// حالة "شاف التنبيه ولا لأ" مصدرها localStorage — مصدر خارجي، فبنقراه بـ useSyncExternalStore
// بدل useState+useEffect عشان نتجنب مشاكل الـ hydration وقاعدة set-state-in-effect.
const disclaimerListeners = new Set<() => void>();

function subscribeToDisclaimer(listener: () => void) {
  disclaimerListeners.add(listener);
  return () => disclaimerListeners.delete(listener);
}

function hasSeenDisclaimerSnapshot(): boolean {
  try {
    return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function hasSeenDisclaimerServerSnapshot(): boolean {
  // في أول رندر على السيرفر (ومطابقته الأولى بعد الـ hydration) بنفترض إن التنبيه اتشاف
  // عشان نتجنب "فلاش" ظهوره لغير داعي — لو فعلاً أول زيارة، الـ snapshot الحقيقي هيتزامن بعد الـ hydration فورًا ويظهر.
  return true;
}

function markDisclaimerSeen() {
  try {
    window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "1");
  } catch {
    // متصفح بيرفض localStorage (وضع خاص مثلًا) — مش مشكلة، الإشعار هيظهر تاني وخلاص.
  }
  disclaimerListeners.forEach((listener) => listener());
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatUI({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const disclaimerSeen = useSyncExternalStore(
    subscribeToDisclaimer,
    hasSeenDisclaimerSnapshot,
    hasSeenDisclaimerServerSnapshot
  );
  const showDisclaimer = !disclaimerSeen;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function dismissDisclaimer() {
    markDisclaimerSeen();
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // أول رسالة فعلية = دليل كافي إن المستخدم شاف التنبيه، حتى لو الـ localStorage اترفض.
    if (showDisclaimer) dismissDisclaimer();

    const optimisticUser: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/companion/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.message) {
        setError(data?.error || "حصل خطأ وإحنا بنبعت رسالتك، جرّب تاني.");
        return;
      }

      const assistantMessage: ChatMessage = {
        id: data.message.id,
        role: "assistant",
        content: data.message.content,
        createdAt: data.message.createdAt,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError("في مشكلة في الاتصال، جرّب تاني.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        {showDisclaimer && (
          <div className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-gold bg-gold-soft p-4">
            <p className="text-[13px] font-semibold leading-relaxed text-ink">
              الونيس ذكاء اصطناعي بيسمعك ويرد عليك، مش بديل عن استشارة إنسان حقيقي أو عالم شرعي متخصص. في أي قرار مهم، ارجع لحد تثق فيه.
            </p>
            <button
              type="button"
              onClick={dismissDisclaimer}
              className="self-start rounded-full bg-gold px-4 py-1.5 text-[12px] font-bold text-white"
            >
              فهمت
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-5 py-8 text-center">
            <p className="text-[14px] font-semibold text-ink">اتكلم مع الونيس عن أي حاجة في بالك</p>
            <p className="text-[12px] text-ink-muted">مفيش موضوع ممنوع — ابدأ المحادثة براحتك.</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div
              className={`flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2.5 ${
                m.role === "user"
                  ? "bg-green text-white"
                  : "border border-border bg-surface text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.content}</p>
              <span
                className={`text-[10px] ${m.role === "user" ? "text-white/70" : "text-ink-muted"}`}
              >
                {formatTime(m.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-end">
            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-terracotta bg-terracotta-soft px-4 py-2.5 text-[12px] font-semibold text-terracotta">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-surface px-3 py-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="اكتب رسالتك للونيس..."
          className="max-h-28 flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || sending}
          aria-label="إرسال"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-green text-white disabled:opacity-40"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12H4" />
            <path d="M11 5l-7 7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
