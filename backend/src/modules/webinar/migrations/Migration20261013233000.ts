import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261013233000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "order_monitoring_incident" (
        "id" text NOT NULL,
        "incident_type" text NOT NULL,
        "severity" text NOT NULL DEFAULT 'high',
        "status" text NOT NULL DEFAULT 'new',
        "customer_name" text NULL,
        "customer_email" text NULL,
        "checkout_reference" text NULL,
        "payment_reference" text NULL,
        "expected_order_id" text NULL,
        "order_id" text NULL,
        "webinar_title" text NULL,
        "amount" numeric(12,2) NULL,
        "currency_code" text NOT NULL DEFAULT 'usd',
        "payment_status" text NULL,
        "description" text NOT NULL,
        "detection_rule" text NOT NULL,
        "recommended_action" text NULL,
        "admin_notes" text NULL,
        "email_alert_sent" boolean NOT NULL DEFAULT false,
        "email_alert_sent_at" timestamptz NULL,
        "email_provider_message_id" text NULL,
        "email_error" text NULL,
        "idempotency_key" text NOT NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "resolved_at" timestamptz NULL,
        "resolved_by" text NULL,
        CONSTRAINT "order_monitoring_incident_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "order_monitoring_incident_idempotency_key_unique" UNIQUE ("idempotency_key")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_omi_status" ON "order_monitoring_incident" ("status");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_omi_type" ON "order_monitoring_incident" ("incident_type");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_omi_created_at" ON "order_monitoring_incident" ("created_at" DESC);`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_omi_order_id" ON "order_monitoring_incident" ("order_id") WHERE order_id IS NOT NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "order_monitoring_audit_log" (
        "id" text NOT NULL,
        "incident_id" text NOT NULL REFERENCES "order_monitoring_incident" ("id") ON DELETE CASCADE,
        "admin_user_id" text NULL,
        "admin_email" text NULL,
        "action" text NOT NULL,
        "previous_status" text NULL,
        "new_status" text NULL,
        "notes" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "order_monitoring_audit_log_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_omal_incident_id" ON "order_monitoring_audit_log" ("incident_id");`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "order_monitoring_email_log" (
        "id" text NOT NULL,
        "incident_id" text NOT NULL REFERENCES "order_monitoring_incident" ("id") ON DELETE CASCADE,
        "recipient" text NOT NULL,
        "subject" text NOT NULL,
        "body" text NOT NULL,
        "status" text NOT NULL DEFAULT 'sent',
        "provider" text NOT NULL DEFAULT 'system_mailer',
        "provider_message_id" text NULL,
        "error" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "order_monitoring_email_log_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_omel_incident_id" ON "order_monitoring_email_log" ("incident_id");`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "order_monitoring_setting" (
        "key" text NOT NULL,
        "value" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "order_monitoring_setting_pkey" PRIMARY KEY ("key")
      );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "order_monitoring_email_log" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "order_monitoring_audit_log" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "order_monitoring_incident" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "order_monitoring_setting" CASCADE;`)
  }
}
