import { model } from "@medusajs/framework/utils"
import { Webinar } from "./webinar"

export const WebinarResource = model.define("webinar_resource", {
  id: model.id({ prefix: "res_" }).primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  file_url: model.text(),
  file_name: model.text(),
  file_size: model.number().nullable(),
  file_type: model.text().default("pdf"),
  access_type: model.enum(["pdf", "transcript", "slides", "handout"]).default("pdf"),
  is_published: model.boolean().default(true),
  
  webinar: model.belongsTo(() => Webinar, {
    mappedBy: "resources",
  }),
})
