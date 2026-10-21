import { notFound, redirect } from "next/navigation"
import { cookies } from "next/headers"
import { retrieveCustomer } from "@lib/data/customer"
import ParticipantQuizView from "@components/quiz/ParticipantQuizView"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export default async function WebinarQuizPage(props: {
  params: Promise<{ countryCode: string; webinarId: string }>
}) {
  const { countryCode, webinarId } = await props.params

  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect(`/${countryCode}/login?redirect=/${countryCode}/dashboard/quiz/${webinarId}`)
  }

  try {
    const headers: Record<string, string> = {
      "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978",
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(
      `${BACKEND_URL}/store/customer/webinars/${webinarId}/quiz?customer_id=${customer.id}`,
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
