import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261016160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "customer_audit_log" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "admin_id" text NULL,
        "admin_email" text NULL,
        "action" text NOT NULL,
        "details" jsonb NULL,
        "ip_address" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "customer_audit_log_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_audit_log_customer_id" ON "customer_audit_log" ("customer_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_audit_log_action" ON "customer_audit_log" ("action");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_audit_log_created_at" ON "customer_audit_log" ("created_at");`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "customer_audit_log" CASCADE;`)
  }
}
