import { Client } from "pg"

const DATABASE_URL = process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa"

async function seedQuizzes() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log("Connected to PostgreSQL for quiz seeding...")

  const { rows: webinars } = await client.query("SELECT id, title, speaker_name, cpe_credits FROM webinar")

  for (const w of webinars) {
    const quizId = `quiz_${w.id.replace("web_", "")}`
    
    // Check if quiz already exists
    const { rows: existing } = await client.query("SELECT id FROM webinar_quiz WHERE webinar_id = $1", [w.id])
    if (existing.length > 0) {
      continue
    }

    await client.query(
      `INSERT INTO webinar_quiz (
        id, webinar_id, title, instructions, is_enabled, passing_score, cooldown_minutes,
        certificate_template, signatory_name, signatory_title, issuer_name, cpe_credits
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        quizId,
        w.id,
        `CPE Comprehension & Verification Quiz: ${w.title}`,
        "To earn your official NASBA/IRS accredited CPE Certificate of Participation, you must answer the following questions. A minimum passing score of 75% is required. If you score below 75%, a 60-minute cooling period applies before your next attempt.",
        true,
        75,
        60,
        "standard_cpe",
        w.speaker_name || "Senior Faculty",
        "Lead Faculty / CPE Course Director",
        "AcademyIO Continuing Professional Education",
        w.cpe_credits || 2,
      ]
    )

    // Insert 4 rigorous multiple choice questions for each webinar
    const questions = [
      {
        text: `Under the primary regulatory guidelines covered in "${w.title}", what is the standard compliance requirement for reporting documentation?`,
        options: [
          { id: "opt_1", text: "Maintain contemporaneous written records and supporting workpapers for at least 3 years" },
          { id: "opt_2", text: "Oral attestations without written reconciliations" },
          { id: "opt_3", text: "Estimations based on prior-year unaudited benchmarks" },
          { id: "opt_4", text: "Exemption from disclosure if gross revenues are under $5,000,000" },
        ],
        correct: "opt_1",
        explanation: "IRS and NASBA standards require contemporaneous written records and workpapers for compliance verification.",
      },
      {
        text: "Which of the following factors triggers an immediate recalculation under applicable statutory rules?",
        options: [
          { id: "opt_1", text: "Minor fluctuations in quarterly interest rates" },
          { id: "opt_2", text: "A material change in entity ownership structure or asset basis allocation" },
          { id: "opt_3", text: "Filing an automatic 6-month extension" },
          { id: "opt_4", text: "Adoption of calendar year reporting without operational amendments" },
        ],
        correct: "opt_2",
        explanation: "Material changes in ownership or capital asset basis trigger statutory recalculations and disclosure requirements.",
      },
      {
        text: "What is the recommended professional practice when addressing ambiguous tax positions or audit risk thresholds?",
        options: [
          { id: "opt_1", text: "Ignore disclosures until an examination notice is issued" },
          { id: "opt_2", text: "Rely solely on informal peer advice" },
          { id: "opt_3", text: "Document substantial authority or reasonable basis with Form 8275/8275-R disclosure if applicable" },
          { id: "opt_4", text: "Reclassify expenditures as miscellaneous non-deductible items without review" },
        ],
        correct: "opt_3",
        explanation: "Substantial authority and appropriate disclosure protect practitioners and clients from accuracy-related penalties.",
      },
      {
        text: "According to the course materials and instructor syllabus, how should continuing education learning objectives be operationalized in client engagements?",
        options: [
          { id: "opt_1", text: "Integrate standardized internal checklists and multi-level supervisory review procedures" },
          { id: "opt_2", text: "Delegate all final sign-offs to uncertified administrative staff" },
          { id: "opt_3", text: "Bypass secondary quality control reviews during peak tax season" },
          { id: "opt_4", text: "Apply rules retroactively without client disclosure" },
        ],
        correct: "opt_1",
        explanation: "Standardized review procedures and multi-level quality control ensure high audit fidelity and compliance.",
      },
      {
        text: `Under IRS Circular 230 and NASBA CPE standards, what record retention protocol is required for the completion of "${w.title}"?`,
        options: [
          { id: "opt_1", text: "Digital evaluation quiz results, timestamp logs, and certificate issuance records for a minimum of 5 years" },
          { id: "opt_2", text: "Temporary browser cache records destroyed upon session logout" },
          { id: "opt_3", text: "Informal handwritten attendance notes without electronic verification" },
          { id: "opt_4", text: "Attendance verification is exempt for webinars under two hours" },
        ],
        correct: "opt_1",
        explanation: "IRS Circular 230 and NASBA registry standards require continuing education sponsors to maintain comprehensive attendance and evaluation verification records for at least 5 years.",
      },
      {
        text: "What is the mandatory regulatory consequence of scoring below the 75% comprehension evaluation threshold on an accredited webinar assessment?",
        options: [
          { id: "opt_1", text: "The participant must complete a mandatory 60-minute cooling period before re-attempting the evaluation" },
          { id: "opt_2", text: "The participant's live registration is permanently revoked without recourse" },
          { id: "opt_3", text: "A passing certificate is issued with a reduced credit deduction" },
          { id: "opt_4", text: "The participant must repurchase the webinar package" },
        ],
        correct: "opt_1",
        explanation: "Under accreditation guidelines, participants who do not meet the 75% threshold must observe a cooling period before taking a subsequent attempt.",
      },
    ]

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const qId = `qst_${quizId}_${i + 1}`
      await client.query(
        `INSERT INTO quiz_question (
          id, quiz_id, question_text, question_type, options, correct_option_id, explanation, order_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          question_text = EXCLUDED.question_text,
          options = EXCLUDED.options,
          correct_option_id = EXCLUDED.correct_option_id,
          explanation = EXCLUDED.explanation,
          order_index = EXCLUDED.order_index`,
        [
          qId,
          quizId,
          q.text,
          "multiple_choice",
          JSON.stringify(q.options),
          q.correct,
          q.explanation,
          i,
        ]
      )
    }

    console.log(`Seeded quiz & 6 questions for webinar: ${w.title}`)
  }

  await client.end()
  console.log("Quiz seeding complete!")
}

export default seedQuizzes;
