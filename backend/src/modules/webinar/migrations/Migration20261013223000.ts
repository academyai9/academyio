import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261013223000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "testimonial" (
        "id" text NOT NULL,
        "customer_name" text NOT NULL,
        "designation" text NOT NULL,
        "company" text NULL,
        "avatar_url" text NULL,
        "content" text NOT NULL,
        "rating" integer NOT NULL DEFAULT 5,
        "is_published" boolean NOT NULL DEFAULT true,
        "featured_homepage" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_testimonial_deleted_at" ON "testimonial" ("deleted_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_testimonial_published" ON "testimonial" ("is_published") WHERE deleted_at IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "accreditation_organization" (
        "id" text NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "short_name" text NOT NULL,
        "logo_url" text NOT NULL,
        "website_url" text NULL,
        "alt_text" text NOT NULL,
        "description" text NULL,
        "default_credit_type" text NOT NULL DEFAULT 'CPE Credits',
        "is_enabled" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "accreditation_organization_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "accreditation_organization_code_unique" UNIQUE ("code")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_accreditation_org_deleted_at" ON "accreditation_organization" ("deleted_at") WHERE deleted_at IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "webinar_credit_info" (
        "id" text NOT NULL,
        "webinar_id" text NOT NULL,
        "cpe_credit" numeric NOT NULL DEFAULT 2.0,
        "field_of_study" text NOT NULL DEFAULT 'Taxes',
        "prerequisites" text NOT NULL DEFAULT 'None',
        "learning_level" text NOT NULL DEFAULT 'Basic',
        "location" text NOT NULL DEFAULT 'Virtual/Online',
        "delivery_method" text NOT NULL DEFAULT 'Group Internet Based',
        "irs_course_id" text NULL,
        "attendance_requirement" text NOT NULL DEFAULT 'Yes',
        "session_duration" text NOT NULL DEFAULT '100 Minutes',
        "case_studies_qna" text NOT NULL DEFAULT 'Included',
        "presentation_reference" text NOT NULL DEFAULT 'Available for reference',
        "credit_unit" text NOT NULL DEFAULT 'Credits',
        "additional_notes" text NULL,
        "organizations" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "webinar_credit_info_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "webinar_credit_info_webinar_id_unique" UNIQUE ("webinar_id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_credit_info_webinar_id" ON "webinar_credit_info" ("webinar_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_credit_info_deleted_at" ON "webinar_credit_info" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "webinar_credit_info";`)
    this.addSql(`DROP TABLE IF EXISTS "accreditation_organization";`)
    this.addSql(`DROP TABLE IF EXISTS "testimonial";`)
  }
}
