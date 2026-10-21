import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261016030000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "webinar_file" (
        "id" text NOT NULL,
        "webinar_id" text NOT NULL REFERENCES "webinar"("id") ON DELETE CASCADE,
        "purchase_option" text NOT NULL DEFAULT 'all',
        "variant_id" text NULL,
        "material_type" text NOT NULL DEFAULT 'handout',
        "title" text NOT NULL,
        "description" text NULL,
        "s3_key" text NOT NULL,
        "s3_bucket" text NOT NULL DEFAULT 'academyio-private-webinars',
        "s3_region" text NOT NULL DEFAULT 'us-east-1',
        "file_name" text NOT NULL,
        "file_size" bigint NOT NULL DEFAULT 0,
        "mime_type" text NOT NULL DEFAULT 'application/octet-stream',
        "is_active" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "upload_status" text NOT NULL DEFAULT 'completed',
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "webinar_file_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_file_webinar_id" ON "webinar_file" ("webinar_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_file_purchase_option" ON "webinar_file" ("purchase_option") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_file_material_type" ON "webinar_file" ("material_type") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_file_is_active" ON "webinar_file" ("is_active") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "webinar_file" CASCADE;`)
  }
}
