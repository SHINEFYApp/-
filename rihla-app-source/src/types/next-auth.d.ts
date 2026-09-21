// توسيع أنواع NextAuth عشان session.user.id يبقى متاح ومكتوب بشكل صحيح في كل المشروع
// (بدل ما كل شاشة تعمل lookup منفصل بالإيميل — راجع callbacks.jwt/session في auth.config.ts).
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
