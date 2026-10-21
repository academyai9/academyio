import { model } from "@medusajs/framework/utils"

export const WebinarVariantMapping = model.define("webinar_variant_mapping", {
  id: model.id({ prefix: "wvm_" }).primaryKey(),
  webinar_id: model.text(),
  variant_id: model.text().unique(),
  option_type: model.text().default("live"),
  title: model.text().nullable(),
  description: model.text().nullable(),
  price: model.number().nullable(),
  currency_code: model.text().default("usd"),
  includes_live: model.boolean().default(false),
  includes_recording: model.boolean().default(false),
  includes_transcript: model.boolean().default(false),
  includes_pdf: model.boolean().default(false),
  is_enabled: model.boolean().default(true),
  order_index: model.number().default(0),
  expires_in_days: model.number().nullable(),
})
