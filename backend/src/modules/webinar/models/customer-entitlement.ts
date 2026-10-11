import { model } from "@medusajs/framework/utils"
import { Webinar } from "./webinar"

export const CustomerEntitlement = model.define("customer_entitlement", {
  id: model.id({ prefix: "ent_" }).primaryKey(),
  customer_id: model.text(),
  customer_email: model.text(),
  order_id: model.text().nullable(),
  order_item_id: model.text().nullable(),
  variant_id: model.text().nullable(),
  variant_title: model.text().nullable(),
  access_type: model.enum(["live", "recording", "transcript", "pdf", "bundle"]).default("live"),
  status: model.enum(["active", "revoked", "expired"]).default("active"),
  granted_at: model.dateTime(),
  expires_at: model.dateTime().nullable(),
  revoked_at: model.dateTime().nullable(),
  revocation_reason: model.text().nullable(),
  metadata: model.json().nullable(),
  
  webinar: model.belongsTo(() => Webinar, {
    mappedBy: "entitlements",
  }),
})
