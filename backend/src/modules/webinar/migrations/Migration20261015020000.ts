import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261015020000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "promotional_banner" (
        "id" text NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "discount_text" text NOT NULL,
        "coupon_code" text NOT NULL,
        "discount_type" text NOT NULL DEFAULT 'percentage',
        "discount_value" numeric NOT NULL DEFAULT 20,
        "start_date" timestamptz NULL,
        "end_date" timestamptz NULL,
        "timezone" text NOT NULL DEFAULT 'America/New_York',
        "cta_text" text NOT NULL DEFAULT 'Use Code',
        "cta_url" text NULL,
        "style_preset" text NOT NULL DEFAULT 'festive_amber',
        "bg_color" text NULL,
        "text_color" text NULL,
        "accent_color" text NULL,
        "icon" text NOT NULL DEFAULT '🎉',
        "show_countdown" boolean NOT NULL DEFAULT true,
        "terms_url" text NULL,
        "scope" text NOT NULL DEFAULT 'all',
        "target_categories" jsonb NULL DEFAULT '[]'::jsonb,
        "target_webinar_ids" jsonb NULL DEFAULT '[]'::jsonb,
        "target_options" jsonb NULL DEFAULT '["all"]'::jsonb,
        "priority" integer NOT NULL DEFAULT 100,
        "is_active" boolean NOT NULL DEFAULT true,
        "medusa_promotion_id" text NULL,
        "metadata" jsonb NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "promotional_banner_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pb_is_active" ON "promotional_banner" ("is_active");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pb_priority" ON "promotional_banner" ("priority" DESC);`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pb_scope" ON "promotional_banner" ("scope");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pb_coupon_code" ON "promotional_banner" ("coupon_code");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pb_dates" ON "promotional_banner" ("start_date", "end_date");`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "promotional_banner" CASCADE;`)
  }
}
