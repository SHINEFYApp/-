CREATE TABLE "life_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'backlog' NOT NULL,
	"due_at" timestamp,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"reminder_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "life_tasks" ADD CONSTRAINT "life_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "life_tasks_user_status_idx" ON "life_tasks" USING btree ("user_id","status","id");