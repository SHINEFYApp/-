// إعدادات Auth.js الآمنة لتشغيل الـ middleware على edge runtime — بدون أي كود يحتاج Node
// (bcrypt، الاتصال المباشر بقاعدة البيانات) لأن الـ middleware بيشتغل في بيئة edge.
// المنطق الكامل (provider الـ Credentials) موجود في src/auth.ts وبيستورد الملف ده.
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authConfig = {
  pages: {
    signIn: "/auth/sign-in",
  },
  providers: [], // بيتضاف provider الـ Credentials الحقيقي في src/auth.ts (Node runtime)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith("/home")
        || nextUrl.pathname.startsWith("/life")
        || nextUrl.pathname.startsWith("/review")
        || nextUrl.pathname.startsWith("/tasks")
        || nextUrl.pathname.startsWith("/companion")
        || nextUrl.pathname.startsWith("/dhikr")
        || nextUrl.pathname.startsWith("/notifications")
        || nextUrl.pathname.startsWith("/sources")
        || nextUrl.pathname.startsWith("/onboarding");

      if (isProtected && !isLoggedIn) {
        return false; // بيحوّل تلقائيًا لصفحة signIn في pages أعلاه
      }
      return true;
    },
    // NextAuth الافتراضي بينسخ بس name/email/image من الـ token لـ session.user —
    // من غير الـ callbacks دي، session.user.id بيفضل undefined في كل مكان في المشروع
    // (كل الـ agents الستة اكتشفوا نفس المشكلة بشكل مستقل وعملوا workaround محلي بالإيميل).
    // الإصلاح المركزي هنا يخلي session.user.id متاح فعليًا في كل مكان.
    jwt({ token, user }): JWT {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
