"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // فشل التسجيل مش لازم يوقف التطبيق — التذكيرات هتبقى معطّلة بس
      });
    }
  }, []);

  return null;
}
