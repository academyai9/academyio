import { model } from "@medusajs/framework/utils"

export const QuizAttempt = model.define("quiz_attempt", {
  id: model.id({ prefix: "att_" }).primaryKey(),
  customer_id: model.text(),
  customer_email: model.text(),
  customer_name: model.text().nullable(),
  webinar_id: model.text(),
  quiz_id: model.text(),
  attempt_number: model.number().default(1),
  answers: model.json(), // { [question_id]: selected_option_id }
  total_questions: model.number(),
  correct_answers: model.number(),
  score_percentage: model.number(),
  passed: model.boolean().default(false),
  submitted_at: model.dateTime(),
  next_eligible_at: model.dateTime().nullable(),
  cooldown_reset_by_admin: model.boolean().default(false),
  admin_notes: model.text().nullable(),
  metadata: model.json().nullable(),
})
