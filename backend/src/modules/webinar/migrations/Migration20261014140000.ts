import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261014140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "payment_method_config" (
        "id" text NOT NULL,
        "provider_id" text NOT NULL,
        "name" text NOT NULL,
        "display_title" text NOT NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "environment" text NOT NULL DEFAULT 'live',
        "live_publishable_key" text NULL,
        "live_secret_key" text NULL,
        "live_webhook_secret" text NULL,
        "test_publishable_key" text NULL,
        "test_secret_key" text NULL,
        "test_webhook_secret" text NULL,
        "underlying_gateway" text NULL,
        "verification_mode" text NULL DEFAULT 'instant_verification',
        "supported_cards" jsonb NULL DEFAULT '["visa","mastercard","amex","discover"]'::jsonb,
        "last_tested_at" timestamptz NULL,
        "last_test_status" text NULL,
        "last_test_message" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "payment_method_config_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "payment_method_config_provider_id_unique" UNIQUE ("provider_id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pmc_is_active" ON "payment_method_config" ("is_active");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pmc_provider_id" ON "payment_method_config" ("provider_id");`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "payment_method_audit_log" (
        "id" text NOT NULL,
        "payment_method_id" text NOT NULL REFERENCES "payment_method_config" ("id") ON DELETE CASCADE,
        "provider_id" text NOT NULL,
        "action" text NOT NULL,
        "admin_user_id" text NULL,
        "admin_email" text NULL,
        "previous_state" jsonb NULL,
        "new_state" jsonb NULL,
        "details" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "payment_method_audit_log_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pmal_provider_id" ON "payment_method_audit_log" ("provider_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pmal_created_at" ON "payment_method_audit_log" ("created_at" DESC);`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "payment_method_audit_log" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "payment_method_config" CASCADE;`)
  }
}
