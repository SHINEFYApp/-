// رحلة — كتالوج "مصادر مقترحة" (أنواع محتوى، مش أسماء قنوات — راجع دستور المشروع)
//
// ⚠️ هذا الملف منقول حرفيًا (بدون أي تعديل أو إعادة صياغة) من الـ catalog array داخل
//    renderVals في نموذج الواجهات المعتمد:
//    /home/claude/islamic-life-os/prototype/project/Sources.dc.html
// أي إضافة أو تعديل مستقبلي لازم يمر على مراجعة خالد قبل الدمج — مش قرار agent منفرد.

export type SourceInterestKey =
  | "tafsir"
  | "tazkiyah"
  | "fiqh_life"
  | "seerah"
  | "podcast_long"
  | "short_daily";

export interface SourceCatalogEntry {
  key: SourceInterestKey;
  chipLabel: string;
  title: string;
  descYouth: string;
  descAdult: string;
  whyLine: string;
  searchHint: string;
}

export const SOURCES_CATALOG: SourceCatalogEntry[] = [
  {
    key: "tafsir",
    chipLabel: "تفسير مبسط",
    title: "تفسير قصير وسهل لسور من القرآن",
    descYouth: "شرح بسيط وسريع من غير تعقيد، يربطك بالمعنى في دقايق معدودة.",
    descAdult: "تفسير يركّز على المعنى العملي للآية وإزاي تعيشها في يومك، من غير إطالة أكاديمية.",
    whyLine: "بيرجّعك لمعنى القرآن اللي بتقرأه في وردك اليومي",
    searchHint: '"تفسير ميسر" + اسم السورة اللي بتقراها',
  },
  {
    key: "tazkiyah",
    chipLabel: "تزكية وروحانيات",
    title: "محتوى عن تزكية النفس وصفاء القلب",
    descYouth: "كلام بيلمس القلب مباشرة، مفيد وقت التشتت أو لما تحس إنك بعيد شوية.",
    descAdult: "طرح هادئ وعميق حوالين الإخلاص والصبر والرضا — مناسب لحظة هدوء في يومك.",
    whyLine: "مناسب لو بتحس بتشتت ذهني أو فتور من وقت لآخر",
    searchHint: '"دروس تزكية النفس" أو "علاج القسوة في القلب"',
  },
  {
    key: "fiqh_life",
    chipLabel: "فقه حياة يومية",
    title: "أحكام عملية لشغلك وتعاملاتك اليومية",
    descYouth: "قواعد عملية وواضحة لمواقف بتواجهها في الدراسة والشغل والتعامل مع الناس.",
    descAdult: "أحكام البيع والشراء والشراكة والزكاة على الأرباح — مفيدة لأي حد بيدير مشروع أو تجارة.",
    whyLine: "مهم بالذات وانت بتدير أكتر من مشروع في نفس الوقت",
    searchHint: '"أحكام البيع والشراء في الإسلام" أو "فقه المعاملات المالية"',
  },
  {
    key: "seerah",
    chipLabel: "قصص وسيرة",
    title: "قصص الأنبياء والسيرة النبوية",
    descYouth: "حكايات حقيقية بدروس عملية، مش مجرد سرد تاريخي.",
    descAdult: "مواقف من السيرة بتوضح إزاي تتعامل مع ضغط الشغل والحياة زي ما تعامل النبي ﷺ مع أصعب المواقف.",
    whyLine: "صيغة قصصية سهلة الاستيعاب حتى في وقت التعب",
    searchHint: '"قصص الأنبياء مختصرة" أو "السيرة النبوية للكبار"',
  },
  {
    key: "podcast_long",
    chipLabel: "بودكاست للطريق",
    title: "حلقات صوتية طويلة تسمعها وانت في طريقك أو شغلك",
    descYouth: "حوارات طويلة وممتعة، مناسبة وانت ماشي أو قاعد تذاكر.",
    descAdult: "حلقات نقاشية عميقة تسمعها في التنقل بين شغلك ومشاريعك من غير ما تاخد وقت إضافي من يومك.",
    whyLine: "يناسب وقتك المشغول — تسمعه من غير ما توقف شغلك",
    searchHint: '"بودكاست إسلامي" + الموضوع اللي بيهمك',
  },
  {
    key: "short_daily",
    chipLabel: "محتوى قصير يومي",
    title: "فيديوهات قصيرة يومية — جرعة إيمانية سريعة",
    descYouth: "دقيقة أو دقيقتين بس، تفتح بيها يومك أو تقفله.",
    descAdult: "محتوى مختصر ومركّز لأوقات ضيق الوقت، من غير ما يستهلك من جدولك.",
    whyLine: "أنسب صيغة لو وقتك ضيق فعلاً",
    searchHint: '"تذكير يومي قصير" أو "دقيقة إيمانية"',
  },
];

export type SourceAgeRange = "18-24" | "25-34" | "35-44" | "45+";

export const SOURCE_AGE_OPTIONS: { key: SourceAgeRange; label: string }[] = [
  { key: "18-24", label: "١٨ – ٢٤" },
  { key: "25-34", label: "٢٥ – ٣٤" },
  { key: "35-44", label: "٣٥ – ٤٤" },
  { key: "45+", label: "٤٥ فأكتر" },
];

export function isSourceInterestKey(value: string): value is SourceInterestKey {
  return SOURCES_CATALOG.some((c) => c.key === value);
}

export function isSourceAgeRange(value: string): value is SourceAgeRange {
  return SOURCE_AGE_OPTIONS.some((a) => a.key === value);
}
