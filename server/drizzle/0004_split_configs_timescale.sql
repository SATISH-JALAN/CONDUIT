-- Permanent fix migration:
-- 1) Reconcile split_configs table shape with Drizzle schema (wallet PK + splits JSONB + updated_at).
-- 2) OPTIONAL TimescaleDB enablement (safe on vanilla Postgres / Neon free tier).

-- ── 1) split_configs reconciliation ────────────────────────────────────────────
DO $$
DECLARE
  has_splits boolean;
  has_legacy_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'split_configs'
      AND column_name = 'splits'
  ) INTO has_splits;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'split_configs'
      AND column_name = 'id'
  ) INTO has_legacy_id;

  -- If split_configs already matches v2 shape, do nothing.
  IF has_splits THEN
    RETURN;
  END IF;

  -- Legacy shape detected (id, wallet, dest_wallet, label, percentage, created_at).
  IF has_legacy_id THEN
    CREATE TABLE IF NOT EXISTS "split_configs_v2" (
      "wallet" text PRIMARY KEY NOT NULL,
      "splits" jsonb NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    INSERT INTO "split_configs_v2" ("wallet", "splits", "updated_at")
    SELECT
      "wallet",
      jsonb_agg(
        jsonb_build_object(
          'destination', "dest_wallet",
          'label', "label",
          'percentage', "percentage"
        )
        ORDER BY "created_at" ASC
      ) AS "splits",
      now() AS "updated_at"
    FROM "split_configs"
    GROUP BY "wallet"
    ON CONFLICT ("wallet") DO UPDATE SET
      "splits" = EXCLUDED."splits",
      "updated_at" = EXCLUDED."updated_at";

    DROP TABLE "split_configs";
    ALTER TABLE "split_configs_v2" RENAME TO "split_configs";
  ELSE
    -- Unknown shape: create the expected table if missing.
    CREATE TABLE IF NOT EXISTS "split_configs" (
      "wallet" text PRIMARY KEY NOT NULL,
      "splits" jsonb NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- Ensure split_configs.wallet has FK to users.wallet (idempotent)
DO $$ BEGIN
  ALTER TABLE "split_configs"
    ADD CONSTRAINT "split_configs_wallet_users_wallet_fk"
    FOREIGN KEY ("wallet") REFERENCES "public"."users"("wallet")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── 2) TimescaleDB setup ──────────────────────────────────────────────────────
-- Conduit can run on vanilla Postgres (e.g. Neon free tier) without Timescale.
-- If Timescale is available later, this block will enable it and convert tables.
DO $$
BEGIN
  -- Only attempt if the extension is installable in this environment.
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS timescaledb;
    EXCEPTION
      WHEN insufficient_privilege THEN
        -- Managed Postgres (e.g. Neon) often disallows CREATE EXTENSION on free tiers.
        -- Leave as vanilla tables; can be converted later.
        RETURN;
      WHEN others THEN
        RETURN;
    END;

    -- Only attempt hypertable conversion if Timescale functions are present.
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'create_hypertable'
        AND n.nspname = 'public'
    ) OR EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'create_hypertable'
        AND n.nspname = 'timescaledb'
    ) THEN
      BEGIN
        PERFORM create_hypertable('harvests', 'harvested_at', if_not_exists => TRUE);
      EXCEPTION
        WHEN undefined_function THEN NULL;
        WHEN others THEN NULL;
      END;

      BEGIN
        PERFORM create_hypertable('apy_history', 'recorded_at', if_not_exists => TRUE);
      EXCEPTION
        WHEN undefined_function THEN NULL;
        WHEN others THEN NULL;
      END;
    END IF;
  END IF;
END $$;

