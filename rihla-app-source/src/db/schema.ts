// رحلة — Islamic Personal & Family Life OS
// نموذج البيانات الأساسي (Phase B, v1) — Drizzle ORM / PostgreSQL
// مطابق لقسم "نموذج البيانات الأساسي" في الـ PRD

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  date,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  ageRange: text("age_range"), // من إجابات Discovery / شاشة المصادر المقترحة
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// تفضيلات المحتوى المختارة من شاشة "مصادر مقترحة" — أنواع محتوى، مش أسماء قنوات (راجع دستور المشروع)
export const userInterests = pgTable(
  "user_interests",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // tafsir | tazkiyah | fiqh_life | seerah | podcast_long | short_daily
  },
  (t) => [uniqueIndex("user_interests_user_key_idx").on(t.userId, t.key)]
);

export const discoveryResponses = pgTable("discovery_responses", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionNo: integer("question_no").notNull(),
  answer: text("answer").notNull(),
  tags: text("tags").array(), // للسؤال الأول (مفيش وقت / مفيش طاقة / تشتت ذهني / ضغط شغل)
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// سجل يوم واحد — مفتاح مركّب userId+date، مصدر الحقيقة لكل تتبع الثوابت التعبدية
export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "date" }).notNull(),
    badDayMode: boolean("bad_day_mode").notNull().default(false),
    fajr: boolean("fajr").notNull().default(false),
    dhuhr: boolean("dhuhr").notNull().default(false),
    asr: boolean("asr").notNull().default(false),
    maghrib: boolean("maghrib").notNull().default(false),
    isha: boolean("isha").notNull().default(false),
    quran: boolean("quran").notNull().default(false),
    adhkarMorning: boolean("adhkar_morning").notNull().default(false),
    adhkarEvening: boolean("adhkar_evening").notNull().default(false),
    sadaqah: boolean("sadaqah").notNull().default(false),
    habitSleep: boolean("habit_sleep").notNull().default(false),
    habitWalk: boolean("habit_walk").notNull().default(false),
    habitScreen: boolean("habit_screen").notNull().default(false),
  },
  (t) => [uniqueIndex("daily_logs_user_date_idx").on(t.userId, t.date)]
);

// عدّادات الأذكار السريعة — بدون أي نقط أو مكافآت (قاعدة غير قابلة للتفاوض، راجع دستور المشروع)
export const dhikrCounts = pgTable(
  "dhikr_counts",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "date" }).notNull(),
    key: text("key").notNull(), // tasbih | tahmid | tahlil | istighfar | salawat | hawqala | hasbunallah | baqiyat | istigatha | rida
    count: integer("count").notNull().default(0),
    target: integer("target").notNull(),
  },
  (t) => [uniqueIndex("dhikr_counts_user_date_key_idx").on(t.userId, t.date, t.key)]
);

export const weeklyReviews = pgTable(
  "weekly_reviews",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start", { mode: "date" }).notNull(),
    whatHappened: text("what_happened"),
    whatDrained: text("what_drained"),
    whatToChange: text("what_to_change"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("weekly_reviews_user_week_idx").on(t.userId, t.weekStart)]
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// جدول توقيتات التذكيرات لكل مستخدم — نص الرسالة نفسه يُسحب دايمًا من مكتبة worship-habit-engine
export const reminderRules = pgTable(
  "reminder_rules",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // fajr | dhuhr | asr | maghrib | isha | quran | adhkarMorning | adhkarEvening | sadaqah
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [uniqueIndex("reminder_rules_user_type_idx").on(t.userId, t.type)]
);

// لوحة الإنتاجية — مهام الحياة العادية (تعلّم/شغل/اجتماعات/أهداف شخصية)، منفصلة تمامًا عن تتبع العبادات.
// التذكير هنا (لو مفعّل) بيستخدم نفس محرك الـ Push، لكن المحتوى عنوان المهمة نفسه، بدون أي نص ديني أو صياغة ذنب
// (راجع قسم "المبادئ غير القابلة للتفاوض" في الـ PRD — نفس روح عدم الترهيب تنطبق هنا برضو).
export const lifeTasks = pgTable(
  "life_tasks",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(), // learning | work | meeting | personal | other
    status: text("status").notNull().default("backlog"), // backlog | today | in_progress | done
    dueAt: timestamp("due_at", { mode: "date" }),
    reminderEnabled: boolean("reminder_enabled").notNull().default(false),
    reminderAt: timestamp("reminder_at", { mode: "date" }),
    notes: text("notes"),
    // بتتسجّل تلقائي لما status يتحول لـ "done" (وبتتصفّر لو اترجعت لحالة تانية) —
    // عشان صفحة "الجدول" (سجل يوم بعينه) تقدر تنسب المهمة لليوم اللي اتعملت فيه فعليًا،
    // مش بس اليوم اللي كانت مجدولة له (dueAt) — مهم للمهام من غير dueAt أصلًا.
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("life_tasks_user_status_idx").on(t.userId, t.status, t.id)]
);

// الونيس — شات رفيق ذكي حر (بدون تقييد بمكتبة worship-habit-engine، بعكس باقي التذكيرات).
// قرار خالد الصريح: يرد بحرية على أي سؤال حتى لو ديني، من غير فلتر منتج إضافي —
// الحذر الوحيد هنا هو سلوك Claude الطبيعي في المسائل الحساسة (نفس منطق أي استشارة قانونية/مالية)، مش قيد مفروض من التطبيق.
export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// خريطة توازن الحياة — ٨ مجالات ثابتة (مطابقة لنموذج الواجهات المعتمد LifeBalance.dc.html)،
// صف واحد لكل مجال لكل مستخدم بيتحدّث في مكانه (مش سجل تاريخي)، والمراجعة الأسبوعية بتقرا منه.
export const lifeBalanceAreas = pgTable(
  "life_balance_areas",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    domainKey: text("domain_key").notNull(), // sp | sleep | work | money | rel | body | digital | growth
    status: text("status").notNull().default("stable"), // stable | fragile | neglected | high_friction | high_impact
    note: text("note"),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("life_balance_areas_user_domain_idx").on(t.userId, t.domainKey)]
);

// ملف الزكاة — صف واحد لكل مستخدم (بيتحدّث في مكانه، مش سجل تاريخي)، بيمسك مدخلات
// حاسبة الزكاة التقريبية (نقد/ذهب/فضة/عروض تجارة/ديون) + تاريخ بداية الحول وآخر سداد،
// عشان نقدر نحسب "متى تجب الزكاة" ونذكّر في وقتها (راجع src/lib/zakat.ts للمنطق،
// وskills/islamic-finance-muamalat لقاعدة "تقدير تنظيمي فقط، المرجع النهائي مفتٍ/مركز زكاة").
export const zakatProfiles = pgTable("zakat_profiles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  currency: text("currency").notNull().default("EGP"),
  nisabReference: text("nisab_reference").notNull().default("silver"), // gold | silver
  goldPricePerGram: doublePrecision("gold_price_per_gram"),
  silverPricePerGram: doublePrecision("silver_price_per_gram"),
  cashAmount: doublePrecision("cash_amount").notNull().default(0),
  goldGrams: doublePrecision("gold_grams").notNull().default(0),
  silverGrams: doublePrecision("silver_grams").notNull().default(0),
  tradeGoodsValue: doublePrecision("trade_goods_value").notNull().default(0),
  debtsOwed: doublePrecision("debts_owed").notNull().default(0),
  hawlStartDate: date("hawl_start_date", { mode: "date" }),
  lastPaidDate: date("last_paid_date", { mode: "date" }),
  malReminderEnabled: boolean("mal_reminder_enabled").notNull().default(true),
  fitrReminderEnabled: boolean("fitr_reminder_enabled").notNull().default(true),
  lastFitrReminderHijriYear: integer("last_fitr_reminder_hijri_year"),
  lastMalReminderSentAt: date("last_mal_reminder_sent_at", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// تحدي كسر العادة — تسجيل المستخدم في مسار معيّن (تدخين | مخدرات | عادة سرية | حدود علاقة | توبة من زنا)
// راجع src/lib/habit-challenge-content.ts للمسارات نفسها ومنطق النسخ الثلاث (تيني/عادية/مثالية).
// صف واحد لكل مستخدم لكل مسار (بيتحدّث في مكانه مش سجل تاريخي) — نفس نمط zakatProfiles.
export const habitChallengeEnrollments = pgTable(
  "habit_challenge_enrollments",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    trackKey: text("track_key").notNull(), // smoking | drugs | self_control | boundaries | zina_tawbah
    versionLevel: text("version_level").notNull().default("tiny"), // tiny | normal | ideal
    status: text("status").notNull().default("active"), // active | paused | completed
    startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("habit_challenge_enrollments_user_track_idx").on(t.userId, t.trackKey)]
);

// سجل يوم واحد لكل مسار مفعّل — تتبّع كيفي (التزم/محلتزمش) بلا نقط ولا مقارنة
// (راجع قاعدة منع الـ Gamification الدينية في skills/islamic-knowledge-governance).
export const habitChallengeLogs = pgTable(
  "habit_challenge_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    trackKey: text("track_key").notNull(),
    date: date("date", { mode: "date" }).notNull(),
    kept: boolean("kept").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("habit_challenge_logs_user_track_date_idx").on(t.userId, t.trackKey, t.date)]
);

// "قصة الأمانة" — وضع الأطفال بس، منفصلة تمامًا عن الجدولين أعلاه (راجع src/lib/kids-honesty-content.ts
// وskills/child-development). مفيش أي حقل بيسجّل "فشل" أو تفاصيل الموقف — مجرد تأمل إيجابي خفيف اختياري.
export const kidsHonestyReflections = pgTable(
  "kids_honesty_reflections",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "date" }).notNull(),
    talkedToTrustedAdult: boolean("talked_to_trusted_adult").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("kids_honesty_reflections_user_date_idx").on(t.userId, t.date)]
);

export const usersRelations = relations(users, ({ many }) => ({
  interests: many(userInterests),
  discoveryResponses: many(discoveryResponses),
  dailyLogs: many(dailyLogs),
  dhikrCounts: many(dhikrCounts),
  weeklyReviews: many(weeklyReviews),
  pushSubscriptions: many(pushSubscriptions),
  reminderRules: many(reminderRules),
  lifeTasks: many(lifeTasks),
  chatMessages: many(chatMessages),
  lifeBalanceAreas: many(lifeBalanceAreas),
  zakatProfile: many(zakatProfiles),
  habitChallengeEnrollments: many(habitChallengeEnrollments),
  habitChallengeLogs: many(habitChallengeLogs),
  kidsHonestyReflections: many(kidsHonestyReflections),
}));
