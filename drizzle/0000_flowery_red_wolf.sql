CREATE TABLE "improve_generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"draft_post" text NOT NULL,
	"specific_instructions" text DEFAULT '' NOT NULL,
	"additional_context" text DEFAULT '' NOT NULL,
	"default_system_instructions" text DEFAULT '' NOT NULL,
	"merged_prompt" text NOT NULL,
	"output" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responder_generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"target_post" text NOT NULL,
	"custom_angle_tone" text DEFAULT '' NOT NULL,
	"mode" text NOT NULL,
	"default_system_instructions" text DEFAULT '' NOT NULL,
	"output" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"default_system_instructions" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE INDEX "improve_generations_clerk_user_id_idx" ON "improve_generations" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "responder_generations_clerk_user_id_idx" ON "responder_generations" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "user_preferences_clerk_user_id_idx" ON "user_preferences" USING btree ("clerk_user_id");