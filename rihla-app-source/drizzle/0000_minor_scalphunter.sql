CREATE TABLE "daily_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"bad_day_mode" boolean DEFAULT false NOT NULL,
	"fajr" boolean DEFAULT false NOT NULL,
	"dhuhr" boolean DEFAULT false NOT NULL,
	"asr" boolean DEFAULT false NOT NULL,
	"maghrib" boolean DEFAULT false NOT NULL,
	"isha" boolean DEFAULT false NOT NULL,
	"quran" boolean DEFAULT false NOT NULL,
	"adhkar_morning" boolean DEFAULT false NOT NULL,
	"adhkar_evening" boolean DEFAULT false NOT NULL,
	"sadaqah" boolean DEFAULT false NOT NULL,
	"habit_sleep" boolean DEFAULT false NOT NULL,
	"habit_walk" boolean DEFAULT false NOT NULL,
	"habit_screen" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dhikr_counts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"target" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_no" integer NOT NULL,
	"answer" text NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reminder_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"password_hash" text,
	"email_verified" timestamp,
	"age_range" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"what_happened" text,
	"what_drained" text,
	"what_to_change" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dhikr_counts" ADD CONSTRAINT "dhikr_counts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_responses" ADD CONSTRAINT "discovery_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reviews" ADD CONSTRAINT "weekly_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_logs_user_date_idx" ON "daily_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "dhikr_counts_user_date_key_idx" ON "dhikr_counts" USING btree ("user_id","date","key");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_rules_user_type_idx" ON "reminder_rules" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_interests_user_key_idx" ON "user_interests" USING btree ("user_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_reviews_user_week_idx" ON "weekly_reviews" USING btree ("user_id","week_start");