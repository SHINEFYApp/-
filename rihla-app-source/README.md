# رِحلة (Rihla) — Islamic Personal & Family Life OS

Phase B — تطبيق ويب حقيقي (Next.js 16 / App Router / Turbopack)، مبني حسب الـ PRD المعتمد في Claude Project.

## التشغيل محليًا

```bash
npm install
cp .env.example .env   # لو الملف مش موجود، انسخ القيم من .env واملأ الناقص
npx drizzle-kit migrate
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000).

## متغيرات البيئة (`.env`)

| المتغير | ليه |
|---|---|
| `DATABASE_URL` | اتصال Postgres (Supabase/Neon/أي مزوّد). لو بتستخدم Supabase على Vercel (serverless)، استخدم **Session pooler** أو **Transaction pooler** مش الـ Direct connection (IPv6-only غالبًا). |
| `AUTH_SECRET` | سر NextAuth — `openssl rand -base64 32` أو أي مولّد عشوائي. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | تشفير Web Push — `npx web-push generate-vapid-keys`. |
| `ANTHROPIC_API_KEY` | مطلوب لشات "الونيس" (`/companion`). من [console.anthropic.com](https://console.anthropic.com). من غيره الشات بيرجع رسالة خطأ ودّية بدل ما يكسر التطبيق. |
| `CRON_SECRET` | يحمي `/api/cron/send-reminders` من استدعاء خارجي عشوائي — لازم أي scheduler يبعته في `Authorization: Bearer <CRON_SECRET>`. |
| `REMINDER_TIMEZONE` | المنطقة الزمنية المستخدمة لحساب مواعيد التذكيرات (افتراضيًا `Africa/Cairo`). |

## قاعدة البيانات

11 جدول، Drizzle ORM. الـ migrations في `drizzle/*.sql`. بعد أي تعديل في `src/db/schema.ts`:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Cron / التذكيرات — مهم قبل النشر على Vercel

`/api/cron/send-reminders` لازم يتنده **كل دقيقة** عشان يبعت تذكيرات الصلاة/القرآن/الأذكار في مواعيدها (راجع `DEFAULT_REMINDER_TIMES` في `src/lib/push.ts`).

**مشكلة:** [Vercel Cron على خطة Hobby (المجانية) بيدعم مرة واحدة في اليوم بس](https://vercel.com/docs/cron-jobs/usage-and-pricing) — أي جدولة أكتر من كده (زي كل دقيقة) بترفض الـ deployment كله بخطأ صريح. عشان كده `vercel.json` فاضي دلوقتي عن قصد.

**الحل — اختار واحد:**

1. **مجاني (موصى بيه لـ v1):** استخدم scheduler خارجي مجاني زي [cron-job.org](https://cron-job.org) يعمل `GET` كل دقيقة على:
   ```
   https://<your-domain>/api/cron/send-reminders
   Header: Authorization: Bearer <CRON_SECRET من .env>
   ```
2. **لو هتدفع لـ Vercel Pro:** رجّع `vercel.json` لـ:
   ```json
   { "crons": [{ "path": "/api/cron/send-reminders", "schedule": "* * * * *" }] }
   ```
   (Pro بيدعم كل دقيقة فعليًا).

من غير أي واحدة من الاتنين، تذكيرات الصلاة والأذكار مش هتتبعت خالص — باقي التطبيق (تتبع، مهام، الونيس، إلخ) هيشتغل عادي.

## النشر (Vercel)

1. اربط الـ repo بـ Vercel (Import Git Repository).
2. حط كل متغيرات البيئة اللي فوق في Project Settings → Environment Variables.
3. اعمل Deploy.
4. اضبط الـ external cron (فوق) على الدومين الحقيقي بعد أول deploy.
