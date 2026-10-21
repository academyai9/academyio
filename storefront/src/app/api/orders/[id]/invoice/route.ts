import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ message: "Order ID is required." }, { status: 400 })
  }

  try {
    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
    const apiKey =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
      "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

    const headers: Record<string, string> = {
      "x-publishable-api-key": apiKey,
    }

    const authHeader = request.headers.get("authorization")
    if (authHeader) {
      headers["authorization"] = authHeader
    }

    const cookieHeader = request.headers.get("cookie")
    if (cookieHeader) {
      headers["cookie"] = cookieHeader
    }

    const tokenParam = request.nextUrl.searchParams.get("token")
    const query = tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""

    const response = await fetch(`${backendUrl}/store/orders/${encodeURIComponent(id)}/invoice${query}`, {
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
