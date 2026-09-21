"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { ContinuityResult, DailyLog, DailyLogToggleKey } from "@/lib/daily-log";
import type { KidsStory } from "@/lib/kids-stories";
import type { KidsHonestyStory } from "@/lib/kids-honesty-content";
import { WorshipCard } from "./WorshipCard";
import { ContinuityLight } from "./ContinuityLight";
import { SupportHabits } from "./SupportHabits";

interface HomeDashboardProps {
  userName: string;
  avatarLetter: string;
  dateLabel: string;
  initialLog: DailyLog;
  continuity: ContinuityResult;
  // من غير null إلا في نسخة الأطفال بس (راجع src/lib/kids-mode.ts) — لو موجودة بيظهر كارت
  // "قصة اليوم" في أعلى الشاشة قبل أي حاجة تانية، وتيجي دايمًا مع honestyStory (نفس الشرط).
  todayStory?: KidsStory | null;
  // "قصة الأمانة" — وضع الأطفال بس، منفصلة تمامًا عن todayStory (راجع رأس kids-honesty-content.ts).
  honestyStory?: KidsHonestyStory | null;
  initialTalkedToTrustedAdult?: boolean;
}

// لوحة "اليوم" — المكوّن العميل الوحيد اللي بيمسك حالة سجل اليوم ويكلّم API التوجل.
// التحديث تفاؤلي (بيتغيّر الشكل فورًا) لكن بيتصالح دايمًا مع رد السيرفر، وبيرجع لقيمته
// القديمة لو الطلب فشل.
export function HomeDashboard({
  userName,
  avatarLetter,
  dateLabel,
  initialLog,
  continuity,
  todayStory,
  honestyStory,
  initialTalkedToTrustedAdult,
}: HomeDashboardProps) {
  const [log, setLog] = useState<DailyLog>(initialLog);
  const [pendingKeys, setPendingKeys] = useState<Set<DailyLogToggleKey>>(new Set());
  const [talkedToTrustedAdult, setTalkedToTrustedAdult] = useState(Boolean(initialTalkedToTrustedAdult));
  const [honestyPending, setHonestyPending] = useState(false);

  const markTalkedToTrustedAdult = useCallback(async () => {
    setTalkedToTrustedAdult(true);
    setHonestyPending(true);
    try {
      const res = await fetch("/api/kids/honesty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talkedToTrustedAdult: true }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTalkedToTrustedAdult(false);
    } finally {
      setHonestyPending(false);
    }
  }, []);

  const toggle = useCallback(async (key: DailyLogToggleKey) => {
    setLog((prev) => ({ ...prev, [key]: !prev[key] }));
    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      const res = await fetch("/api/daily-logs/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
      const data: { log: DailyLog } = await res.json();
      // بنستبدل الحقول المنطقية بحقيقة السيرفر، مع الإبقاء على date الأصلي (كائن Date حقيقي
      // جاي من الـ props)، لأن رد الـ API JSON بيحوّل التاريخ لنص مش Date.
      setLog((prev) => ({ ...prev, ...data.log, date: prev.date }));
    } catch {
      // تراجع عن التحديث التفاؤلي لو الطلب فشل
      setLog((prev) => ({ ...prev, [key]: !prev[key] }));
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-4 px-5 pb-4 pt-[22px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[20px] font-extrabold">السلام عليكم، {userName}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-muted">{dateLabel}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/notifications"
            aria-label="التذكيرات"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
              <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
            </svg>
          </Link>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-soft text-[15px] font-extrabold text-green">
            {avatarLetter}
          </div>
        </div>
      </div>

      {todayStory && (
        <div className="rounded-[16px] border border-gold/40 bg-gold-soft p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[15px]">📖</span>
            <span className="text-[12.5px] font-extrabold text-gold">قصة اليوم</span>
          </div>
          <div className="text-[14px] font-bold text-ink">{todayStory.title}</div>
          <div className="mt-1.5 text-[13px] leading-[1.8] text-ink-muted">{todayStory.body}</div>
        </div>
      )}

      {honestyStory && (
        <div className="rounded-[16px] border border-green/30 bg-green-soft p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[15px]">🤝</span>
            <span className="text-[12.5px] font-extrabold text-green">قصة الأمانة</span>
          </div>
          <div className="text-[14px] font-bold text-ink">{honestyStory.title}</div>
          <div className="mt-1.5 text-[13px] leading-[1.8] text-ink-muted">{honestyStory.body}</div>
          <div className="mt-2.5 rounded-xl bg-surface p-2.5 text-[12.5px] leading-relaxed text-ink-muted">
            {honestyStory.talkingPoint}
          </div>
          {talkedToTrustedAdult ? (
            <div className="mt-2.5 text-[12px] font-bold text-green">تمام، الحمد لله 🌿</div>
          ) : (
            <button
              type="button"
              disabled={honestyPending}
              onClick={markTalkedToTrustedAdult}
              className="mt-2.5 rounded-xl bg-green px-3.5 py-2 text-[12px] font-bold text-white disabled:opacity-60"
            >
              اتكلمت مع حد كبير بثق فيه عن القصة دي
            </button>
          )}
        </div>
      )}

      <WorshipCard log={log} pendingKeys={pendingKeys} onToggle={toggle} />

      <ContinuityLight continuity={continuity} />

      <SupportHabits log={log} pendingKeys={pendingKeys} onToggle={toggle} />

      <Link
        href="/dhikr"
        className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-2 p-[14px]"
      >
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-gold-soft">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z" />
          </svg>
        </div>
        <div className="grow">
          <div className="text-[13.5px] font-bold">أذكار سريعة</div>
          <div className="mt-px text-[11.5px] text-ink-muted">عندك دقيقة؟ املاها بذكر</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>

      <Link
        href="/sources"
        className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-2 p-[14px]"
      >
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-gold-soft">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H12v16H6.5A2.5 2.5 0 0 0 4 18.5Z" />
            <path d="M20 6.5A2.5 2.5 0 0 0 17.5 4H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5Z" />
          </svg>
        </div>
        <div className="grow">
          <div className="text-[13.5px] font-bold">مصادر مقترحة ليك</div>
          <div className="mt-px text-[11.5px] text-ink-muted">محتوى يناسب شخصيتك واهتماماتك</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>

      <Link
        href="/qibla"
        className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-2 p-[14px]"
      >
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-green-soft">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            <path d="M12 12 15.5 7 12 15.5z" fill="var(--green)" stroke="none" />
          </svg>
        </div>
        <div className="grow">
          <div className="text-[13.5px] font-bold">اتجاه القبلة</div>
          <div className="mt-px text-[11.5px] text-ink-muted">بوصلة تقديرية لاتجاه الكعبة من موقعك</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>

      <Link
        href="/zakat"
        className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-2 p-[14px]"
      >
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-gold-soft">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1 2.5 2c0 2-5 1.5-5 4 0 1 1.1 2 2.5 2s2.5-1.1 2.5-2.5" />
          </svg>
        </div>
        <div className="grow">
          <div className="text-[13.5px] font-bold">حاسبة الزكاة</div>
          <div className="mt-px text-[11.5px] text-ink-muted">احسب النصاب وتابع موعد الاستحقاق</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>

      <Link
        href="/kaffarat"
        className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-2 p-[14px]"
      >
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-terracotta-soft">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 7v5c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V7z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div className="grow">
          <div className="text-[13.5px] font-bold">الكفارات</div>
          <div className="mt-px text-[11.5px] text-ink-muted">كفارة اليمين، الظهار، الفطر العمد وغيرها</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>

      {!todayStory && (
        <Link
          href="/challenges"
          className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-2 p-[14px]"
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-green-soft">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v6M12 3c-3 0-5 2-5 5s2 4 5 4 5-2 5-4-2-5-5-5Z" />
              <path d="M8 21c0-3.5 2-5.5 4-5.5s4 2 4 5.5" />
            </svg>
          </div>
          <div className="grow">
            <div className="text-[13.5px] font-bold">تحدي كسر العادة</div>
            <div className="mt-px text-[11.5px] text-ink-muted">خطوة خطوة، بلا حكم ولا مقارنة</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
}
