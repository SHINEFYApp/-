// فك ربط حساب جوجل — بيحذف الاتصال (التوكنات) بتاع المستخدم بالكامل من القاعدة.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { disconnectGoogleAccount } from "@/lib/google-connect";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  await disconnectGoogleAccount(userId);
  return NextResponse.json({ ok: true });
}
