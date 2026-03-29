ALTER TABLE "mandates" ADD COLUMN IF NOT EXISTS "paused" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "yield_nfts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_wallet" text NOT NULL,
	"box_id" text NOT NULL,
	"notional" numeric(20, 7) NOT NULL,
	"yield_bps" integer NOT NULL,
	"duration_days" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tx_hash" text,
	"minted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_copies" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_wallet" text NOT NULL,
	"leader_wallet" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "yield_nfts" ADD CONSTRAINT "yield_nfts_owner_wallet_users_wallet_fk" FOREIGN KEY ("owner_wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "yield_nfts" ADD CONSTRAINT "yield_nfts_box_id_bond_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."bond_boxes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_copies" ADD CONSTRAINT "portfolio_copies_follower_wallet_users_wallet_fk" FOREIGN KEY ("follower_wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_copies" ADD CONSTRAINT "portfolio_copies_leader_wallet_users_wallet_fk" FOREIGN KEY ("leader_wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "yield_nfts_owner_status_idx" ON "yield_nfts" USING btree ("owner_wallet", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_copies_follower_leader_idx" ON "portfolio_copies" USING btree ("follower_wallet", "leader_wallet");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_copies_leader_active_idx" ON "portfolio_copies" USING btree ("leader_wallet", "active");
