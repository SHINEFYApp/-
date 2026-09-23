// ربط حساب جوجل (يوتيوب + كالندر بنفس الـ OAuth grant) — تدفق OAuth 2.0 يدوي بسيط
// (بدون next-auth adapter — راجع الملحوظة في src/auth.ts ليه مفيش adapter هنا أصلًا،
// وربط الحسابات ده منفصل تمامًا عن تسجيل الدخول: نفس المستخدم مسجّل دخول أصلًا بالـ
// Credentials provider، وده بس بيضيف "اتصال" إضافي لحسابه).
//
// الصلاحيات المطلوبة (scope واحد للاتنين عشان طلب موافقة واحد بس من المستخدم):
//   - https://www.googleapis.com/auth/youtube.readonly  → قراءة الاشتراكات (للترشيحات)
//   - https://www.googleapis.com/auth/calendar          → قراءة/كتابة إفنتات الكالندر
// النطاقين دول "sensitive scopes" عند جوجل — يعني تطبيقك محتاج يعدي مراجعة OAuth
// verification من جوجل (Google Cloud Console → OAuth consent screen) قبل ما يشتغل
// لأي مستخدم غير المطورين المضافين كـ test users. راجع الرسالة اللي اتبعتت لخالد.
import { createHmac, timingSafeEqual } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { connectedAccounts } from "@/db/schema";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// state param موقّع (HMAC) بمفتاح AUTH_SECRET الموجود أصلًا — بيربط الـ callback بالمستخدم
// اللي بدأ التدفق ويمنع CSRF، من غير ما نحتاج نخزن حاجة إضافية في جلسة أو قاعدة بيانات.
function signState(userId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET غير متظبط");
  const nonce = Date.now().toString(36);
  const payload = `${userId}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [userId, nonce, sig] = parts;
  const expected = createHmac("sha256", secret).update(`${userId}.${nonce}`).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  return userId;
}

export { signState };

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/calendar",
  "openid",
  "email",
].join(" ");

function getRedirectUri(): string {
  // لازم يتظبط بالظبط بنفس القيمة في Google Cloud Console (Authorized redirect URIs).
  const base = process.env.APP_URL || "https://mocha-phi-48.vercel.app";
  return `${base}/api/connections/google/callback`;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID غير متظبط");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline", // عشان نضمن refresh_token
    prompt: "consent", // نضمن refresh_token حتى لو مش أول مرة يوافق
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth env vars غير متظبطة");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`فشل تبادل كود جوجل: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth env vars غير متظبطة");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`فشل تجديد توكن جوجل: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

/**
 * بيحفظ (أو يحدّث) اتصال جوجل لمستخدم معين — التوكنات بتتشفّر قبل التخزين دايمًا.
 */
export async function saveGoogleConnection(
  userId: string,
  tokens: GoogleTokenResponse,
  email: string | null
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db
    .insert(connectedAccounts)
    .values({
      userId,
      provider: "google",
      scope: tokens.scope,
      accessTokenEnc: encryptSecret(tokens.access_token),
      refreshTokenEnc: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      expiresAt,
      providerAccountEmail: email,
    })
    .onConflictDoUpdate({
      target: [connectedAccounts.userId, connectedAccounts.provider],
      set: {
        scope: tokens.scope,
        accessTokenEnc: encryptSecret(tokens.access_token),
        // لو جوجل ما رجعتش refresh_token جديد (مش أول مرة)، سيبي القديم زي ما هو.
        ...(tokens.refresh_token ? { refreshTokenEnc: encryptSecret(tokens.refresh_token) } : {}),
        expiresAt,
        providerAccountEmail: email,
        updatedAt: new Date(),
      },
    });
}

/**
 * بيرجع access token صالح للاستخدام دلوقت — بيجدده تلقائي لو قرب ينتهي (أقل من دقيقتين).
 * بيرجع null لو مفيش اتصال أصلًا.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(connectedAccounts)
    .where(and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.provider, "google")))
    .limit(1);

  if (!row) return null;

  const twoMinutesFromNow = new Date(Date.now() + 2 * 60_000);
  if (row.expiresAt > twoMinutesFromNow) {
    return decryptSecret(row.accessTokenEnc);
  }

  if (!row.refreshTokenEnc) return null; // منتهي ومفيش refresh — لازم يعيد الربط

  const refreshed = await refreshAccessToken(decryptSecret(row.refreshTokenEnc));
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await db
    .update(connectedAccounts)
    .set({
      accessTokenEnc: encryptSecret(refreshed.access_token),
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(connectedAccounts.id, row.id));

  return refreshed.access_token;
}

export async function disconnectGoogleAccount(userId: string): Promise<void> {
  await db
    .delete(connectedAccounts)
    .where(and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.provider, "google")));
}

export async function getGoogleConnectionStatus(userId: string) {
  const [row] = await db
    .select({
      providerAccountEmail: connectedAccounts.providerAccountEmail,
      scope: connectedAccounts.scope,
      createdAt: connectedAccounts.createdAt,
    })
    .from(connectedAccounts)
    .where(and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.provider, "google")))
    .limit(1);

  return row ?? null;
}
