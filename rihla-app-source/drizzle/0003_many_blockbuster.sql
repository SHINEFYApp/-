CREATE TABLE "life_balance_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"domain_key" text NOT NULL,
	"status" text DEFAULT 'stable' NOT NULL,
	"note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_balance_areas" ADD CONSTRAINT "life_balance_areas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "life_balance_areas_user_domain_idx" ON "life_balance_areas" USING btree ("user_id","domain_key");