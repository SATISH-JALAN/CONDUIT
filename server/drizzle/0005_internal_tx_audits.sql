CREATE TABLE IF NOT EXISTS "internal_tx_audits" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"action" text NOT NULL,
	"request_nonce" text NOT NULL,
	"request_ts" timestamp NOT NULL,
	"request_body" jsonb NOT NULL,
	"signature" text NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"result" text NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "internal_tx_audits_request_nonce_idx" ON "internal_tx_audits" USING btree ("request_nonce");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_tx_audits_wallet_created_idx" ON "internal_tx_audits" USING btree ("wallet","created_at");

