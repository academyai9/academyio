import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { cookies } from "next/headers"
import { retrieveCustomer } from "@lib/data/customer"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"
import ParticipantQuizView from "@components/quiz/ParticipantQuizView"

export const metadata: Metadata = {
  title: "CPE Comprehension Quiz | AcademyIO",
  robots: { index: false, follow: false },
}

export default async function WebinarQuizPage(props: {
  params: Promise<{ countryCode: string; webinarId: string }>
}) {
  const { countryCode, webinarId } = await props.params

  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value
  const customer = await retrieveCustomer()
  if (!customer || !token) {
    redirect(`/${countryCode}/login?redirect=/${countryCode}/dashboard/quiz/${encodeURIComponent(webinarId)}`)
  }

  try {
    const headers: Record<string, string> = {
      "x-publishable-api-key": PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    }

    const res = await fetch(
      `${BACKEND_URL}/store/customer/webinars/${encodeURIComponent(webinarId)}/quiz`,
      { headers, cache: "no-store" }
    )

    if (res.status === 404) {
      notFound()
    }

    const quizData = await res.json()

    return (
      <ParticipantQuizView
        initialData={quizData}
        customerId={customer.id}
        countryCode={countryCode}
        webinarId={webinarId}
        authToken={token || ""}
      />
    )
  } catch (error: any) {
    console.error("Error fetching webinar quiz:", error)
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Failed to connect to quiz service</h2>
        <p className="text-xs text-gray-500 mt-2">Please ensure the backend server is running and try again.</p>
      </div>
    )
  }
}
