"use client";

import { useEffect, useState } from "react";

interface FollowedChannel {
  id: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  source: string;
}

interface ConnectionStatus {
  configured: boolean;
  google: { connected: boolean; email?: string | null };
}

// ربط الحسابات — يوتيوب (اشتراكاتك تلقائي بعد الربط، أو قنوات تضيفها يدويًا) عشان
// الترشيحات اليومية تبقى مبنية على اللي انت فعلاً بتتابعه. قرار خالد الصريح إن الاتنين
// (ربط حقيقي + إضافة يدوية) يشتغلوا مع بعض، مش واحد بس.
export function ConnectedAccounts() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [channels, setChannels] = useState<FollowedChannel[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, channelsRes] = await Promise.all([
          fetch("/api/connections/status"),
          fetch("/api/youtube/subscriptions"),
        ]);
        if (cancelled) return;
        if (statusRes.ok) setStatus(await statusRes.json());
        if (channelsRes.ok) {
          const data = await channelsRes.json();
          setChannels(data.channels ?? []);
        }
      } catch {
        // تجاهل — الواجهة بتفضل شغالة بحالة "مش متربط"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function syncSubscriptions() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/youtube/subscriptions", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "حصل خطأ في المزامنة");
      } else {
        setMessage(`اتزامن ${data.count} قناة`);
        const listRes = await fetch("/api/youtube/subscriptions");
        if (listRes.ok) setChannels((await listRes.json()).channels ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/connections/google/disconnect", { method: "POST" });
      setStatus((s) => (s ? { ...s, google: { connected: false } } : s));
    } finally {
      setBusy(false);
    }
  }

  async function addChannel() {
    if (!query.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "مالقيناش القناة دي");
      } else {
        setQuery("");
        const listRes = await fetch("/api/youtube/subscriptions");
        if (listRes.ok) setChannels((await listRes.json()).channels ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeChannel(channelId: string) {
    setChannels((prev) => prev.filter((c) => c.channelId !== channelId));
    await fetch("/api/youtube/channels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
  }

  const connected = status?.google.connected ?? false;

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-[18px]">
      <div>
        <div className="text-[14.5px] font-bold text-ink">ربط الحسابات</div>
        <div className="mt-0.5 text-[12px] text-ink-muted">
          اربط يوتيوب عشان الترشيحات تتبني على القنوات اللي انت بتتابعها فعلاً، أو ضيف قنوات يدويًا
        </div>
      </div>

      {status && !status.configured && (
        <div className="rounded-[12px] bg-terracotta-soft p-3 text-[12.5px] text-terracotta">
          ربط الحسابات لسه مش متظبط من جهة السيرفر.
        </div>
      )}

      {status?.configured && (
        <div className="flex items-center justify-between rounded-[14px] bg-green-soft p-3.5">
          <div className="text-[13px] font-bold text-ink">
            {connected ? `متصل: ${status.google.email ?? "حساب جوجل"}` : "حساب جوجل (يوتيوب)"}
          </div>
          {connected ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={syncSubscriptions}
                disabled={busy}
                className="rounded-full bg-green px-3.5 py-2 text-[12px] font-bold text-white disabled:opacity-60"
              >
                مزامنة الاشتراكات
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={busy}
                className="rounded-full border border-border px-3.5 py-2 text-[12px] font-bold text-ink-muted"
              >
                فك الربط
              </button>
            </div>
          ) : (
            <a
              href="/api/connections/google/start"
              className="rounded-full bg-green px-3.5 py-2 text-[12px] font-bold text-white"
            >
              اربط حسابك
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold text-ink-muted">إضافة قناة يدويًا</div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم القناة على يوتيوب"
            className="h-[42px] flex-1 rounded-[12px] border border-border bg-bg px-3 text-[13px] text-ink"
          />
          <button
            type="button"
            onClick={addChannel}
            disabled={busy || !query.trim()}
            className="rounded-[12px] bg-gold px-4 text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            إضافة
          </button>
        </div>
      </div>

      {message && <div className="text-[12px] text-ink-muted">{message}</div>}

      {channels.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {channels.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-[12px] border border-border px-3 py-2"
            >
              <div className="text-[13px] font-bold text-ink">{c.channelTitle}</div>
              <button
                type="button"
                onClick={() => removeChannel(c.channelId)}
                className="text-[11.5px] font-bold text-terracotta"
              >
                إزالة
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
