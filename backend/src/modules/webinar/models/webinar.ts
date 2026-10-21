import { model } from "@medusajs/framework/utils"
import { WebinarResource } from "./webinar-resource"
import { CustomerEntitlement } from "./customer-entitlement"
import { Speaker } from "./speaker"

export const Webinar = model.define("webinar", {
  id: model.id({ prefix: "web_" }).primaryKey(),
  title: model.text(),
  slug: model.text().unique(),
  short_description: model.text().nullable(),
  description: model.text().nullable(),
  featured_image: model.text().nullable(),
  speaker_name: model.text(),
  speaker_bio: model.text().nullable(),
  speaker_photo: model.text().nullable(),
  speaker_title: model.text().nullable(),
  event_date: model.dateTime(),
  start_time: model.text(),
  end_time: model.text(),
  timezone: model.text().default("America/New_York"),
  duration_minutes: model.number().default(60),
  category: model.text().default("Federal Taxation"),
  tags: model.json().nullable(),
  learning_objectives: model.json().nullable(),
  target_audience: model.text().nullable(),
  cpe_credits: model.number().default(0),
  registration_deadline: model.dateTime().nullable(),
  max_attendees: model.number().nullable(),
  status: model.enum(["draft", "published", "archived"]).default("published"),
  is_featured: model.boolean().default(false),
  is_upcoming: model.boolean().default(true),
  is_ondemand: model.boolean().default(false),
  is_seminar: model.boolean().default(false),
  refund_policy: model.text().nullable(),
  
  // SEO Metadata
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  
  // Secure Content Delivery Attributes (Administrator Controlled)
  live_stream_url: model.text().nullable(),
  live_instructions: model.text().nullable(),
  live_link_published: model.boolean().default(false),
  
  recording_url: model.text().nullable(),
  recording_instructions: model.text().nullable(),
  recording_expires_at: model.dateTime().nullable(),
  recording_published: model.boolean().default(false),
  
  transcript_content: model.text().nullable(),
  transcript_file_url: model.text().nullable(),
  
  // Medusa Product ID association
  product_id: model.text().nullable(),
  
  metadata: model.json().nullable(),
  
  speaker: model.belongsTo(() => Speaker, {
    mappedBy: "webinars",
  }).nullable(),
  resources: model.hasMany(() => WebinarResource, {
    mappedBy: "webinar",
  }),
  entitlements: model.hasMany(() => CustomerEntitlement, {
    mappedBy: "webinar",
  }),
})
