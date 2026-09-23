// إضافة/حذف قناة يدويًا (بديل ما يحتاج ربط حساب OAuth أصلًا — مفيد لو المستخدم مش عايز
// يدي صلاحية كاملة على حسابه، أو عايز يضيف قناة مش هو مشترك فيها أصلًا).
// بيستخدم YOUTUBE_API_KEY (API key عادي، مش OAuth) للبحث عن القناة بالاسم/الرابط.
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { followedChannels } from "@/db/schema";

export const dynamic = "force-dynamic";

interface YoutubeSearchItem {
  snippet: {
    channelId?: string;
    title: string;
    thumbnails?: { default?: { url: string } };
  };
  id: { channelId?: string };
}

// POST { query: "اسم القناة أو الرابط" } — بيدور عليها ويضيفها.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "إضافة القنوات يدويًا مش متظبطة لسه على السيرفر (YOUTUBE_API_KEY)" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const query = (body as { query?: unknown })?.query;
  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "لازم تكتب اسم القناة" }, { status: 400 });
  }

  const params = new URLSearchParams({
    part: "snippet",
    type: "channel",
    maxResults: "1",
    q: query.trim(),
    key: apiKey,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) {
    return NextResponse.json({ error: `فشل البحث: ${res.status}` }, { status: 502 });
  }
  const data = (await res.json()) as { items: YoutubeSearchItem[] };
  const match = data.items[0];
  const channelId = match?.id?.channelId ?? match?.snippet?.channelId;
  if (!match || !channelId) {
    return NextResponse.json({ error: "مالقيناش قناة بالاسم ده" }, { status: 404 });
  }

  await db
    .insert(followedChannels)
    .values({
      userId,
      platform: "youtube",
      channelId,
      channelTitle: match.snippet.title,
      channelThumbnail: match.snippet.thumbnails?.default?.url ?? null,
      source: "manual",
    })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true, channelTitle: match.snippet.title });
}

// DELETE { channelId } — شيل قناة من اللستة.
export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const channelId = (body as { channelId?: unknown })?.channelId;
  if (typeof channelId !== "string" || !channelId) {
    return NextResponse.json({ error: "معرّف القناة مطلوب" }, { status: 400 });
  }

  await db
    .delete(followedChannels)
    .where(
      and(
        eq(followedChannels.userId, userId),
        eq(followedChannels.platform, "youtube"),
        eq(followedChannels.channelId, channelId)
      )
    );

  return NextResponse.json({ ok: true });
}
