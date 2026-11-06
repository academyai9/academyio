import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261106190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "topics_covered" jsonb null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "webinar" DROP COLUMN IF EXISTS "topics_covered";`)
  }
}
