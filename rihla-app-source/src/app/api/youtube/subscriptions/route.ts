// مزامنة اشتراكات يوتيوب بتاعة المستخدم (بعد ربط حسابه) لجدول followedChannels —
// تستخدم بعدين في الترشيحات اليومية وتنبيهات الحلقات الجديدة.
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { followedChannels } from "@/db/schema";
import { getValidAccessToken } from "@/lib/google-connect";

export const dynamic = "force-dynamic";

interface YoutubeSubscriptionItem {
  snippet: {
    title: string;
    resourceId: { channelId: string };
    thumbnails?: { default?: { url: string } };
  };
}

interface YoutubeSubscriptionsResponse {
  items: YoutubeSubscriptionItem[];
  nextPageToken?: string;
}

// GET: يرجّع القنوات المتزامنة حاليًا (من غير ما يعمل مزامنة جديدة).
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(followedChannels)
    .where(and(eq(followedChannels.userId, userId), eq(followedChannels.platform, "youtube")));

  return NextResponse.json({ channels: rows });
}

// POST: يسحب الاشتراكات فعليًا من يوتيوب (محتاج الحساب يكون متربط بـ scope يوتيوب) ويحدّث الجدول.
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json({ error: "الحساب مش متربط. اربط حسابك أولاً." }, { status: 400 });
  }

  const channels: { channelId: string; title: string; thumbnail: string | null }[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const params = new URLSearchParams({
        part: "snippet",
        mine: "true",
        maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      });
      const res = await fetch(`https://www.googleapis.com/youtube/v3/subscriptions?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        return NextResponse.json({ error: `فشل جلب الاشتراكات: ${res.status}` }, { status: 502 });
      }
      const data = (await res.json()) as YoutubeSubscriptionsResponse;
      for (const item of data.items) {
        channels.push({
          channelId: item.snippet.resourceId.channelId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.default?.url ?? null,
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch {
    return NextResponse.json({ error: "فشل الاتصال بيوتيوب" }, { status: 502 });
  }

  for (const ch of channels) {
    await db
      .insert(followedChannels)
      .values({
        userId,
        platform: "youtube",
        channelId: ch.channelId,
        channelTitle: ch.title,
        channelThumbnail: ch.thumbnail,
        source: "google_sync",
      })
      .onConflictDoUpdate({
        target: [followedChannels.userId, followedChannels.platform, followedChannels.channelId],
        set: { channelTitle: ch.title, channelThumbnail: ch.thumbnail },
      });
  }

  return NextResponse.json({ ok: true, count: channels.length });
}
