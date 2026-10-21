import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261015040000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE IF EXISTS "accreditation_organization" 
      ADD COLUMN IF NOT EXISTS "show_on_homepage" boolean NOT NULL DEFAULT true;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "homepage_section_settings" (
        "section_key" text NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "title" text NULL,
        "subtitle" text NULL,
        "description" text NULL,
        "metadata" jsonb NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "homepage_section_settings_pkey" PRIMARY KEY ("section_key")
      );
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "credit_type" (
        "id" text NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "badge" text NULL,
        "description" text NULL,
        "category" text NOT NULL,
        "default_credit_hours" text NOT NULL DEFAULT '1.0 - 2.0 Credits',
        "organization_code" text NULL,
        "icon" text NULL DEFAULT 'award',
        "is_active" boolean NOT NULL DEFAULT true,
        "show_on_homepage" boolean NOT NULL DEFAULT true,
        "show_on_webinars" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "credit_type_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "credit_type_code_unique" UNIQUE ("code")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_credit_type_code" ON "credit_type" ("code");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_credit_type_active" ON "credit_type" ("is_active") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_credit_type_homepage" ON "credit_type" ("show_on_homepage") WHERE deleted_at IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "other_information_item" (
        "id" text NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "icon" text NULL DEFAULT 'info',
        "image_url" text NULL,
        "link_url" text NULL,
        "link_text" text NULL,
        "badge" text NULL,
        "section" text NOT NULL DEFAULT 'homepage',
        "is_active" boolean NOT NULL DEFAULT true,
        "show_on_homepage" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "other_information_item_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_other_info_active" ON "other_information_item" ("is_active") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_other_info_homepage" ON "other_information_item" ("show_on_homepage") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "other_information_item";`)
    this.addSql(`DROP TABLE IF EXISTS "credit_type";`)
    this.addSql(`DROP TABLE IF EXISTS "homepage_section_settings";`)
  }
}
