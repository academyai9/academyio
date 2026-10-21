import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  DocumentText,
  Plus,
  Trash,
  CheckCircle,
  XMark,
  ArrowPath,
  ChevronUpMini,
  ChevronDown,
  Eye,
  ExclamationCircle,
  AcademicCap,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Webinar Quizzes",
  icon: DocumentText,
  rank: 52,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

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

interface QuizItem {
  id: string
  webinar_id: string
  webinar_title: string
  webinar_slug: string
  webinar_speaker: string
  webinar_date: string
  webinar_credits: number
  title: string
  instructions: string
  is_enabled: boolean
  status: "draft" | "published"
  passing_score: number
  cooldown_minutes: number
  cpe_credits: number
  question_count: number
  total_attempts: number
  passed_attempts: number
  failed_attempts: number
  signatory_name?: string
  signatory_title?: string
  issuer_name?: string
}

interface WebinarOption {
  id: string
  title: string
  speaker_name: string
  event_date: string
  cpe_credits: number
  assigned_quiz_id: string | null
}

export default function AdminQuizzesPage() {
  const { isDark } = useAdminTheme()
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [webinars, setWebinars] = useState<WebinarOption[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
  const [selectedWebinarId, setSelectedWebinarId] = useState("")
  const [quizTitle, setQuizTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [passingScore, setPassingScore] = useState(75)
  const [cooldownMinutes, setCooldownMinutes] = useState(60)
  const [cpeCredits, setCpeCredits] = useState(2.0)
  const [signatoryName, setSignatoryName] = useState("")
  const [signatoryTitle, setSignatoryTitle] = useState("Lead Faculty / CPE Course Director")
  const [issuerName, setIssuerName] = useState("AcademyIO Continuing Professional Education")
  const [quizStatus, setQuizStatus] = useState<"draft" | "published">("published")
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewQuiz, setPreviewQuiz] = useState<any | null>(null)
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([])

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/quizzes", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load quizzes")
      const data = await res.json()
      setQuizzes(data.quizzes || [])
      setWebinars(data.webinars || [])
    } catch (e: any) {
      console.error(e)
      notify("error", e.message || "Failed to load quizzes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openNewQuizModal = () => {
    setEditingQuizId(null)
    const firstUnassigned = webinars.find((w) => !w.assigned_quiz_id) || webinars[0]
    const defaultWebinarId = firstUnassigned ? firstUnassigned.id : ""
    const targetWebinar = webinars.find((w) => w.id === defaultWebinarId)

    setSelectedWebinarId(defaultWebinarId)
    setQuizTitle(targetWebinar ? `CPE Comprehension & Verification Quiz: ${targetWebinar.title}` : "CPE Comprehension & Verification Quiz")
    setInstructions("Answer all questions carefully. A minimum score of 75% is required to earn your official Certificate of Participation. If you score below 75%, a 60-minute cooling period applies before retaking.")
    setPassingScore(75)
    setCooldownMinutes(60)
    setCpeCredits(targetWebinar?.cpe_credits || 2.0)
    setSignatoryName(targetWebinar?.speaker_name || "Course Faculty Director")
    setSignatoryTitle("Lead Faculty / CPE Course Director")
    setIssuerName("AcademyIO Continuing Professional Education")
    setQuizStatus("published")

    // Default 5 starter questions with 4 options each (A, B, C, D)
    const defaultQsts: Question[] = Array.from({ length: 5 }, (_, i) => ({
      id: `new_qst_${Date.now()}_${i + 1}`,
      question_text: `Evaluation Question ${i + 1}: `,
      question_type: "multiple_choice",
      options: [
        { id: "A", text: "Standard primary compliant guideline" },
        { id: "B", text: "Secondary alternate protocol procedure" },
        { id: "C", text: "Non-applicable statutory exception rule" },
        { id: "D", text: "Comprehensive verification requirement" },
      ],
      correct_option_id: "A",
      explanation: "Mandated regulatory framework under NASBA CPE standards.",
      order_index: i,
    }))
    setQuestions(defaultQsts)
    setIsEditorOpen(true)
  }

  const openEditModal = async (quiz: QuizItem) => {
    setEditingQuizId(quiz.id)
    setSelectedWebinarId(quiz.webinar_id)
    setQuizTitle(quiz.title)
    setInstructions(quiz.instructions || "")
    setPassingScore(quiz.passing_score || 75)
    setCooldownMinutes(quiz.cooldown_minutes || 60)
    setCpeCredits(quiz.cpe_credits || quiz.webinar_credits || 2.0)
    setSignatoryName(quiz.signatory_name || quiz.webinar_speaker || "")
    setSignatoryTitle(quiz.signatory_title || "Lead Faculty / CPE Course Director")
    setIssuerName(quiz.issuer_name || "AcademyIO Continuing Professional Education")
    setQuizStatus(quiz.status || (quiz.is_enabled ? "published" : "draft"))

    try {
      const res = await fetch(`/admin/quizzes/${quiz.id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load quiz questions")
      const data = await res.json()
      setQuestions(data.questions || [])
    } catch (e: any) {
      notify("error", e.message || "Failed to load questions")
    }

    setIsEditorOpen(true)
  }

  const openPreviewModal = async (quiz: QuizItem) => {
    setPreviewQuiz(quiz)
    try {
      const res = await fetch(`/admin/quizzes/${quiz.id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load quiz details for preview")
      const data = await res.json()
      setPreviewQuestions(data.questions || [])
      setIsPreviewOpen(true)
    } catch (e: any) {
      notify("error", e.message || "Failed to load quiz preview")
    }
  }

  // Question manipulation within editor
  const handleAddQuestion = () => {
    if (questions.length >= 8) {
      notify("error", "A quiz cannot exceed 8 questions (5 to 8 questions allowed).")
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

  const handleSaveQuiz = async (saveAsStatus: "draft" | "published") => {
    if (!selectedWebinarId) {
      notify("error", "Please select a webinar to assign this quiz to.")
      return
    }

    if (saveAsStatus === "published") {
      if (questions.length < 5 || questions.length > 8) {
        notify("error", `A published quiz must contain between 5 and 8 questions. Currently you have ${questions.length}. Save as Draft if not ready.`)
        return
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question_text || !q.question_text.trim()) {
          notify("error", `Question #${i + 1} is missing question text.`)
          return
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          notify("error", `Question #${i + 1} must have 4 options (A, B, C, D).`)
          return
        }
        for (let j = 0; j < 4; j++) {
          if (!q.options[j].text || !q.options[j].text.trim()) {
            notify("error", `Question #${i + 1}, Option ${String.fromCharCode(65 + j)} cannot be blank.`)
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
        quiz_id: editingQuizId || undefined,
        webinar_id: selectedWebinarId,
        title: quizTitle.trim() || "CPE Comprehension & Verification Quiz",
        instructions: instructions.trim(),
        status: saveAsStatus,
        is_enabled: saveAsStatus === "published",
        passing_score: Number(passingScore) || 75,
        cooldown_minutes: Number(cooldownMinutes) || 60,
        cpe_credits: Number(cpeCredits) || 2.0,
        signatory_name: signatoryName.trim() || undefined,
        signatory_title: signatoryTitle.trim() || undefined,
        issuer_name: issuerName.trim() || undefined,
        questions,
      }

      const res = await fetch("/admin/quizzes", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Failed to save quiz")
      }

      notify("success", data.message || (saveAsStatus === "published" ? "Quiz published successfully!" : "Quiz draft saved successfully."))
      setIsEditorOpen(false)
      await loadData()
    } catch (e: any) {
      notify("error", e.message || "Failed to save quiz")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuiz = async (quiz: QuizItem) => {
    if (!confirm(`Are you sure you want to delete or unpublish the quiz for "${quiz.webinar_title}"? Any existing participant attempts will be securely preserved.`)) {
      return
    }

    try {
      const res = await fetch(`/admin/quizzes/${quiz.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to delete quiz")
      notify("success", data.message || "Quiz removed")
      await loadData()
    } catch (e: any) {
      notify("error", e.message || "Failed to delete quiz")
    }
  }

  const filteredQuizzes = quizzes.filter((q) => {
    if (statusFilter === "published" && (q.status !== "published" || !q.is_enabled)) return false
    if (statusFilter === "draft" && q.status === "published" && q.is_enabled) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const titleMatch = (q.title || "").toLowerCase().includes(query)
      const webTitleMatch = (q.webinar_title || "").toLowerCase().includes(query)
      const speakerMatch = (q.webinar_speaker || "").toLowerCase().includes(query)
      if (!titleMatch && !webTitleMatch && !speakerMatch) return false
    }
    return true
  })

  const publishedCount = quizzes.filter((q) => q.status === "published" && q.is_enabled).length
  const draftCount = quizzes.filter((q) => q.status === "draft" || !q.is_enabled).length
  const totalQuestionsSum = quizzes.reduce((acc, q) => acc + (q.question_count || 0), 0)

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} p-8`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-2xl font-bold">
                Webinar Quiz Management
              </Heading>
              <Badge color="blue" size="small">5 to 8 Questions Rule</Badge>
            </div>
            <Text className="text-sm text-slate-500 mt-1">
              Create, configure, and assign 5–8 question comprehension quizzes for webinars. Pass rate of 75% unlocks participant certificates.
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="small" onClick={openNewQuizModal} className="flex items-center gap-1.5 font-bold">
              <Plus className="w-4 h-4" />
              <span>Create New Quiz</span>
            </Button>
            <Button variant="secondary" size="small" onClick={loadData} disabled={loading} className="flex items-center gap-1.5">
              <ArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <AdminThemeToggle />
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)}>
              <XMark className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Total Quizzes</Text>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {quizzes.length}
            </div>
            <Text className="text-[11px] text-slate-400 mt-0.5">Assigned to webinars</Text>
          </Container>

          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Published Quizzes</Text>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {publishedCount}
            </div>
            <Text className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Live & student accessible</Text>
          </Container>

          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Draft Quizzes</Text>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {draftCount}
            </div>
            <Text className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">In-progress or unpublished</Text>
          </Container>

          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Total Questions</Text>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {totalQuestionsSum}
            </div>
            <Text className="text-[11px] text-slate-400 mt-0.5">Avg ~{(totalQuestionsSum / (quizzes.length || 1)).toFixed(1)} per quiz</Text>
          </Container>
        </div>

        {/* Filter and Search Bar */}
        <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All Quizzes ({quizzes.length})
              </button>
              <button
                onClick={() => setStatusFilter("published")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "published"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Published ({publishedCount})
              </button>
              <button
                onClick={() => setStatusFilter("draft")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "draft"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Drafts ({draftCount})
              </button>
            </div>

            <div className="relative w-64">
              <Input
                placeholder="Search quiz or webinar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
              />
            </div>
          </div>

          {/* Quizzes Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Webinar Assignment</th>
                  <th className="py-3 px-4">Quiz Title & Rules</th>
                  <th className="py-3 px-4 text-center">Questions</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Student Attempts</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredQuizzes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No quizzes found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredQuizzes.map((q) => {
                    const isPub = q.status === "published" && q.is_enabled
                    const isValidQuestionCount = q.question_count >= 5 && q.question_count <= 8

                    return (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-white truncate" title={q.webinar_title}>
                            {q.webinar_title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Faculty: {q.webinar_speaker} | {q.webinar_credits || 2.0} CPE
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {q.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Pass: {q.passing_score}% | Cooldown: {q.cooldown_minutes}m
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black font-mono ${
                              isValidQuestionCount
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {q.question_count} Qs
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isPub ? (
                            <Badge color="green" size="small">Published</Badge>
                          ) : (
                            <Badge color="orange" size="small">Draft</Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="font-bold font-mono text-slate-800 dark:text-slate-200">
                            {q.total_attempts} attempts
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {q.total_attempts > 0
                              ? `${Math.round(((q.passed_attempts || 0) / q.total_attempts) * 100)}% passed`
                              : "No attempts yet"}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => openPreviewModal(q)}
                            className="text-[11px] font-semibold"
                            title="Interactive Student Preview"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 inline" />
                            Preview
                          </Button>

                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => openEditModal(q)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </Button>

                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => handleDeleteQuiz(q)}
                            className="text-[11px] font-bold text-red-500 hover:text-red-700"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Container>

        {/* MODAL 1: FULL QUIZ EDITOR (5 to 8 Questions with A, B, C, D) */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <Heading level="h2" className="text-xl font-bold">
                    {editingQuizId ? "Edit Webinar Quiz" : "Create New Webinar Quiz"}
                  </Heading>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    Requirement: Must contain 5 to 8 questions before publishing. Four answer options (A, B, C, D) with exactly one correct answer.
                  </Text>
                </div>
                <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XMark className="w-6 h-6" />
                </button>
              </div>

              {/* Webinar Selection & Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Assigned Webinar:
                  </label>
                  <select
                    value={selectedWebinarId}
                    onChange={(e) => {
                      const webId = e.target.value
                      setSelectedWebinarId(webId)
                      const target = webinars.find((w) => w.id === webId)
                      if (target && !editingQuizId) {
                        setQuizTitle(`CPE Comprehension & Verification Quiz: ${target.title}`)
                        setSignatoryName(target.speaker_name || "")
                        setCpeCredits(target.cpe_credits || 2.0)
                      }
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select a webinar...</option>
                    {webinars.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title} ({w.speaker_name || "Faculty"} - {w.cpe_credits} CPE)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Quiz Title:
                  </label>
                  <Input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="Quiz Title"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Instructions for Attendees:
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="Instructions..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Passing Score (%):
                    </label>
                    <Input
                      type="number"
                      value={passingScore}
                      onChange={(e) => setPassingScore(parseInt(e.target.value) || 75)}
                    />
                    <span className="text-[10px] text-slate-400">Default: 75%</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Retake Cooldown:
                    </label>
                    <Input
                      type="number"
                      value={cooldownMinutes}
                      onChange={(e) => setCooldownMinutes(parseInt(e.target.value) || 60)}
                    />
                    <span className="text-[10px] text-slate-400">Minutes (Default: 60)</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      CPE Credits:
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={cpeCredits}
                      onChange={(e) => setCpeCredits(parseFloat(e.target.value) || 2.0)}
                    />
                    <span className="text-[10px] text-slate-400">Credits awarded</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Signatory Name:
                  </label>
                  <Input
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Signatory Name"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Issuing Organization:
                  </label>
                  <Input
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    placeholder="Issuing Organization"
                  />
                </div>
              </div>

              {/* Question Counter Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    Questions Count:
                  </span>
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
                      (Minimum 5 questions required to publish)
                    </span>
                  )}
                  {questions.length >= 5 && questions.length <= 8 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Meets 5–8 rule
                    </span>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleAddQuestion}
                  disabled={questions.length >= 8}
                  className="flex items-center gap-1 font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Question ({8 - questions.length} remaining)</span>
                </Button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 text-xs shadow-xs"
                  >
                    {/* Question Header & Order */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Question #{qIdx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(qIdx, "up")}
                          disabled={qIdx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUpMini className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(qIdx, "down")}
                          disabled={qIdx === questions.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
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
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Question Text:
                      </label>
                      <textarea
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestion(qIdx, "question_text", e.target.value)}
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        placeholder="Enter the comprehension question text..."
                      />
                    </div>

                    {/* 4 Options A, B, C, D */}
                    <div className="space-y-2">
                      <span className="font-bold text-slate-600 dark:text-slate-400 block text-[11px]">
                        Answer Options (Select the Radio for the Correct Answer):
                      </span>
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correct_option_id === opt.id
                        const letter = String.fromCharCode(65 + optIdx)
                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                                : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900"
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
                            <span className="font-bold font-mono text-[11px] text-slate-500 w-4">
                              {letter}.
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              className="flex-1 text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              placeholder={`Option ${letter} text...`}
                            />
                            {isCorrect && (
                              <Badge color="green" size="small">Correct</Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Optional Explanation */}
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Regulatory Explanation (Optional):
                      </label>
                      <Input
                        value={q.explanation || ""}
                        onChange={(e) => handleUpdateQuestion(qIdx, "explanation", e.target.value)}
                        placeholder="Explanation of correct standard or statute..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="small" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleSaveQuiz("draft")}
                    disabled={saving}
                    className="font-bold"
                  >
                    {saving ? "Saving..." : "Save as Draft"}
                  </Button>

                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleSaveQuiz("published")}
                    disabled={saving}
                    className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saving ? "Publishing..." : "Publish Quiz (5–8 Questions)"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: LIVE QUIZ PREVIEW */}
        {isPreviewOpen && previewQuiz && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Preview Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Badge color="blue" size="small">Participant Test Preview</Badge>
                  <Heading level="h3" className="text-lg font-bold">
                    {previewQuiz.title}
                  </Heading>
                </div>
                <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XMark className="w-5 h-5" />
                </button>
              </div>

              {/* Instructions banner */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-xs space-y-2">
                <div className="font-bold text-blue-900 dark:text-blue-200">
                  {previewQuiz.webinar_title} — Post-Webinar Comprehension Evaluation
                </div>
                <p className="text-blue-800 dark:text-blue-300">
                  {previewQuiz.instructions || "Answer all questions. A minimum score of 75% is required to earn your certificate."}
                </p>
                <div className="flex items-center gap-4 text-[11px] font-mono text-blue-700 dark:text-blue-400 pt-1">
                  <span>Passing Score: <strong>{previewQuiz.passing_score}%</strong></span>
                  <span>Retake Cooldown: <strong>{previewQuiz.cooldown_minutes} minutes</strong></span>
                  <span>Questions: <strong>{previewQuestions.length}</strong></span>
                </div>
              </div>

              {/* Questions display */}
              <div className="space-y-4">
                {previewQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 text-xs"
                  >
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono text-[11px]">
                        {idx + 1}
                      </span>
                      <span>{q.question_text}</span>
                    </div>

                    <div className="space-y-1.5 pl-7">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = opt.id === q.correct_option_id
                        return (
                          <div
                            key={opt.id || oIdx}
                            className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold"
                                : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span>{opt.text}</span>
                            </div>
                            {isCorrect && (
                              <Badge color="green" size="small">Correct Key</Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-2 ml-7 p-2 rounded bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 italic">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="small" onClick={() => setIsPreviewOpen(false)}>
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
