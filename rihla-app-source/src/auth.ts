import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { authConfig } from "@/auth.config";

// ملحوظة: مفيش DrizzleAdapter هنا عن قصد. الـ Credentials provider بيدي user لـ authorize()
// يدويًا وبيستخدم استراتيجية JWT، فالـ adapter مش بيتنادى أصلًا في المسار ده — ووجوده كان
// بيطلب جداول accounts/sessions/verificationTokens اللي مش موجودة في schema.ts، وده كان
// هيبوّظ أي حد يحاول يستخدم adapter method لاحقًا (زي إضافة OAuth provider) من غير ما حد يلاحظ.
// لو حد ضاف Google/GitHub provider بعدين، لازم ترجع الـ adapter مع schema mapping صريح
// يطابق أسماء الجداول الحقيقية، أو تضيف الجداول الناقصة في schema.ts + migration جديدة.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
