"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Printer,
  RotateCcw,
  BookOpen,
  Calendar,
  User,
  ShieldAlert,
  HelpCircle,
} from "lucide-react"

export interface QuestionOption {
  id: string
  text: string
}

export interface SanitizedQuestion {
  id: string
  question_text: string
  question_type: string
  options: QuestionOption[]
  order_index: number
}

export interface QuizPayload {
  eligible: boolean
  on_cooldown?: boolean
  already_passed?: boolean
  webinar_ended?: boolean
  scheduled_end?: string
  message?: string
  next_eligible_at?: string
  remaining_seconds?: number
  latest_score?: number
  total_attempts?: number
  quiz?: {
    id: string
    title: string
    instructions: string | null
    passing_score: number
    cooldown_minutes: number
    cpe_credits: number
    total_questions: number
  }
  questions?: SanitizedQuestion[]
  webinar: {
    id: string
    title: string
    speaker_name: string
    cpe_credits: number
    event_date?: string
  }
  certificate?: any
}

export default function ParticipantQuizView({
  initialData,
  customerId,
  countryCode,
  webinarId,
  authToken = "",
}: {
  initialData: QuizPayload
  customerId: string
  countryCode: string
  webinarId: string
  authToken?: string
}) {
  const [data, setData] = useState<QuizPayload>(initialData)
  const [quizState, setQuizState] = useState<"intro" | "taking" | "review" | "result">(
    initialData.already_passed ? "result" : "intro"
  )

  // Answers state: questionId -> selectedOptionId
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(
    initialData.already_passed ? { passed: true, certificate: initialData.certificate } : null
  )

  // Cooldown countdown state (in seconds)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(initialData.remaining_seconds || 0)

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Refresh quiz data when cooldown expires
          refreshQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  const refreshQuiz = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"
      const headers: Record<string, string> = {
        "x-publishable-api-key": pubKey,
      }
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }
      const res = await fetch(`${backendUrl}/store/customer/webinars/${webinarId}/quiz?customer_id=${customerId}`, {
        headers,
      })
      if (res.ok) {
        const updated = await res.json()
        setData(updated)
        if (updated.remaining_seconds) {
          setCooldownSeconds(updated.remaining_seconds)
        }
      }
    } catch (e) {
      console.error("Failed to refresh quiz status:", e)
    }
  }

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`
  }

  const questions = data.questions || []
  const totalQ = questions.length
  const currentQ = questions[currentQIndex]
  const answeredCount = Object.keys(answers).length

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
  }

  const handleSubmitQuiz = async () => {
    if (answeredCount < totalQ) {
      if (!confirm(`You have answered ${answeredCount} of ${totalQ} questions. Unanswered questions will be marked incorrect. Do you want to submit anyway?`)) {
        return
      }
    }

    setIsSubmitting(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
      }
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }
      const res = await fetch(`${backendUrl}/store/customer/webinars/${webinarId}/quiz/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_id: customerId,
          answers,
        }),
      })

      const resData = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          // Cooldown active
          setData((prev) => ({
            ...prev,
            on_cooldown: true,
            remaining_seconds: resData.remaining_seconds || 3600,
            next_eligible_at: resData.next_eligible_at,
          }))
          setCooldownSeconds(resData.remaining_seconds || 3600)
          setQuizState("intro")
          alert(resData.message || "A 60-minute cooling period is active.")
          return
        }
        throw new Error(resData.message || "Failed to submit quiz")
      }

      setSubmissionResult(resData)
      setQuizState("result")
      if (!resData.passed) {
        setCooldownSeconds((resData.cooldown_minutes || 60) * 60)
        setData((prev) => ({
          ...prev,
          on_cooldown: true,
          next_eligible_at: resData.next_eligible_at,
          remaining_seconds: (resData.cooldown_minutes || 60) * 60,
        }))
      }
    } catch (e: any) {
      alert(e.message || "An error occurred while evaluating your quiz.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // CASE 1: Ineligible Customer
  if (!data.eligible && data.webinar_ended !== false) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registration Required</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto">
            {data.message || "You must be registered for the Live Webinar to access this certification examination and earn continuing education credits."}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link
              href={`/${countryCode}/dashboard`}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>
            <Link
              href={`/${countryCode}/webinars/${data.webinar?.id || ""}`}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm"
            >
              View Webinar Registration
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // CASE 2: Webinar Has Not Ended Yet
  if (data.webinar_ended === false) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Webinar In Progress</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto">
            {data.message || "This certification quiz unlocks immediately once the live session concludes. Please participate in the live session first."}
          </p>
          {data.scheduled_end && (
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl inline-block text-xs font-semibold text-amber-800 dark:text-amber-300">
              Scheduled Concluding Time: {new Date(data.scheduled_end).toLocaleString()}
            </div>
          )}
          <div className="pt-4">
            <Link
              href={`/${countryCode}/dashboard?tab=live`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm"
            >
              <span>Go to Live Webinar Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}/dashboard`} className="hover:text-blue-600">
          Dashboard
        </Link>
        <span>/</span>
        <Link href={`/${countryCode}/dashboard?tab=certificates`} className="hover:text-blue-600">
          Certificates
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white truncate max-w-xs">{data.webinar?.title}</span>
      </div>

      {/* Program Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>{data.quiz?.cpe_credits || data.webinar?.cpe_credits || 1.0} CPE Credit Hours</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {data.webinar?.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Faculty: <span className="font-semibold text-gray-700 dark:text-slate-300">{data.webinar?.speaker_name}</span>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Broadcast Completed</span>
            </span>
          </div>
        </div>

        {/* 4 Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-gray-400 block font-medium">Passing Standard</span>
            <span className="text-gray-900 dark:text-white font-bold text-sm">75% Minimum</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Total Questions</span>
            <span className="text-gray-900 dark:text-white font-bold text-sm">{totalQ} Scored Items</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Attempts Logged</span>
            <span className="text-gray-900 dark:text-white font-bold text-sm">{data.total_attempts || 0}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Retake Restriction</span>
            <span className="text-gray-900 dark:text-white font-bold text-sm">60-Min Cooldown</span>
          </div>
        </div>
      </div>

      {/* STATE 1: INTRO / COOLDOWN VIEW */}
      {quizState === "intro" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
          {/* Active Cooldown Banner */}
          {cooldownSeconds > 0 ? (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                    Mandatory 60-Minute Cooling Period Active
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    In compliance with continuing professional education verification standards, you must wait 60 minutes between failed attempts.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-500 block">Next Available Attempt:</span>
                  <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400">
                    {formatCountdown(cooldownSeconds)}
                  </span>
                </div>
                {data.next_eligible_at && (
                  <span className="text-xs text-gray-400">
                    Eligible at: {new Date(data.next_eligible_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          ) : null}

          {/* Instructions */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {data.quiz?.title || "Post-Webinar CPE Participation Quiz"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
              {data.quiz?.instructions ||
                "This evaluation verifies attendance and comprehension of key learning objectives. To earn your official Certificate of Participation, answer all questions carefully. You must achieve at least 75% correct answers."}
            </p>

            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Examination Guidelines:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600 dark:text-slate-300">
                <li>Each question has four options with exactly one correct answer.</li>
                <li>You can navigate back and forth between questions before submitting.</li>
                <li>Your score is calculated securely on the server upon submission.</li>
                <li>If you fail, your next attempt unlocks automatically in 60 minutes.</li>
              </ul>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <Link
              href={`/${countryCode}/dashboard?tab=certificates`}
              className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to My Certificates
            </Link>

            <button
              type="button"
              onClick={() => setQuizState("taking")}
              disabled={cooldownSeconds > 0 || totalQ === 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-slate-700 dark:disabled:to-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{data.total_attempts && data.total_attempts > 0 ? "Retake Quiz" : "Start Comprehension Quiz"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: TAKING QUIZ (Interactive Question Cards) */}
      {quizState === "taking" && currentQ && (
        <div className="space-y-6">
          {/* Progress Header */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">
              <span>
                Question {currentQIndex + 1} of {totalQ}
              </span>
              <span>{Math.round(((currentQIndex + 1) / totalQ) * 100)}% Progress</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${((currentQIndex + 1) / totalQ) * 100}%` }}
              />
            </div>

            {/* Quick Question Jump Pills */}
            <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id])
                const isCurrent = idx === currentQIndex
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-xs"
                        : isAnswered
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Question Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question {currentQIndex + 1}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                {currentQ.question_text}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, opt.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all border flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500"
                        : "border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 hover:bg-gray-50/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-medium leading-relaxed">{opt.text}</span>
                  </button>
                )
              })}
            </div>

            {/* Step Navigation Controls */}
            <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-3">
                {currentQIndex < totalQ - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQuizState("review")}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Review & Submit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: REVIEW SUMMARY BEFORE SUBMIT */}
      {quizState === "review" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Your Answers</h2>
            <p className="text-xs text-gray-500 mt-1">
              Please verify all responses before submitting. You have answered {answeredCount} of {totalQ} questions.
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const selectedOptId = answers[q.id]
              const selectedOpt = q.options.find((o) => o.id === selectedOptId)
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 flex items-start justify-between gap-4 hover:bg-gray-50 dark:hover:bg-slate-850"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-gray-400">Question {idx + 1}</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{q.question_text}</p>
                    <p className="text-xs mt-1">
                      {selectedOpt ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Selected: {selectedOpt.text}
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">Not Answered</span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentQIndex(idx)
                      setQuizState("taking")
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    Edit
                  </button>
                </div>
              )
            })}
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setQuizState("taking")}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50"
            >
              ← Back to Questions
            </button>

            <button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answers on Server...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Submit for Evaluation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: EVALUATION RESULT VIEW */}
      {quizState === "result" && submissionResult && (
        <div className="space-y-6">
          {submissionResult.passed ? (
            /* PASSED: Congratulations & Certificate Download */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500/80 p-8 shadow-lg text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                  Verified Passing Score • 75% Required
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                  Congratulations! You Passed the Evaluation
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto">
                  You have successfully demonstrated mastery of course learning objectives. Your official CPE Certificate of Participation has been generated and recorded.
                </p>
              </div>

              {/* Score Metric Card */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">Your Score</span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {submissionResult.score || 100}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Correct Answers</span>
                  <span className="text-xl font-black text-gray-900 dark:text-white">
                    {submissionResult.correct_answers || totalQ} / {submissionResult.total_questions || totalQ}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">CPE Credits</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {submissionResult.certificate?.cpe_credits || data.quiz?.cpe_credits || 1.0}
                  </span>
                </div>
              </div>

              {/* Certificate Download Actions */}
              {submissionResult.certificate && (
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`/api/certificates/${submissionResult.certificate.id}/download`}
                    download
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Certificate</span>
                  </a>

                  <Link
                    href={`/${countryCode}/certificates/${submissionResult.certificate.id}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold text-sm shadow-xs hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                  >
                    <Printer className="w-4 h-4 text-gray-500" />
                    <span>View / Print Certificate</span>
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={`/${countryCode}/dashboard?tab=certificates`}
                  className="text-xs font-semibold text-gray-500 hover:text-blue-600"
                >
                  Return to Dashboard Certificates →
                </Link>
              </div>
            </div>
          ) : (
            /* FAILED: Show Score & 60-Minute Cooldown */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-300 dark:border-red-900/60 p-8 shadow-sm text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <XCircle className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 text-xs font-black uppercase tracking-wider">
                  Evaluation Not Passed • 75% Required
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Score Below Passing Requirement
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-300 max-w-lg mx-auto">
                  You scored <strong className="text-red-600">{submissionResult.score}%</strong> ({submissionResult.correct_answers} of {submissionResult.total_questions} correct). A minimum score of 75% is required to issue your accredited certificate.
                </p>
              </div>

              {/* Cooldown Active Card */}
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>Mandatory 60-Minute Retake Cooldown Active</span>
                </div>
                <div className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
                  {formatCountdown(cooldownSeconds)}
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  You can retake this quiz once the countdown concludes. Please review the course slides and study materials in your customer dashboard in the meantime.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href={`/${countryCode}/dashboard?tab=downloads`}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50"
                >
                  Review Conference Material
                </Link>

                <Link
                  href={`/${countryCode}/dashboard?tab=certificates`}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Back to My Certificates
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
