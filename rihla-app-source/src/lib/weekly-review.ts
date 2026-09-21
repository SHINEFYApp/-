// رحلة — المراجعة الأسبوعية (Weekly Review)
//
// اصطلاح بداية الأسبوع (Week-start convention):
// نموذج الواجهات المعتمد Review.dc.html بيعرض مدى تاريخ ثابت "١٤ – ٢٠ سبتمبر" وشارت أسبوعي
// بترتيب أيام: أحد، اثنين، ثلاثاء، أربعاء، خميس، جمعة، سبت — يعني الأسبوع بيبدأ الأحد وبينتهي السبت
// (١٤ سبتمبر ٢٠٢٥ كان فعليًا يوم أحد، و٢٠ سبتمبر كان سبت، فده مطابق تمامًا لترتيب الشارت).
// عشان كده اخترنا: بداية الأسبوع = أقرب يوم أحد سابق أو يساوي اليوم الحالي (تاريخ بس، بدون وقت،
// بتوقيت UTC عشان يطابق طريقة تخزين أعمدة date في Drizzle/Postgres — راجع mapFromDriverValue
// في node_modules/drizzle-orm/pg-core/columns/date.js).

const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

// نفس ترتيب أيام الأسبوع الظاهر في شارت "الطاقة خلال الأسبوع" بالنموذج المعتمد (أحد → سبت)
export const WEEKDAY_LABELS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function toDateOnlyUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** بداية الأسبوع (الأحد) لأي تاريخ مرجعي — كتاريخ فقط بتوقيت UTC */
export function getWeekStart(reference: Date = new Date()): Date {
  const d = toDateOnlyUTC(reference);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  return d;
}

export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toArabicIndic(n: number): string {
  return String(n)
    .split("")
    .map((ch) => ARABIC_INDIC_DIGITS[Number(ch)] ?? ch)
    .join("");
}

/** يبني نص "١٤ – ٢٠ سبتمبر" (أو بشهرين لو الأسبوع عدّى من شهر لشهر) */
export function formatWeekRangeArabic(weekStart: Date, weekEnd: Date): string {
  const startDay = toArabicIndic(weekStart.getUTCDate());
  const endDay = toArabicIndic(weekEnd.getUTCDate());
  const startMonth = ARABIC_MONTHS[weekStart.getUTCMonth()];
  const endMonth = ARABIC_MONTHS[weekEnd.getUTCMonth()];
  if (weekStart.getUTCMonth() === weekEnd.getUTCMonth()) {
    return `${startDay} – ${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

export interface DailyLogLike {
  date: Date;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  quran: boolean;
  adhkarMorning: boolean;
  adhkarEvening: boolean;
  sadaqah: boolean;
}

export interface WeeklyWorshipStats {
  prayersOnTime: number; // من ٣٥ (٧ أيام × ٥ صلوات)
  quranDays: number; // من ٧
  sadaqahRegular: boolean;
  sadaqahDays: number;
  dailyActivity: { dayIndex: number; label: string; fraction: number; hasData: boolean }[];
}

// عدد الحد الأدنى من أيام الصدقة عشان تتوصف "منتظمة" — أغلبية الأسبوع (٤ من ٧)
const SADAQAH_REGULAR_THRESHOLD = 4;

/**
 * إحصاءات حقيقية من dailyLogs للأسبوع المحدد — بدون أي رقم مفبرك.
 * ملحوظة مهمة: النموذج المعتمد بيعرض شارت "الطاقة خلال الأسبوع"، لكن مفيش أي حقل "طاقة" في
 * الـ schema (dailyLogs مفيهاش self-reported energy). بدل ما نفبرك رقم، بنبني نفس الشكل البصري
 * (٧ أعمدة) من نشاط عبادي حقيقي: نسبة العناصر التعبدية المنجزة في اليوم من أصل ٩ عناصر حقيقية
 * (٥ صلوات + قرآن + ذكر الصبح + ذكر المساء + صدقة) — ده بيتعرض في الواجهة تحت اسم صريح
 * "نشاط العبادة اليومي"، مش "الطاقة"، عشان ميبقاش رقم مُدّعى غير موجود فعليًا في البيانات.
 */
const WORSHIP_ITEMS_PER_DAY = 9;

export function computeWeeklyStats(logs: DailyLogLike[], weekStart: Date): WeeklyWorshipStats {
  const byDate = new Map(logs.map((log) => [dateKey(toDateOnlyUTC(log.date)), log]));

  let prayersOnTime = 0;
  let quranDays = 0;
  let sadaqahDays = 0;
  const dailyActivity: WeeklyWorshipStats["dailyActivity"] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    const log = byDate.get(dateKey(d));

    if (log) {
      const prayerCount = [log.fajr, log.dhuhr, log.asr, log.maghrib, log.isha].filter(
        Boolean
      ).length;
      prayersOnTime += prayerCount;
      if (log.quran) quranDays += 1;
      if (log.sadaqah) sadaqahDays += 1;

      const completed =
        prayerCount +
        (log.quran ? 1 : 0) +
        (log.adhkarMorning ? 1 : 0) +
        (log.adhkarEvening ? 1 : 0) +
        (log.sadaqah ? 1 : 0);
      dailyActivity.push({
        dayIndex: i,
        label: WEEKDAY_LABELS_AR[i],
        fraction: completed / WORSHIP_ITEMS_PER_DAY,
        hasData: true,
      });
    } else {
      dailyActivity.push({ dayIndex: i, label: WEEKDAY_LABELS_AR[i], fraction: 0, hasData: false });
    }
  }

  return {
    prayersOnTime,
    quranDays,
    sadaqahRegular: sadaqahDays >= SADAQAH_REGULAR_THRESHOLD,
    sadaqahDays,
    dailyActivity,
  };
}
