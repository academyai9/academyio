import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261013033000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "webinar_quiz" (
        "id" text NOT NULL,
        "webinar_id" text NOT NULL,
        "title" text NOT NULL DEFAULT 'Post-Webinar CPE Participation Quiz',
        "instructions" text NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "passing_score" integer NOT NULL DEFAULT 75,
        "cooldown_minutes" integer NOT NULL DEFAULT 60,
        "max_attempts" integer NULL,
        "certificate_template" text NOT NULL DEFAULT 'standard_cpe',
        "signatory_name" text NULL,
        "signatory_title" text NULL,
        "issuer_name" text NOT NULL DEFAULT 'AcademyIO CPE Institute',
        "logo_url" text NULL,
        "cpe_credits" numeric NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "webinar_quiz_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "webinar_quiz_webinar_id_unique" UNIQUE ("webinar_id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_quiz_deleted_at" ON "webinar_quiz" ("deleted_at") WHERE deleted_at IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "quiz_question" (
        "id" text NOT NULL,
        "quiz_id" text NOT NULL,
        "question_text" text NOT NULL,
        "question_type" text NOT NULL DEFAULT 'multiple_choice',
        "options" jsonb NOT NULL,
        "correct_option_id" text NOT NULL,
        "explanation" text NULL,
        "order_index" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quiz_question_quiz_id" ON "quiz_question" ("quiz_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quiz_question_deleted_at" ON "quiz_question" ("deleted_at") WHERE deleted_at IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "quiz_attempt" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "customer_email" text NOT NULL,
        "customer_name" text NULL,
        "webinar_id" text NOT NULL,
        "quiz_id" text NOT NULL,
        "attempt_number" integer NOT NULL DEFAULT 1,
        "answers" jsonb NOT NULL,
        "total_questions" integer NOT NULL,
        "correct_answers" integer NOT NULL,
        "score_percentage" numeric NOT NULL,
        "passed" boolean NOT NULL DEFAULT false,
        "submitted_at" timestamptz NOT NULL DEFAULT now(),
        "next_eligible_at" timestamptz NULL,
        "cooldown_reset_by_admin" boolean NOT NULL DEFAULT false,
        "admin_notes" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "quiz_attempt_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quiz_attempt_customer_webinar" ON "quiz_attempt" ("customer_id", "webinar_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quiz_attempt_webinar_id" ON "quiz_attempt" ("webinar_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_quiz_attempt_deleted_at" ON "quiz_attempt" ("deleted_at") WHERE deleted_at IS NULL;`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "webinar_certificate" (
        "id" text NOT NULL,
        "certificate_number" text NOT NULL,
        "customer_id" text NOT NULL,
        "customer_email" text NOT NULL,
        "customer_name" text NOT NULL,
        "webinar_id" text NOT NULL,
        "quiz_id" text NULL,
        "attempt_id" text NULL,
        "webinar_title" text NOT NULL,
        "speaker_name" text NULL,
        "event_date" timestamptz NULL,
        "issue_date" timestamptz NOT NULL DEFAULT now(),
        "cpe_credits" numeric NOT NULL DEFAULT 1.0,
        "score_percentage" numeric NOT NULL,
        "signatory_name" text NULL,
        "signatory_title" text NULL,
        "issuer_name" text NOT NULL DEFAULT 'AcademyIO CPE Institute',
        "status" text CHECK ("status" IN ('active', 'revoked', 'reissued')) NOT NULL DEFAULT 'active',
        "reissue_count" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "webinar_certificate_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "webinar_certificate_number_unique" UNIQUE ("certificate_number")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_cert_customer_webinar" ON "webinar_certificate" ("customer_id", "webinar_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_cert_deleted_at" ON "webinar_certificate" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "webinar_certificate" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "quiz_attempt" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "quiz_question" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "webinar_quiz" CASCADE;`)
  }
}
