import { KAFFARAT_GENERAL_NOTE, KAFFARAT_LIBRARY, TAWBAH_REFS } from "@/lib/kaffarat-content";

// شاشة "الكفارات" — محتوى شرعي ثابت (مش شات، مفيش أي نص بيتولّد وقت التشغيل)،
// منقول حرفيًا من src/lib/kaffarat-content.ts (راجع الرأس هناك لقاعدة عدم التوليد).
export default function KaffaratPage() {
  return (
    <div className="flex flex-col gap-[18px] px-5 pb-4 pt-[22px]">
      <div>
        <div className="text-xl font-extrabold text-ink">الكفارات</div>
        <div className="mt-[3px] text-[12.5px] text-ink-muted">كفارات شعائرية محددة لمواقف بعينها</div>
      </div>

      <div className="rounded-2xl border-[1.5px] border-gold bg-gold-soft p-4">
        <p className="text-[12.5px] font-semibold leading-relaxed text-ink">{KAFFARAT_GENERAL_NOTE}</p>
      </div>

      {KAFFARAT_LIBRARY.map((entry) => (
        <div key={entry.key} className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4">
          <div className="text-[14px] font-extrabold text-ink">{entry.title}</div>
          <p className="text-[12.5px] leading-relaxed text-ink-muted">{entry.when}</p>

          <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2 p-3">
            <span className="text-[11.5px] font-bold text-green">الترتيب الشرعي (بالتنازل من الأول للأخير)</span>
            <ol className="flex flex-col gap-1 ps-4 text-[12.5px] leading-relaxed text-ink" style={{ listStyleType: "decimal" }}>
              {entry.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {entry.refs.map((ref, i) => (
            <div key={i} className="flex flex-col gap-1 border-t border-border pt-2.5">
              <p className="text-[13px] leading-[1.9] text-ink" dir="rtl">
                {ref.text}
              </p>
              <span className="text-[11px] font-semibold text-ink-muted">{ref.source}</span>
            </div>
          ))}

          {entry.note && (
            <p className="rounded-xl bg-terracotta-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-terracotta">
              {entry.note}
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4">
        <div className="text-[14px] font-extrabold text-ink">تكفير الذنوب العادية بالتوبة (زي الكذب)</div>
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          مش كل ذنب له كفارة شعائرية محددة. الكذب وأغلب المعاصي اليومية تُكفَّر بالتوبة الصادقة (الندم + الإقلاع + العزم على عدم العودة)، والاستغفار، وإتباع السيئة بالحسنة — مش بصيام أو إطعام مقدّر.
        </p>
        {TAWBAH_REFS.map((ref, i) => (
          <div key={i} className="flex flex-col gap-1 border-t border-border pt-2.5">
            <p className="text-[13px] leading-[1.9] text-ink" dir="rtl">
              {ref.text}
            </p>
            <span className="text-[11px] font-semibold text-ink-muted">{ref.source}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-ink-muted">
        هذا المحتوى مرجع تعليمي عام وليس فتوى لحالتك الشخصية، خصوصًا في مسائل الزواج والطلاق — لتفاصيل حالتك ارجع لعالِم شرعي أو دار إفتاء موثوقة.
      </p>
    </div>
  );
}
