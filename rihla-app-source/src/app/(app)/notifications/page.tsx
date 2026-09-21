"use client";

// شاشة "التذكيرات" — مركز إشعارات داخل التطبيق + إعدادات تفعيل كل نوع تذكير.
// المحتوى الديني (فضل/مصدر) بييجي حرفيًا من worship-content.ts زي ما هو — الصفحة دي
// بس بتعرضه وبتقرأ/تكتب حالة التفعيل، مش بتولّد أو تعدّل أي نص.
//
// ملحوظة v1 (تُبلّغ للجلسة المنسّقة): جدول reminderRules مفيهوش عمود وقت لكل مستخدم،
// فالأوقات المعروضة هنا هي جدول افتراضي ثابت (DEFAULT_REMINDER_TIMES) بيستخدمه نفس
// محرك الإرسال الحقيقي في /api/cron/send-reminders — مش قيمة قابلة للتخصيص لحد الآن.

import { useCallback, useEffect, useState } from "react";

interface ReminderItem {
  type: string;
  label: string;
  enabled: boolean;
  time: string;
  doneToday: boolean;
}

const REMINDER_ICON_PATHS: Record<string, string> = {
  fajr: "M12 3v4M5.5 9l1.4 1.4M18.5 9l-1.4 1.4M2 16h20M6 16a6 6 0 0 1 12 0M2 20h20",
  dhuhr: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  asr: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  maghrib: "M12 4v4M5.5 9l1.4 1.4M18.5 9l-1.4 1.4M2 16h20M6 16a6 6 0 0 1 12 0M2 20h20M9 3h6",
  isha: "M20 14.5A9 9 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5ZM18 3l.6 1.7L20.3 5.3l-1.7.6L18 7.6l-.6-1.7L15.7 5.3l1.7-.6Z",
  quran: "M4 6.5A2.5 2.5 0 0 1 6.5 4H12v16H6.5A2.5 2.5 0 0 0 4 18.5ZM20 6.5A2.5 2.5 0 0 0 17.5 4H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5Z",
  adhkar: "M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z",
  sadaqah:
    "M12 20.5s-6.7-4.2-9.2-7.9C1 9.8 1.6 6.5 4.4 5.1a4.7 4.7 0 0 1 7.1 1.9 4.7 4.7 0 0 1 7.1-1.9c2.8 1.4 3.4 4.7 1.6 7.5-2.5 3.7-9.2 7.9-9.2 7.9Z",
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type PushState = "unknown" | "unsupported" | "subscribed" | "not-subscribed";

export default function NotificationsPage() {
  const [items, setItems] = useState<ReminderItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushState, setPushState] = useState<PushState>("unknown");
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [togglingType, setTogglingType] = useState<string | null>(null);

  // بنجيب حالة التذكيرات مرة واحدة عند فتح الشاشة — بنفس نمط "cancelled" الآمن.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications/rules");
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { items: ReminderItem[] };
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("تعذّر تحميل التذكيرات — تأكد من الاتصال وحاول تاني");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function checkSubscription() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushState(sub ? "subscribed" : "not-subscribed");
      } catch {
        setPushState("not-subscribed");
      }
    }
    checkSubscription();
  }, []);

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("unsupported");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError("محتاجين إذنك عشان نبعتلك التذكيرات");
        return;
      }
      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
      if (!publicKey) {
        setPushError("مفاتيح الإشعارات لسه مش متظبطة على السيرفر (v1 — راجع .env)");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("failed");
      setPushState("subscribed");
    } catch {
      setPushError("تعذّر تفعيل الإشعارات — حاول تاني");
    } finally {
      setPushBusy(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState("not-subscribed");
    } catch {
      setPushError("تعذّر إيقاف الإشعارات — حاول تاني");
    } finally {
      setPushBusy(false);
    }
  }, []);

  const toggleRule = useCallback(async (type: string, nextEnabled: boolean) => {
    setTogglingType(type);
    setItems((prev) =>
      prev ? prev.map((it) => (it.type === type ? { ...it, enabled: nextEnabled } : it)) : prev
    );
    try {
      await fetch("/api/notifications/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, enabled: nextEnabled }),
      });
    } catch {
      // هنسيب الحالة المتفائلة — هتتصحح مع أي تحديث لاحق للصفحة
    } finally {
      setTogglingType(null);
    }
  }, []);

  const pending = items?.filter((i) => i.enabled && !i.doneToday) ?? [];
  const doneToday = items?.filter((i) => i.doneToday) ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-6">
      <div>
        <div className="text-[17px] font-extrabold text-ink">التذكيرات</div>
        <div className="mt-0.5 text-[11.5px] text-ink-muted">
          إشعارات حقيقية (Web Push) لثوابتك اليومية ومهامك — مش مجرد محاكاة
        </div>
      </div>

      {pushState === "not-subscribed" && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-green-2 p-4 text-white">
          <div className="text-[14px] font-extrabold">فعّل الإشعارات</div>
          <div className="text-[12px] leading-[1.7] text-white/75">
            عشان التذكيرات توصلك فعليًا على الجهاز ده، حتى لو التطبيق مقفول.
          </div>
          <button
            type="button"
            onClick={enablePush}
            disabled={pushBusy}
            className="mt-1 flex h-[42px] items-center justify-center rounded-xl bg-gold text-[13.5px] font-bold text-green-2 disabled:opacity-60"
          >
            {pushBusy ? "جارِ التفعيل…" : "تفعيل الإشعارات"}
          </button>
        </div>
      )}

      {pushState === "subscribed" && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green" />
            <span className="text-[12.5px] font-bold text-ink">الإشعارات مفعّلة على الجهاز ده</span>
          </div>
          <button
            type="button"
            onClick={disablePush}
            disabled={pushBusy}
            className="text-[11.5px] text-ink-muted underline disabled:opacity-60"
          >
            إيقاف
          </button>
        </div>
      )}

      {pushState === "unsupported" && (
        <div className="rounded-xl bg-surface-2 p-3 text-[12px] text-ink-muted">
          المتصفح ده مش بيدعم إشعارات Push — جرّب من موبايل أو متصفح تاني.
        </div>
      )}

      {pushError && (
        <div className="rounded-xl bg-terracotta-soft p-3 text-[12px] text-terracotta">{pushError}</div>
      )}

      {error && <div className="rounded-xl bg-terracotta-soft p-3 text-[12.5px] text-terracotta">{error}</div>}
      {!items && !error && <div className="py-6 text-center text-[13px] text-ink-muted">جارِ التحميل…</div>}

      {items && (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="text-[13px] font-extrabold text-ink">تذكيرات لسه مستحقة</div>
            {pending.length === 0 ? (
              <div className="rounded-xl bg-green-soft p-3.5 text-[12.5px] leading-[1.7] text-ink">
                مفيش تذكيرات مستحقة دلوقتي — إما خلصتها كلها، أو معطّلة من الإعدادات تحت.
              </div>
            ) : (
              pending.map((item) => (
                <div
                  key={item.type}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--gold)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={REMINDER_ICON_PATHS[item.type] ?? ""} />
                    </svg>
                    <div className="flex-1 text-[14px] font-extrabold text-ink">{item.label}</div>
                    <div className="text-[11.5px] text-ink-muted">{item.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {doneToday.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-extrabold text-ink">تم اليوم</div>
              <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-3">
                {doneToday.map((item) => (
                  <div key={item.type} className="flex items-center gap-2 py-1">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-soft">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--green)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[12.5px] text-ink-muted">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <div>
              <div className="text-[13px] font-extrabold text-ink">إعدادات التذكيرات</div>
              <div className="mt-0.5 text-[11px] text-ink-muted">
                الأوقات دي افتراضية (v1) — لسه مفيش دعم لتخصيص وقت لكل تذكير بمفرده.
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-2">
              {items.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between gap-3 border-b border-border px-2.5 py-3 last:border-b-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold text-ink">{item.label}</span>
                    <span className="text-[11px] text-ink-muted">حوالي {item.time}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.enabled}
                    disabled={togglingType === item.type}
                    onClick={() => toggleRule(item.type, !item.enabled)}
                    className="relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors disabled:opacity-60"
                    style={{ background: item.enabled ? "var(--green)" : "var(--border)" }}
                  >
                    <span
                      className="absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white transition-[right]"
                      style={{ right: item.enabled ? "3px" : "23px" }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
