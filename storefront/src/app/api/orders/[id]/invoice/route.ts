import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ message: "Valid Order ID is required." }, { status: 400 })
  }

  try {
    const cookieStore = await cookies()
    const jwtCookie = cookieStore.get("_medusa_jwt")?.value
    const incomingAuth = request.headers.get("authorization")

    const authValue = jwtCookie
      ? `Bearer ${jwtCookie}`
      : incomingAuth && incomingAuth.startsWith("Bearer ")
      ? incomingAuth
      : null

    if (!authValue) {
      return NextResponse.json({ message: "Authentication required to download invoice." }, { status: 401 })
    }

    const headers: Record<string, string> = {
      "x-publishable-api-key": PUBLISHABLE_KEY,
      authorization: authValue,
    }

    const response = await fetch(`${BACKEND_URL}/store/orders/${encodeURIComponent(id)}/invoice`, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { message: errorData.message || "Failed to generate invoice." },
        { status: response.status }
      )
    }

    const pdfBuffer = await response.arrayBuffer()
    const contentDisposition =
      response.headers.get("content-disposition") || `attachment; filename="AcademyIO-Invoice-${id}.pdf"`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error: any) {
    console.error("Invoice proxy route error:", error)
    return NextResponse.json(
      { message: "Failed to load invoice PDF.", error: error?.message },
      { status: 500 }
    )
  }
}
