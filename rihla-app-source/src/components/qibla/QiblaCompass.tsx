"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeDistanceToKaabaKm, computeQiblaBearing } from "@/lib/qibla";

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; lat: number; lon: number };

// نوع مساعد لواجهة iOS الخاصة (webkitCompassHeading + requestPermission) — مش جزء من
// TypeScript القياسي، فبنعرّفها يدويًا هنا بدل any عشوائية.
interface IOSDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}
interface DeviceOrientationEventConstructorWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export function QiblaCompass() {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [heading, setHeading] = useState<number | null>(null);
  const [compassActive, setCompassActive] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const listenerAttached = useRef(false);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocation({ status: "error", message: "المتصفح ده مش بيدعم تحديد الموقع." });
      return;
    }
    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ status: "ready", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocation({ status: "error", message: "تعذّر تحديد موقعك — تأكد إنك سمحت للتطبيق بالوصول للموقع." }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const iosEvent = event as IOSDeviceOrientationEvent;
    if (typeof iosEvent.webkitCompassHeading === "number") {
      setHeading(iosEvent.webkitCompassHeading);
    } else if (event.alpha !== null) {
      setHeading(360 - event.alpha);
    }
  }, []);

  const activateCompass = useCallback(async () => {
    setCompassError(null);
    try {
      const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorWithPermission;
      if (typeof ctor.requestPermission === "function") {
        const permission = await ctor.requestPermission();
        if (permission !== "granted") {
          setCompassError("رفضت إذن البوصلة — هنعرض الاتجاه بالأرقام بدل البوصلة الحية.");
          return;
        }
      }
      window.addEventListener("deviceorientation", handleOrientation, true);
      listenerAttached.current = true;
      setCompassActive(true);
    } catch {
      setCompassError("جهازك مش بيدعم البوصلة الحية — هنعرض الاتجاه بالأرقام.");
    }
  }, [handleOrientation]);

  useEffect(() => {
    return () => {
      if (listenerAttached.current) {
        window.removeEventListener("deviceorientation", handleOrientation, true);
      }
    };
  }, [handleOrientation]);

  const bearing = location.status === "ready" ? computeQiblaBearing(location.lat, location.lon) : null;
  const distanceKm = location.status === "ready" ? computeDistanceToKaabaKm(location.lat, location.lon) : null;

  // لو البوصلة الحية شغالة: السهم بيتثبت على اتجاه القبلة الحقيقي بغض النظر عن وضع
  // الموبايل (rotation نسبي = bearing - heading الحالي). لو مفيش بوصلة حية: السهم
  // بيتثبت على الزاوية من الشمال مباشرة (بافتراض إن الشاشة متجهة للشمال).
  const needleRotation = bearing === null ? 0 : compassActive && heading !== null ? bearing - heading : bearing;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-64 w-64 items-center justify-center">
        <svg width="256" height="256" viewBox="0 0 256 256" className="absolute inset-0">
          <circle cx="128" cy="128" r="120" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
          <circle cx="128" cy="128" r="100" fill="none" stroke="var(--border)" strokeWidth="1" />
          {["N", "E", "S", "W"].map((dir, i) => {
            const angle = i * 90;
            const rad = (angle * Math.PI) / 180;
            const x = 128 + 100 * Math.sin(rad);
            const y = 128 - 100 * Math.cos(rad);
            return (
              <text
                key={dir}
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill={dir === "N" ? "var(--terracotta)" : "var(--ink-muted)"}
              >
                {dir}
              </text>
            );
          })}
        </svg>

        {bearing !== null && (
          <div
            className="absolute inset-0 flex items-start justify-center transition-transform duration-300"
            style={{ transform: `rotate(${needleRotation}deg)` }}
          >
            <svg width="256" height="256" viewBox="0 0 256 256" className="absolute inset-0">
              <line x1="128" y1="128" x2="128" y2="34" stroke="var(--green)" strokeWidth="4" strokeLinecap="round" />
              <polygon points="128,20 118,42 138,42" fill="var(--green)" />
              <circle cx="128" cy="128" r="7" fill="var(--green)" />
            </svg>
          </div>
        )}

        {bearing === null && (
          <span className="text-[12px] font-semibold text-ink-muted">حدد موقعك الأول</span>
        )}
      </div>

      {location.status === "idle" && (
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-full bg-green px-5 py-2.5 text-[13px] font-bold text-white"
        >
          حدد موقعي
        </button>
      )}

      {location.status === "loading" && <p className="text-[13px] text-ink-muted">جاري تحديد الموقع...</p>}

      {location.status === "error" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-[12.5px] font-semibold text-terracotta">{location.message}</p>
          <button
            type="button"
            onClick={requestLocation}
            className="rounded-full border border-border px-4 py-2 text-[12.5px] font-bold text-ink"
          >
            حاول تاني
          </button>
        </div>
      )}

      {location.status === "ready" && bearing !== null && (
        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex w-full items-center justify-around rounded-2xl border border-border bg-surface p-3.5">
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-ink-muted">اتجاه القبلة</span>
              <span className="text-[16px] font-extrabold text-ink">{Math.round(bearing)}° من الشمال</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-ink-muted">المسافة للكعبة</span>
              <span className="text-[16px] font-extrabold text-ink">{Math.round(distanceKm ?? 0).toLocaleString("ar-EG")} كم</span>
            </div>
          </div>

          {!compassActive && (
            <button
              type="button"
              onClick={() => void activateCompass()}
              className="rounded-full border border-green px-4 py-2 text-[12.5px] font-bold text-green"
            >
              فعّل البوصلة الحية (حرّك الموبايل)
            </button>
          )}
          {compassActive && (
            <p className="text-[12px] font-semibold text-green">البوصلة شغالة — السهم بيتبع اتجاه الكعبة لحظيًا.</p>
          )}
          {compassError && <p className="text-center text-[12px] text-ink-muted">{compassError}</p>}

          <p className="text-center text-[11px] leading-relaxed text-ink-muted">
            الاتجاه تقديري بناءً على GPS وبوصلة جهازك، وممكن يتأثر بدقة الجهاز أو وجود مجال مغناطيسي قريب (زي الحديد). للتأكد التام، قارن باتجاه أقرب مسجد.
          </p>
        </div>
      )}
    </div>
  );
}
