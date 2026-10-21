import { model } from "@medusajs/framework/utils"
import { WebinarQuiz } from "./webinar-quiz"

export const QuizQuestion = model.define("quiz_question", {
  id: model.id({ prefix: "qst_" }).primaryKey(),
  question_text: model.text(),
  question_type: model.text().default("multiple_choice"),
  options: model.json(), // Array of { id: string, text: string }
  correct_option_id: model.text(),
  explanation: model.text().nullable(),
  order_index: model.number().default(0),
  metadata: model.json().nullable(),

  quiz: model.belongsTo(() => WebinarQuiz, {
    mappedBy: "questions",
  }),
})
