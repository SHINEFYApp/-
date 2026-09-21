"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const AGE_RANGES = [
  { value: "", label: "تفضّل ما تقولش" },
  { value: "under_18", label: "أقل من ١٨" },
  { value: "18_24", label: "١٨ - ٢٤" },
  { value: "25_34", label: "٢٥ - ٣٤" },
  { value: "35_44", label: "٣٥ - ٤٤" },
  { value: "45_54", label: "٤٥ - ٥٤" },
  { value: "55_plus", label: "٥٥ فأكتر" },
];

// شاشة إنشاء حساب — تصميم جديد (مفيش نموذج معتمد للمصادقة) بنفس هوية الشاشة الافتتاحية (page.tsx)
// ونفس الـ design tokens المستخدمة في نموذج الواجهات المعتمد.
export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("كلمة السر لازم تكون ٨ أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
          ageRange: ageRange || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "حصل خطأ، جرب تاني");
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("اتسجّل الحساب، بس حصلت مشكلة في تسجيل الدخول. جرب تسجّل دخول يدوي.");
        setLoading(false);
        return;
      }

      router.push("/onboarding/discovery");
    } catch {
      setError("حصلت مشكلة في الاتصال، جرب تاني");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-bg px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="font-arabic-display text-[34px] font-bold leading-none text-green-2">
          رِحلة
        </div>
        <div className="text-sm text-ink-muted">إنشاء حساب جديد</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="الاسم (اختياري)">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-ink outline-none focus:border-green"
            autoComplete="name"
          />
        </Field>

        <Field label="البريد الإلكتروني">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-ink outline-none focus:border-green"
            autoComplete="email"
            dir="ltr"
          />
        </Field>

        <Field label="كلمة السر">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="٨ أحرف على الأقل"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-ink outline-none focus:border-green"
            autoComplete="new-password"
            dir="ltr"
          />
        </Field>

        <Field label="الفئة العمرية (اختياري)">
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-ink outline-none focus:border-green"
          >
            {AGE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft px-4 py-3 text-sm font-medium text-terracotta">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-14 items-center justify-center rounded-2xl bg-green text-base font-bold text-white disabled:opacity-60"
        >
          {loading ? "جاري الإنشاء..." : "نبدأ رحلتنا"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-ink-muted">
        عندك حساب بالفعل؟{" "}
        <Link href="/auth/sign-in" className="font-bold text-green-2">
          سجّل الدخول
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-bold text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
