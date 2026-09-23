// بداية تدفق ربط حساب جوجل — بيحول المستخدم المسجّل دخول على شاشة موافقة جوجل.
// الراوت ده بيتنادى من رابط عادي (مش fetch)، فكل رد لازم يكون redirect مش JSON خام.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured, signState } from "@/lib/google-connect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(`${origin}/auth/sign-in`);
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(`${origin}/sources?connect_error=not_configured`);
  }

  const url = buildGoogleAuthUrl(signState(userId));
  return NextResponse.redirect(url);
}
