// نهاية تدفق ربط حساب جوجل — جوجل بترجّع المستخدم هنا بعد الموافقة (أو الرفض).
import { NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  saveGoogleConnection,
  verifyState,
} from "@/lib/google-connect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    // المستخدم رفض الموافقة أو حصل خطأ من جوجل — رجّعه للصفحة من غير أي تسجيل.
    return NextResponse.redirect(`${origin}/sources?connect_error=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/sources?connect_error=missing_params`);
  }

  const userId = verifyState(state);
  if (!userId) {
    return NextResponse.redirect(`${origin}/sources?connect_error=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await fetchGoogleAccountEmail(tokens.access_token);
    await saveGoogleConnection(userId, tokens, email);
  } catch {
    return NextResponse.redirect(`${origin}/sources?connect_error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}/sources?connected=google`);
}
