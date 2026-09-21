"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

// شاشة تسجيل الدخول — تصميم جديد (مفيش نموذج معتمد للمصادقة) بنفس هوية الشاشة الافتتاحية (page.tsx)
// ونفس الـ design tokens المستخدمة في نموذج الواجهات المعتمد.
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("الإيميل أو كلمة السر مش صح");
        setLoading(false);
        return;
      }

      router.push("/home");
    } catch {
      setError("حصلت مشكلة في الاتصال، جرب تاني");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-bg px-6 py-10">
      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <div className="font-arabic-display text-[34px] font-bold leading-none text-green-2">
          رِحلة
        </div>
        <div className="text-sm text-ink-muted">تسجيل الدخول</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-ink-muted">البريد الإلكتروني</span>
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
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-ink-muted">كلمة السر</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-[15px] text-ink outline-none focus:border-green"
            autoComplete="current-password"
            dir="ltr"
          />
        </label>

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
          {loading ? "جاري الدخول..." : "تسجيل الدخول"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-ink-muted">
        لسه معندكش حساب؟{" "}
        <Link href="/auth/sign-up" className="font-bold text-green-2">
          إنشاء حساب جديد
        </Link>
      </div>
    </div>
  );
}
