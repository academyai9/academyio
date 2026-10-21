import { model } from "@medusajs/framework/utils"

export const WebinarCertificate = model.define("webinar_certificate", {
  id: model.id({ prefix: "cert_" }).primaryKey(),
  certificate_number: model.text().unique(),
  customer_id: model.text(),
  customer_email: model.text(),
  customer_name: model.text(),
  webinar_id: model.text(),
  quiz_id: model.text().nullable(),
  attempt_id: model.text().nullable(),
  webinar_title: model.text(),
  speaker_name: model.text().nullable(),
  event_date: model.dateTime().nullable(),
  issue_date: model.dateTime(),
  cpe_credits: model.number().default(1),
  score_percentage: model.number(),
  signatory_name: model.text().nullable(),
  signatory_title: model.text().nullable(),
  issuer_name: model.text().default("AcademyIO CPE Institute"),
  status: model.enum(["active", "revoked", "reissued"]).default("active"),
  reissue_count: model.number().default(0),
  metadata: model.json().nullable(),
})
