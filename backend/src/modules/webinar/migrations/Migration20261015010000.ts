import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261015010000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "order_email_notification" (
        "id" text NOT NULL,
        "order_id" text NOT NULL REFERENCES "order" ("id") ON DELETE CASCADE,
        "notification_type" text NOT NULL DEFAULT 'order_confirmation',
        "recipient_email" text NOT NULL,
        "recipient_name" text NULL,
        "subject" text NOT NULL,
        "body_html" text NULL,
        "body_text" text NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "attempt_count" integer NOT NULL DEFAULT 1,
        "provider" text NOT NULL DEFAULT 'console',
        "provider_message_id" text NULL,
        "error_message" text NULL,
        "sent_at" timestamptz NULL,
        "last_attempt_at" timestamptz NOT NULL DEFAULT now(),
        "metadata" jsonb NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "order_email_notification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "order_email_notification_order_type_unique" UNIQUE ("order_id", "notification_type")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_oen_order_id" ON "order_email_notification" ("order_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_oen_recipient_email" ON "order_email_notification" ("recipient_email");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_oen_status" ON "order_email_notification" ("status");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_oen_created_at" ON "order_email_notification" ("created_at" DESC);`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "order_email_notification" CASCADE;`)
  }
}
