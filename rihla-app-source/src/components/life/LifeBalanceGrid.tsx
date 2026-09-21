"use client";

import { useState, useTransition } from "react";
import {
  LIFE_BALANCE_DOMAIN_LABELS,
  LIFE_BALANCE_DOMAIN_ORDER,
  LIFE_BALANCE_STATUS_LABELS,
  LIFE_BALANCE_STATUS_ORDER,
  LIFE_BALANCE_STATUS_TONE,
  type LifeBalanceDomainKey,
  type LifeBalanceStatus,
} from "@/lib/life-balance";

export interface LifeBalanceAreaData {
  domainKey: LifeBalanceDomainKey;
  status: LifeBalanceStatus;
  note: string | null;
}

const TONE_FG: Record<string, string> = {
  green: "var(--green)",
  gold: "#8A611A",
  terracotta: "var(--terracotta)",
};
const TONE_BG: Record<string, string> = {
  green: "var(--green-soft)",
  gold: "var(--gold-soft)",
  terracotta: "var(--terracotta-soft)",
};
const TONE_RING: Record<string, string> = {
  green: "var(--green)",
  gold: "var(--gold)",
  terracotta: "var(--terracotta)",
};

export function LifeBalanceGrid({ initialAreas }: { initialAreas: LifeBalanceAreaData[] }) {
  const initialMap = new Map(initialAreas.map((a) => [a.domainKey, a]));
  const [areas, setAreas] = useState<Record<LifeBalanceDomainKey, LifeBalanceAreaData>>(() => {
    const record = {} as Record<LifeBalanceDomainKey, LifeBalanceAreaData>;
    for (const key of LIFE_BALANCE_DOMAIN_ORDER) {
      record[key] = initialMap.get(key) ?? { domainKey: key, status: "stable", note: "" };
    }
    return record;
  });
  const [selected, setSelected] = useState<LifeBalanceDomainKey>("sp");
  const [noteDraft, setNoteDraft] = useState(areas.sp.note ?? "");
  const [noteDirty, setNoteDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function selectDomain(key: LifeBalanceDomainKey) {
    setSelected(key);
    setNoteDraft(areas[key].note ?? "");
    setNoteDirty(false);
    setError(null);
  }

  async function patch(domainKey: LifeBalanceDomainKey, body: { status?: LifeBalanceStatus; note?: string }) {
    setError(null);
    try {
      const res = await fetch("/api/life-balance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainKey, ...body }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAreas((prev) => ({ ...prev, [domainKey]: data.area }));
    } catch {
      setError("تعذّر الحفظ — حاول تاني");
    }
  }

  function changeStatus(status: LifeBalanceStatus) {
    startTransition(() => {
      patch(selected, { status });
    });
  }

  function saveNote() {
    startTransition(() => {
      patch(selected, { note: noteDraft }).then(() => setNoteDirty(false));
    });
  }

  const selDomain = areas[selected];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-2 gap-3">
        {LIFE_BALANCE_DOMAIN_ORDER.map((key) => {
          const area = areas[key];
          const tone = LIFE_BALANCE_STATUS_TONE[area.status];
          const isSel = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectDomain(key)}
              aria-pressed={isSel}
              className="flex w-full flex-col gap-2.5 rounded-2xl border-[1.5px] bg-surface p-3.5 text-right"
              style={{ borderColor: isSel ? TONE_RING[tone] : "var(--border)" }}
            >
              <div className="text-sm font-bold text-ink">{LIFE_BALANCE_DOMAIN_LABELS[key]}</div>
              <div
                className="self-start rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}
              >
                {LIFE_BALANCE_STATUS_LABELS[area.status]}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-4">
        <div className="text-[12.5px] font-extrabold text-ink-muted">
          {LIFE_BALANCE_DOMAIN_LABELS[selected]}
        </div>

        <div className="flex flex-wrap gap-2">
          {LIFE_BALANCE_STATUS_ORDER.map((status) => {
            const tone = LIFE_BALANCE_STATUS_TONE[status];
            const active = selDomain.status === status;
            return (
              <button
                key={status}
                type="button"
                disabled={isPending}
                onClick={() => changeStatus(status)}
                className="rounded-full border px-3 py-1.5 text-[12px] font-bold disabled:opacity-60"
                style={{
                  background: active ? TONE_BG[tone] : "var(--surface)",
                  color: active ? TONE_FG[tone] : "var(--ink-muted)",
                  borderColor: active ? TONE_RING[tone] : "var(--border)",
                }}
              >
                {LIFE_BALANCE_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        <textarea
          value={noteDraft}
          onChange={(e) => {
            setNoteDraft(e.target.value);
            setNoteDirty(true);
          }}
          placeholder="اكتب ملاحظة عن المجال ده..."
          className="min-h-[70px] resize-none rounded-xl border border-border bg-surface p-3 text-[13.5px] leading-[1.8] text-ink placeholder:text-ink-muted"
        />

        {noteDirty ? (
          <button
            type="button"
            onClick={saveNote}
            disabled={isPending}
            className="self-start rounded-xl bg-green px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            حفظ الملاحظة
          </button>
        ) : null}

        {error ? <div className="text-[12px] text-terracotta">{error}</div> : null}
      </div>
    </div>
  );
}
