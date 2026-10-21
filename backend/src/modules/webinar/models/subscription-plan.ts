import { model } from "@medusajs/framework/utils"
import { CustomerSubscription } from "./customer-subscription"

export const SubscriptionPlan = model.define("subscription_plan", {
  id: model.id({ prefix: "sub_plan_" }).primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  description: model.text().nullable(),
  price: model.number().default(99),
  currency_code: model.text().default("usd"),
  billing_interval: model.text().default("monthly"),
  webinar_access_limit: model.number().nullable(),
  includes_live: model.boolean().default(true),
  includes_recording: model.boolean().default(true),
  includes_transcript: model.boolean().default(true),
  includes_pdf: model.boolean().default(true),
  status: model.enum(["active", "draft", "archived"]).default("active"),
  benefits: model.json().nullable(),
  order_index: model.number().default(0),
  metadata: model.json().nullable(),
  subscriptions: model.hasMany(() => CustomerSubscription, {
    mappedBy: "plan",
  }),
})
