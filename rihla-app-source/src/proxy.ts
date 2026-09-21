import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// ملحوظة Next.js 16: اسم الملف/الـ convention اتغير من middleware لـ proxy (راجع AGENTS.md/دليل next).
// بيحمي كل شاشات التطبيق المحتاجة تسجيل دخول (راجع callbacks.authorized في auth.config.ts).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png|apple-touch-icon\\.png).*)",
  ],
};
