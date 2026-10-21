import { model } from "@medusajs/framework/utils"
import { SubscriptionPlan } from "./subscription-plan"

export const CustomerSubscription = model.define("customer_subscription", {
  id: model.id({ prefix: "csub_" }).primaryKey(),
  customer_id: model.text(),
  customer_email: model.text(),
  plan_name: model.text(),
  status: model.enum(["active", "canceled", "expired", "past_due"]).default("active"),
  current_period_start: model.dateTime(),
  current_period_end: model.dateTime(),
  cancel_at_period_end: model.boolean().default(false),
  canceled_at: model.dateTime().nullable(),
  order_id: model.text().nullable(),
  payment_provider_id: model.text().default("stripe"),
  payment_method_summary: model.text().nullable(),
  monthly_access_used: model.number().default(0),
  metadata: model.json().nullable(),
  plan: model.belongsTo(() => SubscriptionPlan, {
    mappedBy: "subscriptions",
  }).nullable(),
})
