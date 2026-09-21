CREATE TABLE "zakat_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"currency" text DEFAULT 'EGP' NOT NULL,
	"nisab_reference" text DEFAULT 'silver' NOT NULL,
	"gold_price_per_gram" double precision,
	"silver_price_per_gram" double precision,
	"cash_amount" double precision DEFAULT 0 NOT NULL,
	"gold_grams" double precision DEFAULT 0 NOT NULL,
	"silver_grams" double precision DEFAULT 0 NOT NULL,
	"trade_goods_value" double precision DEFAULT 0 NOT NULL,
	"debts_owed" double precision DEFAULT 0 NOT NULL,
	"hawl_start_date" date,
	"last_paid_date" date,
	"mal_reminder_enabled" boolean DEFAULT true NOT NULL,
	"fitr_reminder_enabled" boolean DEFAULT true NOT NULL,
	"last_fitr_reminder_hijri_year" integer,
	"last_mal_reminder_sent_at" date,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "zakat_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "zakat_profiles" ADD CONSTRAINT "zakat_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;