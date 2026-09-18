CREATE TABLE "feature_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"features" jsonb,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"suggestion_id" text NOT NULL,
	"revision" integer NOT NULL,
	"name" text NOT NULL,
	"track_ids" jsonb NOT NULL,
	"playlist_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"offset" integer DEFAULT 0 NOT NULL,
	"uncertain" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"approved_revision" integer,
	"cancelled" boolean DEFAULT false NOT NULL,
	"data" jsonb NOT NULL,
	"error" text,
	"created" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"access" text NOT NULL,
	"refresh" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_revision" ON "publications" USING btree ("run_id","suggestion_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_run" ON "runs" USING btree ("user_id") WHERE "runs"."status" in ('queued','importing','enriching','analyzing','publishing');