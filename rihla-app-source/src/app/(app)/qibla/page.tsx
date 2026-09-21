import { QiblaCompass } from "@/components/qibla/QiblaCompass";

// شاشة "اتجاه القبلة" — حساب هندسي بحت (بيرنج + مسافة) لموقع المستخدم اتجاه الكعبة،
// مفيش أي منطق سيرفر أو داتا بيز هنا، كله عميل (يحتاج GPS/بوصلة المتصفح).
export default function QiblaPage() {
  return (
    <div className="flex flex-col gap-[18px] px-5 pb-4 pt-[22px]">
      <div>
        <div className="text-xl font-extrabold text-ink">اتجاه القبلة</div>
        <div className="mt-[3px] text-[12.5px] text-ink-muted">بوصلة تقديرية باستخدام موقعك الحالي</div>
      </div>

      <QiblaCompass />
    </div>
  );
}
