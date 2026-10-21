import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261011183000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "speaker" (
        "id" text NOT NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "bio" text NULL,
        "designation" text NULL,
        "qualifications" text NULL,
        "photo_url" text NULL,
        "email" text NULL,
        "phone" text NULL,
        "status" text CHECK ("status" IN ('active', 'archived')) NOT NULL DEFAULT 'active',
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "speaker_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_speaker_slug_unique" ON "speaker" ("slug") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_speaker_deleted_at" ON "speaker" ("deleted_at") WHERE deleted_at IS NULL;`)

    this.addSql(`ALTER TABLE "webinar" ADD COLUMN IF NOT EXISTS "speaker_id" text NULL;`)
    this.addSql(`ALTER TABLE "webinar" ADD COLUMN IF NOT EXISTS "seo_title" text NULL;`)
    this.addSql(`ALTER TABLE "webinar" ADD COLUMN IF NOT EXISTS "seo_description" text NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_speaker_id" ON "webinar" ("speaker_id") WHERE deleted_at IS NULL;`)

    this.addSql(`ALTER TABLE "webinar_variant_mapping" DROP CONSTRAINT IF EXISTS "webinar_variant_mapping_option_type_check";`)
    this.addSql(`ALTER TABLE "webinar_variant_mapping" ADD COLUMN IF NOT EXISTS "title" text NULL;`)
    this.addSql(`ALTER TABLE "webinar_variant_mapping" ADD COLUMN IF NOT EXISTS "description" text NULL;`)
    this.addSql(`ALTER TABLE "webinar_variant_mapping" ADD COLUMN IF NOT EXISTS "price" integer NULL;`)
    this.addSql(`ALTER TABLE "webinar_variant_mapping" ADD COLUMN IF NOT EXISTS "currency_code" text NOT NULL DEFAULT 'usd';`)
    this.addSql(`ALTER TABLE "webinar_variant_mapping" ADD COLUMN IF NOT EXISTS "is_enabled" boolean NOT NULL DEFAULT true;`)
    this.addSql(`ALTER TABLE "webinar_variant_mapping" ADD COLUMN IF NOT EXISTS "order_index" integer NOT NULL DEFAULT 0;`)
    this.addSql(`ALTER TABLE "webinar_variant_mapping" ADD COLUMN IF NOT EXISTS "expires_in_days" integer NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "subscription_plan" (
        "id" text NOT NULL,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "description" text NULL,
        "price" integer NOT NULL DEFAULT 99,
        "currency_code" text NOT NULL DEFAULT 'usd',
        "billing_interval" text NOT NULL DEFAULT 'monthly',
        "webinar_access_limit" integer NULL,
        "includes_live" boolean NOT NULL DEFAULT true,
        "includes_recording" boolean NOT NULL DEFAULT true,
        "includes_transcript" boolean NOT NULL DEFAULT true,
        "includes_pdf" boolean NOT NULL DEFAULT true,
        "status" text CHECK ("status" IN ('active', 'draft', 'archived')) NOT NULL DEFAULT 'active',
        "benefits" jsonb NULL,
        "order_index" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscription_plan_slug_unique" ON "subscription_plan" ("slug") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_plan_deleted_at" ON "subscription_plan" ("deleted_at") WHERE deleted_at IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "customer_subscription" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "customer_email" text NOT NULL,
        "plan_id" text NOT NULL,
        "plan_name" text NOT NULL,
        "status" text CHECK ("status" IN ('active', 'canceled', 'expired', 'past_due')) NOT NULL DEFAULT 'active',
        "current_period_start" timestamptz NOT NULL,
        "current_period_end" timestamptz NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "canceled_at" timestamptz NULL,
        "order_id" text NULL,
        "payment_provider_id" text NOT NULL DEFAULT 'stripe',
        "payment_method_summary" text NULL,
        "monthly_access_used" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "customer_subscription_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_subscription_customer_id" ON "customer_subscription" ("customer_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_subscription_deleted_at" ON "customer_subscription" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "customer_subscription" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "subscription_plan" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "speaker" CASCADE;`)
  }
}
