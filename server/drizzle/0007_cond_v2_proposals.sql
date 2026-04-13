CREATE TYPE "public"."cond_proposal_status" AS ENUM('pending', 'approved', 'denied', 'submitted');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cond_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"source" text DEFAULT 'gemini' NOT NULL,
	"action" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reasoning" text NOT NULL,
	"confidence" numeric(4, 3),
	"status" "cond_proposal_status" DEFAULT 'pending' NOT NULL,
	"request_nonce" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cond_proposals" ADD CONSTRAINT "cond_proposals_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cond_proposals_request_nonce_idx" ON "cond_proposals" USING btree ("request_nonce");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cond_proposals_wallet_status_created_idx" ON "cond_proposals" USING btree ("wallet","status","created_at");
