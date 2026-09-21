// توسيع أنواع NextAuth عشان session.user.id يبقى متاح ومكتوب بشكل صحيح في كل المشروع
// (بدل ما كل شاشة تعمل lookup منفصل بالإيميل — راجع callbacks.jwt/session في auth.config.ts).
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // الفئة العمرية بتاعة المستخدم (زي ما اتخزنت وقت التسجيل) — بتتحط هنا عشان نقدر نحدد
      // "وضع الأطفال" (راجع src/lib/kids-mode.ts) في أي مكان في التطبيق من غير استعلام DB إضافي.
      ageRange?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    ageRange?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    ageRange?: string | null;
  }
}
