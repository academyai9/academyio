import { model } from "@medusajs/framework/utils"
import { QuizQuestion } from "./quiz-question"

export const WebinarQuiz = model.define("webinar_quiz", {
  id: model.id({ prefix: "quiz_" }).primaryKey(),
  webinar_id: model.text().unique(),
  title: model.text().default("Post-Webinar CPE Participation Quiz"),
  instructions: model.text().nullable(),
  is_enabled: model.boolean().default(true),
  passing_score: model.number().default(75),
  cooldown_minutes: model.number().default(60),
  max_attempts: model.number().nullable(),
  certificate_template: model.text().default("standard_cpe"),
  signatory_name: model.text().nullable(),
  signatory_title: model.text().nullable(),
  issuer_name: model.text().default("AcademyIO CPE Institute"),
  logo_url: model.text().nullable(),
  cpe_credits: model.number().nullable(),
  metadata: model.json().nullable(),

  questions: model.hasMany(() => QuizQuestion, {
    mappedBy: "quiz",
  }),
})
