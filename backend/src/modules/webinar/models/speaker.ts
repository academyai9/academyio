import { model } from "@medusajs/framework/utils"
import { Webinar } from "./webinar"

export const Speaker = model.define("speaker", {
  id: model.id({ prefix: "spk_" }).primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  bio: model.text().nullable(),
  designation: model.text().nullable(),
  qualifications: model.text().nullable(),
  photo_url: model.text().nullable(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  status: model.enum(["active", "archived"]).default("active"),
  is_featured: model.boolean().default(false),
  featured_order: model.number().default(0),
  specialty: model.text().nullable(),
  metadata: model.json().nullable(),
  webinars: model.hasMany(() => Webinar, {
    mappedBy: "speaker",
  }),
})
