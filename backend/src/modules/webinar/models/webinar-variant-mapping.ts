import { model } from "@medusajs/framework/utils"

export const WebinarVariantMapping = model.define("webinar_variant_mapping", {
  id: model.id({ prefix: "wvm_" }).primaryKey(),
  webinar_id: model.text(),
  variant_id: model.text().unique(),
  option_type: model.enum(["live", "recording", "transcript", "pdf", "bundle"]).default("live"),
  includes_live: model.boolean().default(false),
  includes_recording: model.boolean().default(false),
  includes_transcript: model.boolean().default(false),
  includes_pdf: model.boolean().default(false),
})
