CREATE TYPE "public"."asset_type" AS ENUM('Government', 'Corporate', 'Sovereign');--> statement-breakpoint
CREATE TYPE "public"."credit_rating" AS ENUM('AAA', 'AA', 'A', 'BBB');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('Low', 'Medium', 'High');--> statement-breakpoint
CREATE TYPE "public"."risk_tolerance" AS ENUM('Conservative', 'Moderate', 'Aggressive');--> statement-breakpoint
CREATE TABLE "apy_history" (
	"id" text PRIMARY KEY NOT NULL,
	"box_id" text NOT NULL,
	"apy_bps" integer NOT NULL,
	"source" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bond_boxes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"risk" "risk_level" NOT NULL,
	"apy_bps" integer NOT NULL,
	"duration_years" integer NOT NULL,
	"min_investment" integer NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"flag" text NOT NULL,
	"accent_color" text,
	"active" boolean DEFAULT true NOT NULL,
	"contract_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"action" text NOT NULL,
	"result" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cond_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"action" text NOT NULL,
	"reasoning" text NOT NULL,
	"confidence" numeric(4, 3),
	"executed" boolean DEFAULT false NOT NULL,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harvests" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"box_id" text NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"tx_hash" text,
	"harvested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mandates" (
	"wallet" text PRIMARY KEY NOT NULL,
	"risk_tolerance" "risk_tolerance" DEFAULT 'Moderate' NOT NULL,
	"auto_compound" boolean DEFAULT true NOT NULL,
	"compound_threshold_cents" integer DEFAULT 5000 NOT NULL,
	"min_credit_rating" "credit_rating" DEFAULT 'A' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"box_id" text NOT NULL,
	"principal" numeric(20, 7) NOT NULL,
	"apy_bps" integer NOT NULL,
	"sync_ts" numeric(20, 6) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"dest_wallet" text NOT NULL,
	"label" text NOT NULL,
	"percentage" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"wallet" text PRIMARY KEY NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'none' NOT NULL,
	"kyc_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apy_history" ADD CONSTRAINT "apy_history_box_id_bond_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."bond_boxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cond_decisions" ADD CONSTRAINT "cond_decisions_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_box_id_bond_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."bond_boxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_box_id_bond_boxes_id_fk" FOREIGN KEY ("box_id") REFERENCES "public"."bond_boxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_configs" ADD CONSTRAINT "split_configs_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;