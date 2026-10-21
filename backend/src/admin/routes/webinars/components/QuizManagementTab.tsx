import React, { useState, useEffect } from "react"
import {
  Plus,
  Trash,
  CheckCircle,
  XMark,
  ArrowPath,
  ChevronUpMini,
  ChevronDown,
  Eye,
  ExclamationCircle,
} from "@medusajs/icons"
import { Heading, Text, Badge, Button, Input } from "@medusajs/ui"

interface QuestionOption {
  id: string
  text: string
}

interface Question {
  id?: string
  question_text: string
  question_type: string
  options: QuestionOption[]
  correct_option_id: string
  explanation?: string
  order_index?: number
}

export default function QuizManagementTab({
  webinar,
  webinarId,
  notify,
  getAuthHeaders,
}: {
  webinar: any
  webinarId: string
  notify: (type: "success" | "error", text: string) => void
  getAuthHeaders: () => Record<string, string>
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [quizForm, setQuizForm] = useState({
    title: "",
    instructions: "",
    is_enabled: true,
    status: "published" as "draft" | "published",
    passing_score: 75,
    cooldown_minutes: 60,
    max_attempts: "",
    certificate_template: "standard_cpe",
    signatory_name: "",
    signatory_title: "",
    issuer_name: "AcademyIO Continuing Professional Education",
    cpe_credits: 2.0,
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const fetchQuiz = async () => {
    if (!webinarId) return
    setLoading(true)
    try {
      const res = await fetch(`/admin/webinars/${webinarId}/quiz`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load quiz")
      const data = await res.json()

      if (data.quiz) {
        setQuizForm({
          title: data.quiz.title || `CPE Comprehension & Verification Quiz: ${webinar?.title || ""}`,
          instructions: data.quiz.instructions || "Answer all questions. A minimum score of 75% is required to earn your certificate.",
          is_enabled: data.quiz.is_enabled !== false,
          status: data.quiz.status || (data.quiz.is_enabled ? "published" : "draft"),
          passing_score: data.quiz.passing_score || 75,
          cooldown_minutes: data.quiz.cooldown_minutes || 60,
          max_attempts: data.quiz.max_attempts ? String(data.quiz.max_attempts) : "",
          certificate_template: data.quiz.certificate_template || "standard_cpe",
          signatory_name: data.quiz.signatory_name || webinar?.speaker_name || "",
          signatory_title: data.quiz.signatory_title || "Lead Faculty / CPE Course Director",
          issuer_name: data.quiz.issuer_name || "AcademyIO Continuing Professional Education",
          cpe_credits: data.quiz.cpe_credits || webinar?.cpe_credits || 2.0,
        })
      } else {
        // Defaults if no quiz created yet
        setQuizForm({
          title: `CPE Comprehension & Verification Quiz: ${webinar?.title || ""}`,
          instructions: "Answer all questions. A minimum score of 75% is required to earn your certificate. If you score below 75%, a 60-minute cooling period applies.",
          is_enabled: true,
          status: "published",
          passing_score: 75,
          cooldown_minutes: 60,
          max_attempts: "",
          certificate_template: "standard_cpe",
          signatory_name: webinar?.speaker_name || "",
          signatory_title: "Lead Faculty / CPE Course Director",
          issuer_name: "AcademyIO Continuing Professional Education",
          cpe_credits: webinar?.cpe_credits || 2.0,
        })
      }

      setQuestions(data.questions || [])
    } catch (e: any) {
      console.error(e)
      notify("error", e.message || "Failed to load quiz")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuiz()
  }, [webinarId])

  const handleSaveQuiz = async (targetStatus: "draft" | "published") => {
    // 5-8 question rule validation on publish
    if (targetStatus === "published") {
      if (questions.length < 5 || questions.length > 8) {
        notify("error", `A published quiz must contain between 5 and 8 questions. Currently you have ${questions.length}. You may save as Draft if not ready.`)
        return
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question_text.trim()) {
          notify("error", `Question #${i + 1} must have question text.`)
          return
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          notify("error", `Question #${i + 1} must have exactly 4 answer options (labeled A, B, C, D).`)
          return
        }
        for (let j = 0; j < 4; j++) {
          if (!q.options[j].text.trim()) {
            notify("error", `Question #${i + 1}, Option ${String.fromCharCode(65 + j)} cannot be empty.`)
            return
          }
        }
        if (!q.correct_option_id) {
          notify("error", `Question #${i + 1} must have a designated correct answer.`)
          return
        }
      }
    }

    setSaving(true)
    try {
      const payload = {
        quiz: {
          ...quizForm,
          status: targetStatus,
          is_enabled: targetStatus === "published",
          max_attempts: quizForm.max_attempts ? parseInt(quizForm.max_attempts) : null,
          passing_score: Number(quizForm.passing_score),
          cooldown_minutes: Number(quizForm.cooldown_minutes),
          cpe_credits: Number(quizForm.cpe_credits),
        },
        questions,
      }

      const res = await fetch(`/admin/webinars/${webinarId}/quiz`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.message || "Failed to save quiz configuration")

      setQuizForm((prev) => ({
        ...prev,
        status: targetStatus,
        is_enabled: targetStatus === "published",
      }))

      notify("success", targetStatus === "published" ? "Webinar quiz published successfully!" : "Quiz draft saved successfully.")
      if (result.questions) setQuestions(result.questions)
    } catch (e: any) {
      notify("error", e.message || "Failed to save quiz")
    } finally {
      setSaving(false)
    }
  }

  // Question manipulation helpers
  const handleAddQuestion = () => {
    if (questions.length >= 8) {
      notify("error", "Maximum 8 questions permitted per webinar quiz.")
      return
    }
    const newIdx = questions.length + 1
    const newQ: Question = {
      id: `qst_${Date.now()}`,
      question_text: "",
      question_type: "multiple_choice",
      options: [
        { id: "A", text: "" },
        { id: "B", text: "" },
        { id: "C", text: "" },
        { id: "D", text: "" },
      ],
      correct_option_id: "A",
      explanation: "",
      order_index: questions.length,
    }
    setQuestions((prev) => [...prev, newQ])
  }

  const handleDeleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= questions.length) return
    const updated = [...questions]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    setQuestions(updated)
  }

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev]
      const q = { ...copy[qIndex] }
      const opts = [...q.options]
      opts[optIndex] = { ...opts[optIndex], text }
      q.options = opts
      copy[qIndex] = q
      return copy
    })
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-neutral-400">
        <ArrowPath className="w-5 h-5 animate-spin mx-auto mb-2" />
        Loading quiz configuration...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Webinar-Specific Comprehension Quiz & Certification Settings
            </Heading>
            <Badge color={quizForm.status === "published" ? "green" : "orange"} size="small">
              {quizForm.status === "published" ? "Published (Live)" : "Draft"}
            </Badge>
          </div>
          <Text className="text-xs text-neutral-500 mt-1">
            Configure the 5–8 question post-webinar evaluation for &quot;{webinar?.title}&quot;. Answers are securely evaluated on the server at 75% passing threshold.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Quiz</span>
          </Button>

          <Button
            variant="secondary"
            size="small"
            onClick={() => handleSaveQuiz("draft")}
            disabled={saving}
          >
            Save as Draft
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={() => handleSaveQuiz("published")}
            disabled={saving}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <>
                <ArrowPath className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Publish Quiz</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 1. Quiz Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 text-xs">
        <div className="space-y-4 md:col-span-2">
          <div>
            <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
              Quiz Title:
            </label>
            <Input
              value={quizForm.title}
              onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
              placeholder="e.g., CPE Comprehension & Verification Quiz"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
              Instructions for Participants:
            </label>
            <textarea
              value={quizForm.instructions}
              onChange={(e) => setQuizForm({ ...quizForm, instructions: e.target.value })}
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Instructions displayed to attendee before taking the quiz..."
            />
          </div>
        </div>

        {/* Numeric Rules & Toggles */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                Passing Score (%):
              </label>
              <Input
                type="number"
                value={quizForm.passing_score}
                onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 75 })}
              />
              <span className="text-[10px] text-neutral-400">Default: 75%</span>
            </div>

            <div>
              <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                Retake Cooldown:
              </label>
              <Input
                type="number"
                value={quizForm.cooldown_minutes}
                onChange={(e) => setQuizForm({ ...quizForm, cooldown_minutes: parseInt(e.target.value) || 60 })}
              />
              <span className="text-[10px] text-neutral-400">Minutes (Default: 60)</span>
            </div>
          </div>

          <div>
            <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
              CPE Credit Hours Awarded:
            </label>
            <Input
              type="number"
              step="0.5"
              value={quizForm.cpe_credits}
              onChange={(e) => setQuizForm({ ...quizForm, cpe_credits: parseFloat(e.target.value) || 1.0 })}
            />
          </div>
        </div>
      </div>

      {/* 2. Certificate Signatory & Template Configuration */}
      <div className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-4 text-xs">
        <Heading level="h3" className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          Certificate Signatory & Issuer Metadata
        </Heading>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
              Signatory Name:
            </label>
            <Input
              value={quizForm.signatory_name}
              onChange={(e) => setQuizForm({ ...quizForm, signatory_name: e.target.value })}
              placeholder={webinar?.speaker_name || "Faculty Dean"}
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
              Signatory Designation / Title:
            </label>
            <Input
              value={quizForm.signatory_title}
              onChange={(e) => setQuizForm({ ...quizForm, signatory_title: e.target.value })}
              placeholder="Lead Faculty / CPE Course Director"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
              Issuing Organization:
            </label>
            <Input
              value={quizForm.issuer_name}
              onChange={(e) => setQuizForm({ ...quizForm, issuer_name: e.target.value })}
              placeholder="AcademyIO Continuing Professional Education"
            />
          </div>
        </div>
      </div>

      {/* 3. Question-and-Answer Management (5 to 8 Questions) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heading level="h3" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Scored Questions & Answer Keys
            </Heading>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                questions.length >= 5 && questions.length <= 8
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {questions.length} / 8 Questions
            </span>
            {questions.length < 5 && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                (At least 5 questions required to publish)
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            size="small"
            onClick={handleAddQuestion}
            disabled={questions.length >= 8}
            className="flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question ({8 - questions.length} remaining)</span>
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="p-8 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-3">
            <Text className="text-xs text-neutral-400">No questions configured yet for this webinar quiz.</Text>
            <Button size="small" variant="secondary" onClick={handleAddQuestion}>
              Create First Question
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div
                key={q.id || qIdx}
                className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-4 text-xs shadow-xs"
              >
                {/* Question Header & Order Controls */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                      {qIdx + 1}
                    </span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      Question #{qIdx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(qIdx, "up")}
                      disabled={qIdx === 0}
                      className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-30 cursor-pointer"
                      title="Move Question Up"
                    >
                      <ChevronUpMini className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(qIdx, "down")}
                      disabled={qIdx === questions.length - 1}
                      className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-30 cursor-pointer"
                      title="Move Question Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="p-1 text-red-500 hover:text-red-700 ml-2 cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Question Text:
                  </label>
                  <textarea
                    value={q.question_text}
                    onChange={(e) => handleUpdateQuestion(qIdx, "question_text", e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter the evaluation question..."
                  />
                </div>

                {/* 4 Options A, B, C, D */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="font-bold">Answer Options (Select the radio for the Correct Answer):</span>
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correct_option_id === opt.id
                      const letter = String.fromCharCode(65 + optIdx)
                      return (
                        <div
                          key={opt.id || optIdx}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${q.id || qIdx}`}
                            checked={isCorrect}
                            onChange={() => handleUpdateQuestion(qIdx, "correct_option_id", opt.id)}
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            title="Mark as correct answer"
                          />

                          <span className="font-bold font-mono text-[11px] text-neutral-400 w-5">
                            {letter}.
                          </span>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                            className="flex-1 text-xs p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={`Option ${letter} text...`}
                          />

                          {isCorrect && (
                            <Badge color="green" size="small">Correct Key</Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Optional Explanation */}
                <div>
                  <label className="font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                    Compliance Explanation (Optional):
                  </label>
                  <Input
                    value={q.explanation || ""}
                    onChange={(e) => handleUpdateQuestion(qIdx, "explanation", e.target.value)}
                    placeholder="Explanation of regulatory rule or source standard..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Save Action */}
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
        <Button variant="secondary" size="base" onClick={() => handleSaveQuiz("draft")} disabled={saving}>
          Save as Draft
        </Button>
        <Button variant="primary" size="base" onClick={() => handleSaveQuiz("published")} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving ? "Publishing..." : "Publish Quiz (5–8 Questions)"}
        </Button>
      </div>

      {/* LIVE PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Badge color="blue" size="small">Participant Test Preview</Badge>
                <Heading level="h3" className="text-lg font-bold">
                  {quizForm.title}
                </Heading>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div className="font-bold text-blue-900 dark:text-blue-200">
                {webinar?.title} — Post-Webinar Comprehension Evaluation
              </div>
              <p className="text-blue-800 dark:text-blue-300">
                {quizForm.instructions}
              </p>
              <div className="flex items-center gap-4 text-[11px] font-mono text-blue-700 dark:text-blue-400 pt-1">
                <span>Passing Score: <strong>{quizForm.passing_score}%</strong></span>
                <span>Retake Cooldown: <strong>{quizForm.cooldown_minutes} minutes</strong></span>
                <span>Questions: <strong>{questions.length}</strong></span>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3"
                >
                  <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-mono text-[11px]">
                      {idx + 1}
                    </span>
                    <span>{q.question_text || "(No question text entered yet)"}</span>
                  </div>

                  <div className="space-y-1.5 pl-7">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = opt.id === q.correct_option_id
                      return (
                        <div
                          key={opt.id || oIdx}
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold"
                              : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <span>{opt.text || "(Empty option)"}</span>
                          </div>
                          {isCorrect && (
                            <Badge color="green" size="small">Correct Key</Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-2 ml-7 p-2 rounded bg-neutral-50 dark:bg-neutral-800/60 text-[11px] text-neutral-500 italic">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Button variant="secondary" size="small" onClick={() => setIsPreviewOpen(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
