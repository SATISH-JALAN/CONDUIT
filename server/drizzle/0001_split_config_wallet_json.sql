CREATE TABLE "split_configs_new" (
	"wallet" text PRIMARY KEY NOT NULL,
	"splits" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "split_configs_new" ADD CONSTRAINT "split_configs_new_wallet_users_wallet_fk" FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "split_configs_new" ("wallet", "splits", "updated_at")
SELECT
	"wallet",
	jsonb_agg(
		jsonb_build_object(
			'destination', "dest_wallet",
			'label', "label",
			'percentage', "percentage"
		)
		ORDER BY "created_at", "id"
	),
	COALESCE(MAX("created_at"), now())
FROM "split_configs"
GROUP BY "wallet";
--> statement-breakpoint
DROP TABLE "split_configs";
--> statement-breakpoint
ALTER TABLE "split_configs_new" RENAME TO "split_configs";
