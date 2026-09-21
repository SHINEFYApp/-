// رحلة — حساب اتجاه القبلة (بوصلة القبلة)
//
// حساب هندسي بحت (great-circle bearing) لمسافة بين نقطتين على الكرة الأرضية —
// مفيش أي محتوى ديني هنا، الإحداثيات بس إحداثيات الكعبة المشرّفة الجغرافية.

// إحداثيات الكعبة المشرّفة (مكة المكرمة)
export const KAABA_LAT = 21.4225;
export const KAABA_LON = 39.8262;

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** زاوية اتجاه القبلة من الشمال الحقيقي (بالدرجات، ٠-٣٦٠) انطلاقًا من موقع المستخدم */
export function computeQiblaBearing(lat: number, lon: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA_LAT);
  const deltaLambda = toRad(KAABA_LON - lon);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return (toDeg(theta) + 360) % 360;
}

/** المسافة التقريبية بالكيلومتر بين موقع المستخدم والكعبة المشرّفة (صيغة هافرساين) */
export function computeDistanceToKaabaKm(lat: number, lon: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA_LAT);
  const deltaPhi = toRad(KAABA_LAT - lat);
  const deltaLambda = toRad(KAABA_LON - lon);

  const a =
    Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}
