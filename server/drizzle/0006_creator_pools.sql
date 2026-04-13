CREATE TABLE IF NOT EXISTS "creator_pools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"creator_wallet" text NOT NULL,
	"box_id" text NOT NULL,
	"creator_share_bps" integer DEFAULT 1000 NOT NULL,
	"fan_apy_hint_bps" integer,
	"tone" text,
	"blurb" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_pool_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"pool_id" text NOT NULL,
	"fan_wallet" text NOT NULL,
	"deposit_amount" numeric(20, 7) DEFAULT '0' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_pools" ADD CONSTRAINT "creator_pools_creator_wallet_users_wallet_fk" FOREIGN KEY ("creator_wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_pools" ADD CONSTRAINT "creator_pools_box_id_bond_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."bond_boxes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_pool_memberships" ADD CONSTRAINT "creator_pool_memberships_pool_id_creator_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."creator_pools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_pool_memberships" ADD CONSTRAINT "creator_pool_memberships_fan_wallet_users_wallet_fk" FOREIGN KEY ("fan_wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Seed creator wallets so FK inserts succeed
INSERT INTO "users" ("wallet") VALUES
  ('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF')
ON CONFLICT ("wallet") DO NOTHING;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "creator_pool_memberships_pool_fan_idx" ON "creator_pool_memberships" USING btree ("pool_id","fan_wallet");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_pools_active_idx" ON "creator_pools" USING btree ("active","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_pool_memberships_pool_idx" ON "creator_pool_memberships" USING btree ("pool_id","joined_at");
--> statement-breakpoint
-- Demo seed pools (safe idempotent inserts)
INSERT INTO "creator_pools" ("id","name","handle","creator_wallet","box_id","creator_share_bps","fan_apy_hint_bps","tone","blurb","active")
VALUES
  ('creator-pool-1','MacroWithMina','@mina_macro','GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF','us-treasury-10y',1500,560,'var(--surge)','Macro commentary with low-volatility treasury rotation.',true),
  ('creator-pool-2','BondNerd Daily','@bondnerd','GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF','german-bund-2027',1200,490,'var(--sky)','Conservative bond ladder for steady fan savings.',true),
  ('creator-pool-3','YieldCanvas','@yieldcanvas','GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF','tech-growth-bond',1800,680,'var(--amber)','Higher carry profile with active duration tilts.',true),
  ('creator-pool-4','Satish Streams','@satish_conduit','GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF','ondo-usdy',1000,null,'var(--violet)','AI-managed basket with transparent agent logs.',true)
ON CONFLICT ("id") DO NOTHING;
