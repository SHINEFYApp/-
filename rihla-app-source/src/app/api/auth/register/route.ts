import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// إنشاء حساب جديد — يتحقق من صحة البيانات، يتأكد إن الإيميل مش مستخدم قبل كده،
// بيعمل hash لكلمة السر بـ bcrypt، ويحفظ المستخدم الجديد في قاعدة البيانات.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "البيانات المرسلة غير صالحة" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "البيانات المرسلة غير صالحة" }, { status: 400 });
  }

  const { name, email, password, ageRange } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "من فضلك أدخل بريد إلكتروني صحيح" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `كلمة السر لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل` },
      { status: 400 }
    );
  }

  if (name !== undefined && typeof name !== "string") {
    return NextResponse.json({ error: "الاسم غير صالح" }, { status: 400 });
  }

  if (ageRange !== undefined && ageRange !== null && typeof ageRange !== "string") {
    return NextResponse.json({ error: "الفئة العمرية غير صالحة" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = typeof name === "string" ? name.trim() : "";

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "في حساب مسجل بالفعل بهذا الإيميل" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [created] = await db
    .insert(users)
    .values({
      name: trimmedName || null,
      email: normalizedEmail,
      passwordHash,
      ageRange: typeof ageRange === "string" && ageRange.trim() ? ageRange.trim() : null,
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  return NextResponse.json({ user: created }, { status: 201 });
}
