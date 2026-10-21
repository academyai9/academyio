import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261015050000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_media_link" (
        "id" text NOT NULL,
        "platform" text NOT NULL,
        "name" text NOT NULL,
        "url" text NOT NULL,
        "icon" text NOT NULL DEFAULT 'custom',
        "custom_icon_url" text NULL,
        "label" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "open_in_new_tab" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_media_link_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_media_active" ON "social_media_link" ("is_active") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_media_order" ON "social_media_link" ("display_order") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "social_media_link";`)
  }
}
