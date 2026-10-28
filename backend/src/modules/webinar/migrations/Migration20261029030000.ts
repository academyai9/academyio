import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261029030000 extends Migration {
  override async up(): Promise<void> {
    // High-performance B-Tree indexes for fast webinar filtering, search and sorting
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_status_event_date" ON "webinar" ("status", "event_date" DESC) WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_is_upcoming" ON "webinar" ("is_upcoming", "event_date" ASC) WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_is_ondemand" ON "webinar" ("is_ondemand") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_category" ON "webinar" ("category") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_created_at" ON "webinar" ("created_at" DESC) WHERE deleted_at IS NULL;`)

    // Indexing for entitlements and subscriptions (eliminates full table scans on checkout/dashboard)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_entitlement_cust_id" ON "customer_entitlement" ("customer_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_entitlement_status" ON "customer_entitlement" ("status") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_subscription_cust_status" ON "customer_subscription" ("customer_id", "status") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_webinar_status_event_date";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_webinar_is_upcoming";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_webinar_is_ondemand";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_webinar_category";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_webinar_created_at";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_customer_entitlement_cust_id";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_customer_entitlement_status";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_customer_subscription_cust_status";`)
  }
}
