CREATE TABLE "habit_challenge_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_key" text NOT NULL,
	"version_level" text DEFAULT 'tiny' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_challenge_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track_key" text NOT NULL,
	"date" date NOT NULL,
	"kept" boolean NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kids_honesty_reflections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"talked_to_trusted_adult" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "habit_challenge_enrollments" ADD CONSTRAINT "habit_challenge_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_challenge_logs" ADD CONSTRAINT "habit_challenge_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_honesty_reflections" ADD CONSTRAINT "kids_honesty_reflections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "habit_challenge_enrollments_user_track_idx" ON "habit_challenge_enrollments" USING btree ("user_id","track_key");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_challenge_logs_user_track_date_idx" ON "habit_challenge_logs" USING btree ("user_id","track_key","date");--> statement-breakpoint
CREATE UNIQUE INDEX "kids_honesty_reflections_user_date_idx" ON "kids_honesty_reflections" USING btree ("user_id","date");