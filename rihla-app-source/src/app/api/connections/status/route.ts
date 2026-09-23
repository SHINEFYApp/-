// حالة ربط الحسابات للمستخدم الحالي — تستخدمها واجهة صفحة المصادر.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleConnectionStatus, isGoogleOAuthConfigured } from "@/lib/google-connect";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const google = await getGoogleConnectionStatus(userId);

  return NextResponse.json({
    configured: isGoogleOAuthConfigured(),
    google: google
      ? {
          connected: true,
          email: google.providerAccountEmail,
          scope: google.scope,
          connectedAt: google.createdAt,
        }
      : { connected: false },
  });
}
