CREATE TABLE "leaderboard_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"wallet" text NOT NULL,
	"rank" integer NOT NULL,
	"apy_bps" integer NOT NULL,
	"tvl" numeric(20, 7) NOT NULL,
	"change_bps" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yield_races" (
	"id" text PRIMARY KEY NOT NULL,
	"period" text DEFAULT '7d' NOT NULL,
	"entry_fee" numeric(20, 7) DEFAULT '5.0000000' NOT NULL,
	"prize_pool" numeric(20, 7) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"race_id" text NOT NULL,
	"wallet" text NOT NULL,
	"entry_fee" numeric(20, 7) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leaderboard_cache" ADD CONSTRAINT "leaderboard_cache_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_race_id_yield_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."yield_races"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "leaderboard_cache_period_computed_idx" ON "leaderboard_cache" USING btree ("period","computed_at");
--> statement-breakpoint
CREATE INDEX "leaderboard_cache_period_rank_idx" ON "leaderboard_cache" USING btree ("period","rank");
--> statement-breakpoint
CREATE UNIQUE INDEX "race_entries_race_wallet_idx" ON "race_entries" USING btree ("race_id","wallet");
