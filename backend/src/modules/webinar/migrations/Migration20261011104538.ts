import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261011104538 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "webinar_variant_mapping" drop constraint if exists "webinar_variant_mapping_variant_id_unique";`);
    this.addSql(`alter table if exists "webinar" drop constraint if exists "webinar_slug_unique";`);
    this.addSql(`create table if not exists "webinar" ("id" text not null, "title" text not null, "slug" text not null, "short_description" text null, "description" text null, "featured_image" text null, "speaker_name" text not null, "speaker_bio" text null, "speaker_photo" text null, "speaker_title" text null, "event_date" timestamptz not null, "start_time" text not null, "end_time" text not null, "timezone" text not null default 'America/New_York', "duration_minutes" integer not null default 60, "category" text not null default 'Tax & Accounting', "tags" jsonb null, "learning_objectives" jsonb null, "target_audience" text null, "cpe_credits" integer not null default 0, "registration_deadline" timestamptz null, "max_attendees" integer null, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'published', "is_featured" boolean not null default false, "is_upcoming" boolean not null default true, "is_ondemand" boolean not null default false, "is_seminar" boolean not null default false, "refund_policy" text null, "live_stream_url" text null, "live_instructions" text null, "live_link_published" boolean not null default false, "recording_url" text null, "recording_instructions" text null, "recording_expires_at" timestamptz null, "transcript_content" text null, "transcript_file_url" text null, "product_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webinar_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_webinar_slug_unique" ON "webinar" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_deleted_at" ON "webinar" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "customer_entitlement" ("id" text not null, "customer_id" text not null, "customer_email" text not null, "order_id" text null, "order_item_id" text null, "variant_id" text null, "variant_title" text null, "access_type" text check ("access_type" in ('live', 'recording', 'transcript', 'pdf', 'bundle')) not null default 'live', "status" text check ("status" in ('active', 'revoked', 'expired')) not null default 'active', "granted_at" timestamptz not null, "expires_at" timestamptz null, "revoked_at" timestamptz null, "revocation_reason" text null, "metadata" jsonb null, "webinar_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_entitlement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_entitlement_webinar_id" ON "customer_entitlement" ("webinar_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_entitlement_deleted_at" ON "customer_entitlement" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webinar_resource" ("id" text not null, "title" text not null, "description" text null, "file_url" text not null, "file_name" text not null, "file_size" integer null, "file_type" text not null default 'pdf', "access_type" text check ("access_type" in ('pdf', 'transcript', 'slides', 'handout')) not null default 'pdf', "is_published" boolean not null default true, "webinar_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webinar_resource_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_resource_webinar_id" ON "webinar_resource" ("webinar_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_resource_deleted_at" ON "webinar_resource" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webinar_variant_mapping" ("id" text not null, "webinar_id" text not null, "variant_id" text not null, "option_type" text check ("option_type" in ('live', 'recording', 'transcript', 'pdf', 'bundle')) not null default 'live', "includes_live" boolean not null default false, "includes_recording" boolean not null default false, "includes_transcript" boolean not null default false, "includes_pdf" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webinar_variant_mapping_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_webinar_variant_mapping_variant_id_unique" ON "webinar_variant_mapping" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webinar_variant_mapping_deleted_at" ON "webinar_variant_mapping" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "customer_entitlement" add constraint "customer_entitlement_webinar_id_foreign" foreign key ("webinar_id") references "webinar" ("id") on update cascade;`);

    this.addSql(`alter table if exists "webinar_resource" add constraint "webinar_resource_webinar_id_foreign" foreign key ("webinar_id") references "webinar" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "customer_entitlement" drop constraint if exists "customer_entitlement_webinar_id_foreign";`);

    this.addSql(`alter table if exists "webinar_resource" drop constraint if exists "webinar_resource_webinar_id_foreign";`);

    this.addSql(`drop table if exists "webinar" cascade;`);

    this.addSql(`drop table if exists "customer_entitlement" cascade;`);

    this.addSql(`drop table if exists "webinar_resource" cascade;`);

    this.addSql(`drop table if exists "webinar_variant_mapping" cascade;`);
  }

}
